import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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
