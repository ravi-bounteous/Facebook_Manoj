import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { App } from "../../src/App";
import { tokenStorage } from "../../src/api/tokenStorage";

describe("Dashboard route auth guard (AC13)", () => {
  beforeEach(() => {
    tokenStorage.clear();
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) }) as any;
  });

  it("redirects an unauthenticated user to /login when visiting /dashboard", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /log in/i })).toBeInTheDocument();
  });
});
