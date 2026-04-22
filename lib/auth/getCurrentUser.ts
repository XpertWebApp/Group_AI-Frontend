// Decode JWT payload to get current user ID
export function getCurrentUserId(): string | null {
  if (typeof window === 'undefined') return null;

  const token = localStorage.getItem('accessToken');
  if (!token) return null;

  try {
    // JWT format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // Decode the payload
    const decoded = JSON.parse(atob(parts[1]));
    return decoded.sub || decoded.id || decoded.userId || null;
  } catch {
    return null;
  }
}
