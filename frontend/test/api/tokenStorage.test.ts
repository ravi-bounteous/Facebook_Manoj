import { describe, it, expect, beforeEach } from "vitest";
import { tokenStorage } from "../../src/api/tokenStorage";

describe("tokenStorage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it("stores tokens in sessionStorage, not localStorage (AC12)", () => {
    tokenStorage.setTokens("test-access-token", "test-refresh-token");

    expect(sessionStorage.getItem("accessToken")).toBe("test-access-token");
    expect(sessionStorage.getItem("refreshToken")).toBe("test-refresh-token");
    expect(localStorage.getItem("accessToken")).toBeNull();
    expect(localStorage.getItem("refreshToken")).toBeNull();
  });
});
