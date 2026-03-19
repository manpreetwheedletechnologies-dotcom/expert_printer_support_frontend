// src/lib/api.js
import { API_BASE } from "./constants";

const KEY_TOKEN = "ps_token";
const KEY_ROLE  = "ps_role";
const KEY_USER  = "ps_user";

export const setToken  = (t) => localStorage.setItem(KEY_TOKEN, t);
export const getToken  = ()  => localStorage.getItem(KEY_TOKEN);
export const setRole   = (r) => localStorage.setItem(KEY_ROLE, r);
export const getRole   = ()  => localStorage.getItem(KEY_ROLE);

export const setUser = (u) => localStorage.setItem(KEY_USER, JSON.stringify(u));

export const getUser = () => {
  try {
    const raw = localStorage.getItem(KEY_USER);
    if (!raw) return null;
    const u = JSON.parse(raw);
    if (u && !u.id && u._id) u.id = u._id;
    return u;
  } catch { return null; }
};

export const clearAuth = () => {
  localStorage.removeItem(KEY_TOKEN);
  localStorage.removeItem(KEY_ROLE);
  localStorage.removeItem(KEY_USER);
};

export const clearUser = clearAuth;
export const isLoggedIn = () => !!getToken();

export class AuthError extends Error {
  constructor(msg = "Session expired. Please log in again.") {
    super(msg);
    this.name = "AuthError";
  }
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) { clearAuth(); throw new AuthError(); }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request failed: ${res.status}`);
  }
  return res.json();
}