// Reconverse — thin API client wrapping MC /api/v1 endpoints.
// Modeled after Partsverse: browser requests stay same-origin, proxied by api/v1/[...path].
//
// Token storage: "remember me" ON → localStorage, OFF → sessionStorage.
// Refresh is serialized so concurrent 401s don't race.

export const MC_API = '';  // same-origin proxy

const ACCESS_KEY  = 'rv_access';
const REFRESH_KEY = 'rv_refresh';
const REMEMBER_KEY = 'rv_remember';

// --- Types ---------------------------------------------------------------

export interface RVUser {
  id: string;
  email: string;
  full_name: string | null;
  is_platform_admin: boolean;
  dealer_id: string | null;
  role: string | null;
}

// --- Token storage -------------------------------------------------------

function tokenStore(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return getRememberPreference() ? window.localStorage : window.sessionStorage;
  } catch { return null; }
}

function readToken(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const primary = tokenStore();
    if (primary?.getItem(key)) return primary.getItem(key);
    if (window.localStorage.getItem(key)) return window.localStorage.getItem(key);
    if (window.sessionStorage.getItem(key)) return window.sessionStorage.getItem(key);
    return null;
  } catch { return null; }
}

function writeToken(key: string, value: string | null) {
  if (typeof window === 'undefined') return;
  try {
    const store = tokenStore();
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
    if (value !== null && store) store.setItem(key, value);
  } catch { /* ignore */ }
}

export function getAccess(): string | null  { return readToken(ACCESS_KEY); }
export function getRefresh(): string | null { return readToken(REFRESH_KEY); }
export function setTokens(access: string | null, refresh: string | null) {
  writeToken(ACCESS_KEY, access);
  writeToken(REFRESH_KEY, refresh);
}

// --- Active dealer context (multi-dealer) --------------------------------
// Which dealer membership is active for this session. Sent as X-Dealer-Id so
// MC resolves the right membership when a user belongs to multiple dealers.
const ACTIVE_DEALER_KEY = 'rv_active_dealer';

export function getActiveDealerId(): string | null {
  if (typeof window === 'undefined') return null;
  try { return window.localStorage.getItem(ACTIVE_DEALER_KEY); } catch { return null; }
}

export function setActiveDealerId(dealerId: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (dealerId) window.localStorage.setItem(ACTIVE_DEALER_KEY, dealerId);
    else window.localStorage.removeItem(ACTIVE_DEALER_KEY);
  } catch { /* ignore */ }
}

export function getRememberPreference(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = window.localStorage.getItem(REMEMBER_KEY);
    return raw === null ? true : raw === '1';
  } catch { return true; }
}

export function setRememberSession(remember: boolean) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0'); } catch {}
}

// --- Auth-lost hook ------------------------------------------------------

let onAuthLost: (() => void) | null = null;
export function setOnAuthLost(fn: () => void) { onAuthLost = fn; }
function authLost() {
  setTokens(null, null);
  if (onAuthLost) onAuthLost();
}

// --- Refresh serialization -----------------------------------------------

let inflightRefresh: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  const r = getRefresh();
  if (!r) return false;
  const res = await fetch(`${MC_API}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh: r }),
  });
  if (!res.ok) return false;
  const j = await res.json().catch(() => null);
  if (!j?.ok || !j.data?.access || !j.data?.refresh) return false;
  setTokens(j.data.access, j.data.refresh);
  return true;
}

function refreshOnce(): Promise<boolean> {
  if (inflightRefresh) return inflightRefresh;
  inflightRefresh = doRefresh().finally(() => { inflightRefresh = null; });
  return inflightRefresh;
}

// --- Authenticated fetch -------------------------------------------------

export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const url = input.startsWith('http') ? input : `${MC_API}${input}`;

  function withAuth(tok: string | null): RequestInit {
    const headers = new Headers(init.headers || {});
    if (tok) headers.set('Authorization', `Bearer ${tok}`);
    const activeDealer = getActiveDealerId();
    if (activeDealer && !headers.has('X-Dealer-Id')) headers.set('X-Dealer-Id', activeDealer);
    return { ...init, headers };
  }

  let res = await fetch(url, withAuth(getAccess()));
  if (res.status !== 401) return res;

  const ok = await refreshOnce();
  if (!ok) { authLost(); return res; }

  res = await fetch(url, withAuth(getAccess()));
  if (res.status === 401) authLost();
  return res;
}

// --- Auth flows ----------------------------------------------------------

export async function login(
  email: string,
  password: string,
): Promise<{ ok: true; user: RVUser } | { ok: false; error: string }> {
  const res = await fetch(`${MC_API}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const j = await res.json().catch(() => null);
  if (!res.ok || !j?.ok) return { ok: false, error: j?.error || `http_${res.status}` };
  setTokens(j.data.access, j.data.refresh);
  return { ok: true, user: j.data.user };
}

export async function logout(): Promise<void> {
  const r = getRefresh();
  try {
    await apiFetch('/api/v1/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(r ? { refresh: r } : {}),
    });
  } catch { /* best effort */ }
  setTokens(null, null);
}

export async function getMe(): Promise<RVUser | null> {
  if (!getAccess() && !getRefresh()) return null;
  const r = await apiFetch('/api/v1/auth/me');
  if (!r.ok) return null;
  const j = await r.json().catch(() => null);
  return j?.ok ? (j.data.user as RVUser) : null;
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const r = getRefresh();
  const res = await apiFetch('/api/v1/auth/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
      current_session_refresh: r || undefined,
    }),
  });
  const j = await res.json().catch(() => null);
  if (!res.ok || !j?.ok) return { ok: false, error: j?.error || `http_${res.status}` };
  return { ok: true };
}

export async function changeEmailRequest(
  newEmail: string,
  currentPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await apiFetch('/api/v1/auth/change-email-request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ new_email: newEmail, current_password: currentPassword }),
  });
  const j = await res.json().catch(() => null);
  if (!res.ok || !j?.ok) return { ok: false, error: j?.error || `http_${res.status}` };
  return { ok: true };
}

// --- Reconverse data helpers ---------------------------------------------

const RV = '/api/v1/reconverse';

export async function rvFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const res = await apiFetch(`${RV}${path}`, init);
  const j = await res.json().catch(() => null);
  if (!res.ok || !j?.ok) return { ok: false, error: j?.error || `http_${res.status}` };
  return { ok: true, data: j.data as T };
}

export async function rvPost<T = unknown>(
  path: string,
  body: unknown,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  return rvFetch<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function rvPatch<T = unknown>(
  path: string,
  body: unknown,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  return rvFetch<T>(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function rvDelete(
  path: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await apiFetch(`${RV}${path}`, { method: 'DELETE' });
  const j = await res.json().catch(() => null);
  if (!res.ok || !j?.ok) return { ok: false, error: j?.error || `http_${res.status}` };
  return { ok: true };
}
