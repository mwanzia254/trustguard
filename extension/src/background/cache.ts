/**
 * CacheManager — manages API response caching in `chrome.storage.session`.
 *
 * Cache keys follow the format: `tg_cache:${type}:${value}`
 * Each entry stores a `CacheEntry` with the result and an expiry timestamp.
 *
 * Satisfies Requirements 2.5 (5-minute TTL cache) and 8.4 (SW recovery via rehydratePending).
 */

import { CacheEntry, PendingLookup, TrustResult } from '../shared/types';
import { CACHE_TTL_MS } from '../shared/constants';

/**
 * Reads a cached trust result for the given (type, value) pair.
 *
 * Returns `null` if:
 * - No entry exists for the key, or
 * - The entry has passed its `expiresAt` timestamp (stale entry is deleted).
 */
export async function cacheGet(
  type: string,
  value: string
): Promise<TrustResult | null> {
  const key = `tg_cache:${type}:${value}`;
  const entries = await chrome.storage.session.get(key);
  const entry: CacheEntry | undefined = entries[key];

  if (!entry) {
    return null;
  }

  if (Date.now() > entry.expiresAt) {
    // Entry is stale — remove it and treat as a cache miss
    await chrome.storage.session.remove(key);
    return null;
  }

  return entry.result;
}

/**
 * Writes a trust result to the session cache with a TTL of `CACHE_TTL_MS` milliseconds.
 *
 * The entry is stored under the key `tg_cache:${type}:${value}`.
 */
export async function cacheSet(
  type: string,
  value: string,
  result: TrustResult
): Promise<void> {
  const key = `tg_cache:${type}:${value}`;
  const entry: CacheEntry = {
    result,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
  await chrome.storage.session.set({ [key]: entry });
}

/**
 * Reads the `tg_pending` key from `chrome.storage.session` and returns
 * the list of identifier lookups that were in-flight when the Service Worker
 * was last suspended.
 *
 * Used on Service Worker startup to re-queue any lookups that did not complete
 * before the worker was terminated (Requirement 8.4).
 *
 * Returns an empty array if no pending lookups are stored.
 */
export async function rehydratePending(): Promise<PendingLookup[]> {
  const entries = await chrome.storage.session.get('tg_pending');
  const pending: PendingLookup[] | undefined = entries['tg_pending'];
  return pending ?? [];
}
