import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { App } from "../../src/App";

describe("Forgot Password link (AC11)", () => {
  it("navigates from the login page to a working Forgot Password page instead of a dead end", () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <App />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("link", { name: /forgot password/i }));

    expect(screen.getByRole("heading", { name: /forgot password/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^log in$/i })).not.toBeInTheDocument();
  });
});
