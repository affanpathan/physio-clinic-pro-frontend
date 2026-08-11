// Single owner of session storage and JWT expiry checks, so App.js and the patched window.fetch
// can never drift on where the token lives or when it is considered dead.
//
// Storage is sessionStorage, not localStorage: closing the tab ends the session.

const AUTH_KEY = 'physioClinicAuth';
const ADMIN_KEY = 'physioClinicAdmin';

export const SESSION_EXPIRED_EVENT = 'physio:session-expired';
export const ADMIN_SESSION_EXPIRED_EVENT = 'physio:admin-session-expired';

const store = () => (typeof window === 'undefined' ? null : window.sessionStorage);

// Reads `exp` out of a JWT payload without pulling in a library.
// Returns epoch ms, or null when the token is missing, malformed, or carries no exp.
export function getTokenExpiry(token) {
  if (!token || typeof token !== 'string') return null;
  const segment = token.split('.')[1];
  if (!segment) return null;
  try {
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(window.atob(padded));
    return typeof payload?.exp === 'number' ? payload.exp * 1000 : null;
  } catch (err) {
    return null;
  }
}

// A token we cannot read is treated as expired — fail closed.
export function isTokenExpired(token) {
  const exp = getTokenExpiry(token);
  return exp === null || Date.now() >= exp;
}

export function readAuth() {
  const s = store();
  if (!s) return null;
  try {
    return JSON.parse(s.getItem(AUTH_KEY) || 'null');
  } catch (err) {
    return null;
  }
}

export function writeAuth(auth) {
  const s = store();
  if (s) s.setItem(AUTH_KEY, JSON.stringify(auth));
}

export function clearAuth() {
  const s = store();
  if (s) s.removeItem(AUTH_KEY);
}

export function readAdminToken() {
  const s = store();
  return s ? s.getItem(ADMIN_KEY) || '' : '';
}

export function writeAdminToken(adminToken) {
  const s = store();
  if (s && adminToken) s.setItem(ADMIN_KEY, adminToken);
}

export function clearAdminToken() {
  const s = store();
  if (s) s.removeItem(ADMIN_KEY);
}

// Sessions used to live in localStorage, where they outlived the browser tab indefinitely.
// Drop anything left there so an old token cannot resurface.
export function clearLegacyStorage() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(AUTH_KEY);
    window.localStorage.removeItem(ADMIN_KEY);
  } catch (err) { /* storage may be unavailable — nothing to clean up then */ }
}
