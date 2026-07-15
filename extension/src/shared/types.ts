/**
 * Shared types for the TrustGuard Browser Extension.
 * Used across Content Script, Background Service Worker, and Popup contexts.
 */

// ---------------------------------------------------------------------------
// Core domain types
// ---------------------------------------------------------------------------

/** The category of a detected seller identifier. */
export type IdentifierType =
  | 'phone'
  | 'till_number'
  | 'paybill'
  | 'business_name'
  | 'social_media'
  | 'website';

/** Human-readable trust classification derived from a trust score. */
export type TrustLabel = 'TRUSTED' | 'GOOD' | 'CAUTION' | 'HIGH RISK';

/** Current resolution state of a trust lookup. */
export type LookupState = 'LOADING' | 'FOUND' | 'NOT_FOUND' | 'ERROR';

/**
 * The result of a trust lookup for a single seller identifier.
 * Fields other than `value`, `type`, and `state` are only present when `state === 'FOUND'`.
 */
export interface TrustResult {
  value: string;
  type: IdentifierType;
  state: LookupState;
  /** Integer 0–100. Present when state === 'FOUND'. */
  trust_score?: number;
  /** Categorical label derived from trust_score. Present when state === 'FOUND'. */
  trust_label?: TrustLabel;
  /** Number of scam reports against this seller. Present when state === 'FOUND'. */
  report_count?: number;
  /** Unique seller ID for profile links. Present when state === 'FOUND'. */
  seller_id?: string;
  /** Display name of the seller. Present when state === 'FOUND'. */
  seller_name?: string;
  /** Categories of complaints filed. Present when state === 'FOUND'. */
  complaint_categories?: string[];
}

/**
 * A seller identifier detected in the DOM by the Content Script.
 * Carries a reference to the originating DOM node so the badge can be
 * injected immediately adjacent to it.
 */
export interface DetectedIdentifier {
  value: string;
  type: IdentifierType;
  /** The DOM text node or element that contains the detected value. */
  node: Node;
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

/**
 * A single entry in the `chrome.storage.session` cache.
 * keyed as `tg_cache:{type}:{value}`.
 */
export interface CacheEntry {
  result: TrustResult;
  /** Unix timestamp (ms) after which this entry is considered stale. */
  expiresAt: number;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/**
 * The user profile stored in `chrome.storage.local` under `tg_user`.
 * Passwords are NEVER stored here.
 */
export interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

// ---------------------------------------------------------------------------
// Message type union — all message types that flow through chrome.runtime
// ---------------------------------------------------------------------------

export type MessageType =
  | 'LOOKUP'         // Content Script → SW: look up an identifier
  | 'RESULT'         // SW → Content Script: trust result
  | 'GET_PAGE_STATE' // Popup → SW: get all identifiers for tab
  | 'LOGIN'          // Popup → SW: authenticate
  | 'LOGOUT'         // Popup → SW: clear auth
  | 'SUBMIT_REPORT'  // Popup → SW: submit report
  | 'REPORT_RESULT'; // SW → Popup: report submission outcome

// ---------------------------------------------------------------------------
// Message interfaces
// ---------------------------------------------------------------------------

/**
 * Sent by the Content Script to the Background Service Worker when a seller
 * identifier is detected on the page.
 */
export interface LookupMessage {
  type: 'LOOKUP';
  tabId: number;
  identifier: {
    value: string;
    type: IdentifierType;
  };
}

/**
 * Sent by the Background Service Worker to the Content Script (via
 * `chrome.tabs.sendMessage`) when a trust lookup resolves.
 */
export interface ResultMessage {
  type: 'RESULT';
  identifier: {
    value: string;
    type: IdentifierType;
  };
  trust: TrustResult;
}

/**
 * Sent by the Popup to the Background Service Worker to retrieve all
 * detected sellers for the currently active tab.
 */
export interface GetPageStateMessage {
  type: 'GET_PAGE_STATE';
}

/**
 * Response returned by the Background Service Worker for a `GET_PAGE_STATE` message.
 */
export interface GetPageStateResponse {
  isSupported: boolean;
  sellers: TrustResult[];
}

/**
 * Sent by the Popup to the Background Service Worker to submit a scam report.
 */
export interface SubmitReportMessage {
  type: 'SUBMIT_REPORT';
  payload: {
    searched_value: string;
    search_type: IdentifierType;
    category: string;
    description: string;
    amount_lost?: number;
    currency: 'KES';
  };
}

/**
 * Response returned by the Background Service Worker after a report submission attempt.
 */
export interface SubmitReportResponse {
  ok: boolean;
  /** HTTP status code from the API (201, 401, 422, etc.). */
  status: number;
  message: string;
}

/**
 * Sent by the Popup to the Background Service Worker to log in with credentials.
 */
export interface LoginMessage {
  type: 'LOGIN';
  email: string;
  password: string;
}

/**
 * Response returned by the Background Service Worker after a login attempt.
 */
export interface LoginResponse {
  ok: boolean;
  /** HTTP status from the API (200, 401, etc.). */
  status: number;
  message: string;
  user?: StoredUser;
}

/**
 * Sent by the Popup to the Background Service Worker to log out.
 */
export interface LogoutMessage {
  type: 'LOGOUT';
}

/**
 * Response returned by the Background Service Worker after logout.
 */
export interface LogoutResponse {
  ok: boolean;
}

// ---------------------------------------------------------------------------
// SW recovery
// ---------------------------------------------------------------------------

/**
 * An identifier lookup that was in-flight when the Service Worker was suspended.
 * Stored under `tg_pending` in `chrome.storage.session`.
 */
export interface PendingLookup {
  value: string;
  type: IdentifierType;
  tabId: number;
}
