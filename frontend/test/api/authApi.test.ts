import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { register, login, logout, apiFetch } from "../../src/api/authApi";
import { tokenStorage } from "../../src/api/tokenStorage";
import { VALID_CREDENTIAL } from "../fixtures/credentials";

describe("authApi", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("register() stores tokens and returns the user on success", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ accessToken: "a", refreshToken: "r", user: { id: "1", email: "x@x.com" } }),
    }) as any;

    const result = await register("x@x.com", VALID_CREDENTIAL);

    expect(result.user.email).toBe("x@x.com");
    expect(tokenStorage.getAccessToken()).toBe("a");
    expect(tokenStorage.getRefreshToken()).toBe("r");
  });

  it("register() throws with the server error message on failure", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: "Email already registered" }),
    }) as any;

    await expect(register("x@x.com", VALID_CREDENTIAL)).rejects.toThrow(/already registered/i);
  });

  it("login() stores tokens on success", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ accessToken: "a", refreshToken: "r", user: { id: "1", email: "x@x.com" } }),
    }) as any;

    await login("x@x.com", VALID_CREDENTIAL);

    expect(tokenStorage.getAccessToken()).toBe("a");
  });

  it("login() throws with the server error message on failure", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: "Invalid email or password" }),
    }) as any;

    await expect(login("x@x.com", "wrong")).rejects.toThrow(/invalid email or password/i);
  });

  it("logout() clears stored tokens", () => {
    tokenStorage.setTokens("a", "r");
    logout();
    expect(tokenStorage.getAccessToken()).toBeNull();
    expect(tokenStorage.getRefreshToken()).toBeNull();
  });

  it("apiFetch retries once with a refreshed access token after a 401 (AC23)", async () => {
    tokenStorage.setTokens("expired-access", "valid-refresh");

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ accessToken: "new-access" }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ tasks: [] }) });
    globalThis.fetch = fetchMock as any;

    const res = await apiFetch("/api/tasks");

    expect(res.status).toBe(200);
    expect(tokenStorage.getAccessToken()).toBe("new-access");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("apiFetch clears tokens when the refresh call itself fails (AC24)", async () => {
    tokenStorage.setTokens("expired-access", "expired-refresh");

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) });
    globalThis.fetch = fetchMock as any;

    const res = await apiFetch("/api/tasks");

    expect(res.status).toBe(401);
    expect(tokenStorage.getAccessToken()).toBeNull();
  });
});
