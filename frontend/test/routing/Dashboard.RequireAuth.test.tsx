import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { App } from "../../src/App";
import { tokenStorage } from "../../src/api/tokenStorage";

describe("Dashboard route auth guard (AC13)", () => {
  beforeEach(() => {
    tokenStorage.clear();
  });

  it("redirects an unauthenticated user from /dashboard to /login", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /log in/i })).toBeInTheDocument();
  });
});
