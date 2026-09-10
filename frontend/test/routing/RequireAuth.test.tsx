import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RequireAuth } from "../../src/components/RequireAuth";
import { tokenStorage } from "../../src/api/tokenStorage";
import { config } from "../../src/config";

function makeToken(exp: number) {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({ sub: "1", exp }));
  return `${header}.${payload}.signature`;
}

function validToken() {
  return makeToken(Math.floor(Date.now() / 1000) + 15 * 60);
}

function expiredToken() {
  return makeToken(Math.floor(Date.now() / 1000) - 10);
}

function renderProtected() {
  return render(
    <MemoryRouter initialEntries={["/tasks"]}>
      <Routes>
        <Route path="/login" element={<div>Login Screen</div>} />
        <Route
          path="/tasks"
          element={
            <RequireAuth>
              <div>Task List</div>
            </RequireAuth>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("RequireAuth", () => {
  beforeEach(() => {
    tokenStorage.clear();
  });

  it("redirects to /login when there is no token (AC11, AC12)", () => {
    renderProtected();
    expect(screen.getByText(/login screen/i)).toBeInTheDocument();
  });

  it("redirects to /login when the access token is expired (AC10, AC24)", () => {
    tokenStorage.setTokens(expiredToken(), "some-refresh");
    renderProtected();
    expect(screen.getByText(/login screen/i)).toBeInTheDocument();
  });

  it("renders the protected content when the access token is valid", () => {
    tokenStorage.setTokens(validToken(), "some-refresh");
    renderProtected();
    expect(screen.getByText(/task list/i)).toBeInTheDocument();
  });

  describe("idle timeout", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("clears the session and redirects to /login after the idle timeout elapses with no activity (AC14, AC15)", () => {
      tokenStorage.setTokens(validToken(), "some-refresh");
      renderProtected();

      act(() => {
        vi.advanceTimersByTime(config.idleTimeoutMs);
      });

      expect(screen.getByText(/login screen/i)).toBeInTheDocument();
      expect(tokenStorage.getAccessToken()).toBeNull();
    });
  });
});
