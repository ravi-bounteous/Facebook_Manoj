import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { App } from "../../src/App";
import { tokenStorage } from "../../src/api/tokenStorage";

function makeToken(exp: number) {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({ sub: "1", exp }));
  return `${header}.${payload}.signature`;
}

describe("App logout (AC9)", () => {
  beforeEach(() => {
    tokenStorage.clear();
  });

  it("returns to the login screen after logging out", () => {
    tokenStorage.setTokens(makeToken(Math.floor(Date.now() / 1000) + 900), "refresh");

    render(
      <MemoryRouter initialEntries={["/tasks"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText(/task list/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /log out/i }));

    expect(screen.getByRole("heading", { name: /log in/i })).toBeInTheDocument();
    expect(tokenStorage.getAccessToken()).toBeNull();
  });
});

describe("App unauthenticated access to task form (AC15, AC16)", () => {
  beforeEach(() => {
    tokenStorage.clear();
    vi.restoreAllMocks();
  });

  it("redirects an unauthenticated user from the task create form to login (AC15)", () => {
    render(
      <MemoryRouter initialEntries={["/tasks/new"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /log in/i })).toBeInTheDocument();
  });

  it("returns the user to the originally requested form after logging in (AC16)", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        accessToken: makeToken(Math.floor(Date.now() / 1000) + 900),
        refreshToken: "refresh",
        user: { id: "1", email: "user@example.com" },
      }),
    }) as any;

    render(
      <MemoryRouter initialEntries={["/tasks/new"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /log in/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => expect(screen.getByRole("heading", { name: /new task/i })).toBeInTheDocument());
  });
});
