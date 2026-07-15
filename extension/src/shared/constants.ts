/**
 * Shared runtime constants for the TrustGuard Browser Extension.
 *
 * `__API_URL__` is replaced at build time by Vite's `define` option.
 * It defaults to `http://localhost:5000/api` when the
 * `TRUSTGUARD_API_URL` environment variable is not set.
 */

declare const __API_URL__: string;

/** Base URL of the TrustGuard API, injected at build time. */
export const API_BASE_URL: string = __API_URL__;

/** Time-to-live for cached API responses, in milliseconds (5 minutes). */
export const CACHE_TTL_MS = 300_000;

/** Maximum number of concurrent API lookup requests. */
export const MAX_CONCURRENT_REQUESTS = 5;

/**
 * How long a loading badge waits for a result before transitioning to
 * the ERROR state, in milliseconds (15 seconds).
 */
export const BADGE_TIMEOUT_MS = 15_000;
