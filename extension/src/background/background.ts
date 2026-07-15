/**
 * Background Service Worker — MessageRouter
 *
 * Central entry point for the TrustGuard extension service worker.
 * Registers the chrome.runtime.onMessage handler and dispatches to the
 * appropriate handler based on message.type.
 *
 * Handles:
 *   - LOOKUP        (Content Script → SW): look up a seller identifier
 *   - GET_PAGE_STATE (Popup → SW): return all sellers for the active tab
 *   - LOGIN          (Popup → SW): authenticate the user
 *   - LOGOUT         (Popup → SW): clear auth state
 *   - SUBMIT_REPORT  (Popup → SW): submit a scam report
 *
 * On SW startup: re-queues any pending lookups from chrome.storage.session.
 * On tab close:  deletes the tg_tab:{tabId} session entry.
 *
 * Satisfies Requirements 2.1, 2.2, 2.3, 2.4, 2.6, 2.7, 5.3, 6.2, 6.3, 6.6, 8.4
 */

import { cacheGet, cacheSet, rehydratePending } from './cache';
import { setAuth, clearAuth } from './auth';
import { apiFetch, addPending, removePending } from './api-client';
import {
  IdentifierType,
  TrustResult,
  LookupMessage,
  GetPageStateResponse,
  LoginMessage,
  LoginResponse,
  LogoutResponse,
  SubmitReportMessage,
  SubmitReportResponse,
  StoredUser,
} from '../shared/types';

// ---------------------------------------------------------------------------
// Supported site detection (for GET_PAGE_STATE isSupported flag)
// ---------------------------------------------------------------------------

const SUPPORTED_PATTERNS: RegExp[] = [
  /^https?:\/\/([a-z0-9-]+\.)?jiji\.co\.ke\//i,
  /^https?:\/\/(www\.)?facebook\.com\/marketplace/i,
];

function isSupportedUrl(url: string | undefined): boolean {
  if (!url) return false;
  return SUPPORTED_PATTERNS.some((re) => re.test(url));
}

// ---------------------------------------------------------------------------
// API response shape returned by GET /api/search
// ---------------------------------------------------------------------------

interface SearchApiSeller {
  id: string;
  business_name: string;
  trust_score: number;
  trust_label: string;
  total_reports: number;
  complaint_categories: string[];
}

interface SearchApiResponse {
  found: boolean;
  sellers: SearchApiSeller[];
}

// ---------------------------------------------------------------------------
// API response shape returned by POST /api/auth/login
// ---------------------------------------------------------------------------

interface LoginApiResponse {
  data: {
    token: string;
    user: StoredUser;
  };
}

// ---------------------------------------------------------------------------
// mapSearchResponse — API response → TrustResult
// ---------------------------------------------------------------------------

/**
 * Maps a raw /api/search API response to a TrustResult.
 *
 * Rules (Requirement 2.3, 2.4):
 *   - found === true && sellers.length > 0  → FOUND, extract fields from sellers[0]
 *   - found === false OR sellers empty       → NOT_FOUND
 *   - HTTP 404                               → NOT_FOUND  (passed as null data)
 *   - HTTP 4xx (not 404) or network error    → ERROR       (passed as null data with isError flag)
 */
function mapSearchResponse(
  value: string,
  type: IdentifierType,
  data: SearchApiResponse | null,
  isError: boolean
): TrustResult {
  if (isError) {
    return { value, type, state: 'ERROR' };
  }

  if (data === null) {
    // Covers HTTP 404
    return { value, type, state: 'NOT_FOUND' };
  }

  if (data.found === true && data.sellers.length > 0) {
    const seller = data.sellers[0];
    return {
      value,
      type,
      state: 'FOUND',
      trust_score: seller.trust_score,
      trust_label: seller.trust_label as TrustResult['trust_label'],
      report_count: seller.total_reports,
      seller_id: seller.id,
      seller_name: seller.business_name,
      complaint_categories: seller.complaint_categories,
    };
  }

  // found === false OR sellers is empty
  return { value, type, state: 'NOT_FOUND' };
}

// ---------------------------------------------------------------------------
// writeTabResult — persist / update a TrustResult in tg_tab:{tabId}
// ---------------------------------------------------------------------------

async function writeTabResult(tabId: number, result: TrustResult): Promise<void> {
  const key = `tg_tab:${tabId}`;
  const stored = await chrome.storage.session.get(key);
  const existing: TrustResult[] = stored[key] ?? [];

  // Replace if an entry for the same (value, type) already exists; otherwise append
  const idx = existing.findIndex(
    (r) => r.value === result.value && r.type === result.type
  );
  if (idx >= 0) {
    existing[idx] = result;
  } else {
    existing.push(result);
  }

  await chrome.storage.session.set({ [key]: existing });
}

// ---------------------------------------------------------------------------
// handleLookup
// ---------------------------------------------------------------------------

/**
 * Handles a LOOKUP message:
 *  1. Check cache — serve immediately on hit.
 *  2. On miss: persist to tg_pending, call /api/search, map response,
 *     cache result, write tg_tab:{tabId}, remove from pending,
 *     push RESULT to the content script via chrome.tabs.sendMessage.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 8.4
 */
export async function handleLookup(
  value: string,
  type: IdentifierType,
  tabId: number
): Promise<void> {
  // 1. Cache check
  const cached = await cacheGet(type, value);
  if (cached) {
    await writeTabResult(tabId, cached);
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: 'RESULT',
        identifier: { value, type },
        trust: cached,
      });
    } catch {
      // Tab may have been closed — ignore send errors
    }
    return;
  }

  // 2. Persist to pending before fetch (SW recovery, Requirement 8.4)
  await addPending({ value, type, tabId });

  let result: TrustResult;

  try {
    const response = await apiFetch(
      `/search?value=${encodeURIComponent(value)}&type=${encodeURIComponent(type)}`
    );

    if (response.status === 404) {
      result = mapSearchResponse(value, type, null, false);
    } else if (response.status >= 400 && response.status < 500) {
      // 4xx (not 404) — error, no retry (handled by apiFetch)
      result = mapSearchResponse(value, type, null, true);
    } else if (response.status >= 500) {
      // 5xx after retry — error
      result = mapSearchResponse(value, type, null, true);
    } else {
      // 2xx — parse body
      const data: SearchApiResponse = await response.json();
      result = mapSearchResponse(value, type, data, false);
    }
  } catch {
    // Network error (after retry)
    result = mapSearchResponse(value, type, null, true);
  }

  // 3. Cache the result
  await cacheSet(type, value, result);

  // 4. Write to tg_tab:{tabId}
  await writeTabResult(tabId, result);

  // 5. Remove from pending
  await removePending(value, type);

  // 6. Push RESULT to content script
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: 'RESULT',
      identifier: { value, type },
      trust: result,
    });
  } catch {
    // Tab may have been closed — ignore send errors
  }
}

// ---------------------------------------------------------------------------
// handleGetPageState
// ---------------------------------------------------------------------------

/**
 * Handles a GET_PAGE_STATE message from the Popup.
 * Reads tg_tab:{tabId} from session storage and checks if the sender's
 * URL is a supported marketplace.
 *
 * Requirements: 4.1, 4.2, 4.3
 */
async function handleGetPageState(
  sender: chrome.runtime.MessageSender
): Promise<GetPageStateResponse> {
  const tabId = sender.tab?.id;
  const url = sender.tab?.url ?? sender.url;
  const isSupported = isSupportedUrl(url);

  if (!tabId) {
    return { isSupported, sellers: [] };
  }

  const key = `tg_tab:${tabId}`;
  const stored = await chrome.storage.session.get(key);
  const sellers: TrustResult[] = stored[key] ?? [];

  return { isSupported, sellers };
}

// ---------------------------------------------------------------------------
// handleLogin
// ---------------------------------------------------------------------------

/**
 * Handles a LOGIN message from the Popup.
 *  - POST /api/auth/login with { email, password }
 *  - 200  → setAuth, return LoginResponse with user
 *  - 401  → return error message
 *  - network error → return connection error
 *
 * Requirements: 6.2, 6.3, 6.4, 6.5
 */
async function handleLogin(
  email: string,
  password: string
): Promise<LoginResponse> {
  try {
    const response = await apiFetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (response.status === 200) {
      const json: LoginApiResponse = await response.json();
      await setAuth(json.data.token, json.data.user);
      return {
        ok: true,
        status: 200,
        message: 'Logged in',
        user: json.data.user,
      };
    }

    if (response.status === 401) {
      return {
        ok: false,
        status: 401,
        message: 'Invalid email or password. Please try again.',
      };
    }

    // Unexpected status
    return {
      ok: false,
      status: response.status,
      message: 'Login failed. Please try again.',
    };
  } catch {
    return {
      ok: false,
      status: 0,
      message: 'Unable to connect to TrustGuard. Please check your connection.',
    };
  }
}

// ---------------------------------------------------------------------------
// handleLogout
// ---------------------------------------------------------------------------

/**
 * Handles a LOGOUT message from the Popup.
 * Clears auth state and returns a success response.
 *
 * Requirement 6.6
 */
async function handleLogout(): Promise<LogoutResponse> {
  await clearAuth();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// handleSubmitReport
// ---------------------------------------------------------------------------

/**
 * Handles a SUBMIT_REPORT message from the Popup.
 *  - POST /api/reports (authenticated)
 *  - 201  → success
 *  - 422  → duplicate/spam
 *  - 401  → session expired
 *  - other → generic error
 *
 * Requirements: 5.3, 5.4, 5.5, 5.6, 5.7
 */
async function handleSubmitReport(
  payload: SubmitReportMessage['payload']
): Promise<SubmitReportResponse> {
  try {
    const response = await apiFetch('/reports', {
      method: 'POST',
      authenticated: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.status === 201) {
      return {
        ok: true,
        status: 201,
        message: 'Report submitted successfully. Thank you for keeping the community safe.',
      };
    }

    if (response.status === 422) {
      return {
        ok: false,
        status: 422,
        message:
          'Your report was flagged as a duplicate or spam. Please add more specific details and try again.',
      };
    }

    if (response.status === 401) {
      // Session expired — clear auth so popup shows login form
      await clearAuth();
      return {
        ok: false,
        status: 401,
        message: 'Session expired. Please log in again.',
      };
    }

    return {
      ok: false,
      status: response.status,
      message: 'Failed to submit report. Please check your connection and try again.',
    };
  } catch {
    return {
      ok: false,
      status: 0,
      message: 'Failed to submit report. Please check your connection and try again.',
    };
  }
}

// ---------------------------------------------------------------------------
// Central message dispatcher
// ---------------------------------------------------------------------------

/**
 * Dispatches an incoming chrome.runtime message to the appropriate handler
 * and calls sendResponse with the result.
 *
 * Must be called synchronously inside the onMessage listener (which returns
 * true to keep the channel open for the async response).
 */
function handleMessage(
  message: unknown,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
): void {
  if (!message || typeof message !== 'object') {
    sendResponse({ ok: false, message: 'Invalid message format' });
    return;
  }

  const msg = message as { type: string; [key: string]: unknown };

  switch (msg.type) {
    case 'LOOKUP': {
      const lookup = msg as unknown as LookupMessage;
      // LOOKUP is fire-and-forget from the content script's perspective.
      // The result is pushed back via chrome.tabs.sendMessage, not sendResponse.
      //
      // Content scripts cannot read their own tab ID, so they always send
      // tabId: 0. Use sender.tab?.id (populated by the Chrome runtime for
      // messages originating from a content script) as the authoritative
      // tab identifier. Fall back to lookup.tabId for non-content-script
      // callers (e.g. recovery re-queue from SW startup).
      const resolvedTabId = sender.tab?.id ?? lookup.tabId;
      handleLookup(
        lookup.identifier.value,
        lookup.identifier.type,
        resolvedTabId
      ).catch((err) => {
        console.error('[TrustGuard] LOOKUP handler error:', err);
      });
      // Respond immediately to acknowledge receipt; content script does not
      // wait for the actual result through this channel.
      sendResponse({ ok: true });
      break;
    }

    case 'GET_PAGE_STATE': {
      handleGetPageState(sender)
        .then((result) => sendResponse(result))
        .catch((err) => {
          console.error('[TrustGuard] GET_PAGE_STATE handler error:', err);
          sendResponse({ isSupported: false, sellers: [] });
        });
      break;
    }

    case 'LOGIN': {
      const login = msg as unknown as LoginMessage;
      handleLogin(login.email, login.password)
        .then((result) => sendResponse(result))
        .catch((err) => {
          console.error('[TrustGuard] LOGIN handler error:', err);
          sendResponse({
            ok: false,
            status: 0,
            message: 'Unable to connect to TrustGuard. Please check your connection.',
          });
        });
      break;
    }

    case 'LOGOUT': {
      handleLogout()
        .then((result) => sendResponse(result))
        .catch((err) => {
          console.error('[TrustGuard] LOGOUT handler error:', err);
          sendResponse({ ok: false });
        });
      break;
    }

    case 'SUBMIT_REPORT': {
      const report = msg as unknown as SubmitReportMessage;
      handleSubmitReport(report.payload)
        .then((result) => sendResponse(result))
        .catch((err) => {
          console.error('[TrustGuard] SUBMIT_REPORT handler error:', err);
          sendResponse({
            ok: false,
            status: 0,
            message: 'Failed to submit report. Please check your connection and try again.',
          });
        });
      break;
    }

    default:
      sendResponse({ ok: false, message: `Unknown message type: ${msg.type}` });
  }
}

// ---------------------------------------------------------------------------
// chrome.runtime.onMessage registration
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener(
  (
    message: unknown,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ) => {
    // Return true to keep the message channel open for async responses.
    handleMessage(message, sender, sendResponse);
    return true;
  }
);

// ---------------------------------------------------------------------------
// chrome.tabs.onRemoved — clean up tg_tab:{tabId} on tab close
// ---------------------------------------------------------------------------

chrome.tabs.onRemoved.addListener((tabId: number) => {
  chrome.storage.session.remove(`tg_tab:${tabId}`);
});

// ---------------------------------------------------------------------------
// SW startup recovery (Requirement 8.4)
//
// Runs at module load time (i.e., each time the Service Worker starts or
// re-wakes). Any lookups that were in-flight when the SW was last terminated
// are re-queued here so they are not permanently lost.
// ---------------------------------------------------------------------------

rehydratePending()
  .then((pending) => {
    for (const entry of pending) {
      handleLookup(
        entry.value,
        entry.type as IdentifierType,
        entry.tabId
      ).catch((err) => {
        console.error('[TrustGuard] SW recovery re-queue error:', err);
      });
    }
  })
  .catch((err) => {
    console.error('[TrustGuard] SW recovery rehydratePending error:', err);
  });
