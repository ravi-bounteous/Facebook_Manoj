import { tokenStorage } from "./tokenStorage";

const API_BASE = "/api";

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

async function postJson(path: string, body: unknown): Promise<any> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

export async function register(email: string, password: string): Promise<AuthResponse> {
  const data = (await postJson("/auth/register", { email, password })) as AuthResponse;
  tokenStorage.setTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const data = (await postJson("/auth/login", { email, password })) as AuthResponse;
  tokenStorage.setTokens(data.accessToken, data.refreshToken);
  return data;
}

export function logout(): void {
  tokenStorage.clear();
}

export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  return postJson("/auth/password-reset/request", { email });
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await postJson("/auth/password-reset/confirm", { token, password });
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) return false;

  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) return false;

  const data = await res.json();
  tokenStorage.setAccessToken(data.accessToken);
  return true;
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const currentToken = tokenStorage.getAccessToken();
  const withAuth = (token: string | null): RequestInit => ({
    ...init,
    headers: { ...(init.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });

  const res = await fetch(`${API_BASE}${path}`, withAuth(currentToken));
  if (res.status !== 401) return res;

  const refreshed = await tryRefresh();
  if (!refreshed) {
    tokenStorage.clear();
    return res;
  }

  return fetch(`${API_BASE}${path}`, withAuth(tokenStorage.getAccessToken()));
}
