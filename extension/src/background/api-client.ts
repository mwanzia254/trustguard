/**
 * APIClient — Background Service Worker
 *
 * Provides a fetch wrapper with:
 *   - Concurrency control via a Semaphore (max MAX_CONCURRENT_REQUESTS simultaneous requests)
 *   - Retry logic: retry once after 2 s on network error or HTTP 5xx;
 *     fail immediately on HTTP 4xx (except 404 which is returned as-is)
 *   - Optional Authorization header injection (reads token from AuthManager)
 *
 * Also exports helpers for managing the `tg_pending` SW-recovery list:
 *   - addPending(entry)   — called by MessageRouter before issuing a lookup
 *   - removePending(value, type) — called by MessageRouter after a lookup resolves
 *
 * Satisfies Requirements 2.6, 2.7, 2.8, 6.7, 8.4
 */

import { API_BASE_URL, MAX_CONCURRENT_REQUESTS } from '../shared/constants';
import { getToken } from './auth';
import { PendingLookup } from '../shared/types';

// ---------------------------------------------------------------------------
// Semaphore — caps the number of concurrent in-flight fetch calls
// ---------------------------------------------------------------------------

/**
 * A simple counting semaphore that limits the number of concurrent async tasks.
 *
 * `acquire()` returns a promise that resolves when a slot becomes available.
 * The caller MUST call `release()` (typically in a finally block) to free the slot.
 */
export class Semaphore {
  private running = 0;
  private readonly queue: Array<() => void> = [];

  constructor(private readonly limit: number) {}

  /** Wait until a concurrency slot is available, then occupy it. */
  acquire(): Promise<void> {
    if (this.running < this.limit) {
      this.running++;
      return Promise.resolve();
    }
    // At capacity — park the caller until a slot is released
    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  /** Release one concurrency slot, waking the next queued waiter if any. */
  release(): void {
    const next = this.queue.shift();
    if (next) {
      // Hand the slot directly to the next waiter (running count stays the same)
      next();
    } else {
      this.running--;
    }
  }

  /** Current number of occupied slots (useful for testing). */
  get activeCount(): number {
    return this.running;
  }
}

// Module-level semaphore shared across all apiFetch calls
const semaphore = new Semaphore(MAX_CONCURRENT_REQUESTS);

// ---------------------------------------------------------------------------
// Options interface
// ---------------------------------------------------------------------------

export interface APIClientOptions {
  /** When true, reads tg_token and attaches Authorization: Bearer header. */
  authenticated?: boolean;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Pause execution for `ms` milliseconds. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a single fetch attempt.
 * Throws on network errors (fetch rejects) so callers can handle uniformly.
 */
async function attemptFetch(
  url: string,
  init: RequestInit
): Promise<Response> {
  return fetch(url, init);
}

// ---------------------------------------------------------------------------
// apiFetch
// ---------------------------------------------------------------------------

/**
 * Fetch `path` relative to `API_BASE_URL`, with concurrency limiting and retry.
 *
 * Retry behaviour:
 *   - Network error (fetch throws)  → wait 2 s, retry once; if retry also fails, throw
 *   - HTTP 5xx                       → wait 2 s, retry once; if retry still 5xx, return response
 *   - HTTP 4xx except 404            → return response immediately (no retry)
 *   - HTTP 404                       → return response immediately (not-found, not an error)
 *   - HTTP 2xx / 3xx                 → return response immediately
 *
 * Auth injection:
 *   When `options.authenticated === true` and a token is stored, the header
 *   `Authorization: Bearer {token}` is added to the request.
 *
 * @param path     Path appended to API_BASE_URL, e.g. `/search?value=07123&type=phone`
 * @param options  Standard RequestInit fields plus `authenticated?: boolean`
 */
export async function apiFetch(
  path: string,
  options: RequestInit & APIClientOptions = {}
): Promise<Response> {
  const { authenticated, ...fetchInit } = options;
  const url = `${API_BASE_URL}${path}`;

  // Build headers, injecting auth token when requested
  const headers = new Headers(fetchInit.headers);
  if (authenticated) {
    const token = await getToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }
  const init: RequestInit = { ...fetchInit, headers };

  // Acquire a concurrency slot — will queue if already at MAX_CONCURRENT_REQUESTS
  await semaphore.acquire();

  try {
    // --- First attempt ---
    let response: Response;
    try {
      response = await attemptFetch(url, init);
    } catch (networkError) {
      // Network error on first attempt → retry once after 2 s
      await delay(2000);
      // Allow the retry to throw; caller receives the error
      response = await attemptFetch(url, init);
      return response;
    }

    // HTTP 4xx (excluding 404): fail immediately without retry
    if (response.status >= 400 && response.status < 500 && response.status !== 404) {
      return response;
    }

    // HTTP 5xx: retry once after 2 s
    if (response.status >= 500) {
      await delay(2000);
      try {
        const retryResponse = await attemptFetch(url, init);
        return retryResponse;
      } catch (retryError) {
        throw retryError;
      }
    }

    // 2xx, 3xx, 404 — return as-is
    return response;
  } finally {
    semaphore.release();
  }
}

// ---------------------------------------------------------------------------
// SW-recovery pending-lookup helpers (used by MessageRouter, not apiFetch)
// ---------------------------------------------------------------------------

const PENDING_KEY = 'tg_pending';

/**
 * Append an entry to the `tg_pending` list in `chrome.storage.session`.
 *
 * Called by the MessageRouter before dispatching a LOOKUP fetch so that
 * the lookup can be re-queued if the Service Worker is terminated mid-flight
 * (Requirement 8.4).
 */
export async function addPending(entry: PendingLookup): Promise<void> {
  const stored = await chrome.storage.session.get(PENDING_KEY);
  const current: PendingLookup[] = stored[PENDING_KEY] ?? [];
  // Avoid duplicates for the same (value, type, tabId) triple
  const alreadyPresent = current.some(
    (p) => p.value === entry.value && p.type === entry.type && p.tabId === entry.tabId
  );
  if (!alreadyPresent) {
    await chrome.storage.session.set({ [PENDING_KEY]: [...current, entry] });
  }
}

/**
 * Remove all entries matching `(value, type)` from the `tg_pending` list in
 * `chrome.storage.session`.
 *
 * Called by the MessageRouter after a LOOKUP resolves (successfully or with
 * a terminal error) so the entry is not re-queued on the next SW wake
 * (Requirement 8.4).
 */
export async function removePending(value: string, type: string): Promise<void> {
  const stored = await chrome.storage.session.get(PENDING_KEY);
  const current: PendingLookup[] = stored[PENDING_KEY] ?? [];
  const updated = current.filter((p) => !(p.value === value && p.type === type));
  await chrome.storage.session.set({ [PENDING_KEY]: updated });
}
