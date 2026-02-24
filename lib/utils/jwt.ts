/**
 * Decode JWT payload without verification (client-side only, for display).
 * Do not use for security-sensitive decisions.
 */
export function decodeJwtPayload<T = { id?: string; email?: string; role?: string }>(
  token: string
): T | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(payload) as T;
  } catch {
    return null;
  }
}
