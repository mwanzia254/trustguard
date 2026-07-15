/**
 * AuthManager — Background Service Worker
 *
 * Manages authentication state in `chrome.storage.local`.
 * Storage keys:
 *   - `tg_token` — the Supabase JWT access token
 *   - `tg_user`  — the StoredUser profile object
 *
 * Security constraints (Requirements 6.3, 6.7, 6.8):
 *   - Passwords are NEVER passed in, stored, or returned by any function here.
 *   - Only the token (JWT) and the stripped user profile are persisted.
 */

import { StoredUser } from '../shared/types';

const TOKEN_KEY = 'tg_token';
const USER_KEY = 'tg_user';

/**
 * Retrieves the stored JWT access token from `chrome.storage.local`.
 * Returns `null` if no token is present.
 *
 * Requirement 6.7 — The token is used to attach `Authorization: Bearer`
 * headers to authenticated API requests.
 */
export async function getToken(): Promise<string | null> {
  const result = await chrome.storage.local.get(TOKEN_KEY);
  const token: unknown = result[TOKEN_KEY];
  if (typeof token === 'string' && token.length > 0) {
    return token;
  }
  return null;
}

/**
 * Retrieves the stored user profile from `chrome.storage.local`.
 * Returns `null` if no user is stored.
 */
export async function getUser(): Promise<StoredUser | null> {
  const result = await chrome.storage.local.get(USER_KEY);
  const user: unknown = result[USER_KEY];
  if (user && typeof user === 'object') {
    return user as StoredUser;
  }
  return null;
}

/**
 * Persists the JWT token and stripped user profile after a successful login.
 *
 * Only `token` and `user` (id, name, email, role) are stored — passwords are
 * never accepted or stored by this function (Requirement 6.8).
 *
 * Requirement 6.3 — Called by the Background SW after `POST /api/auth/login`
 * returns HTTP 200 with `data.token` and `data.user`.
 */
export async function setAuth(token: string, user: StoredUser): Promise<void> {
  // Defensive: ensure no password field leaks into the stored user object.
  const safeUser: StoredUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  await chrome.storage.local.set({
    [TOKEN_KEY]: token,
    [USER_KEY]: safeUser,
  });
}

/**
 * Removes `tg_token` and `tg_user` from `chrome.storage.local`.
 *
 * Requirement 6.6 — Called when the user clicks "Log out" or when the API
 * returns HTTP 401 (expired session).
 */
export async function clearAuth(): Promise<void> {
  await chrome.storage.local.remove([TOKEN_KEY, USER_KEY]);
}

/**
 * Returns `true` if a non-empty JWT token is currently stored.
 *
 * Convenience helper used by the Background SW to gate authenticated features
 * (Requirement 6.7).
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getToken();
  return token !== null;
}
