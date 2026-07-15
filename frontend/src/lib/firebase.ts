/**
 * Firebase is no longer used — FCM notifications removed as part of API-free migration.
 * This file is kept as a stub to avoid import errors.
 */

export async function requestFcmToken(): Promise<string | null> {
  return null;
}

export async function onForegroundMessage(
  _callback: (payload: { title?: string; body?: string }) => void
) {
  // No-op
}
