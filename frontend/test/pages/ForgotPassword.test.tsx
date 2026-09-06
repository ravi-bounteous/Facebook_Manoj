import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ForgotPassword } from "../../src/pages/ForgotPassword";
import * as authApi from "../../src/api/authApi";

describe("ForgotPassword page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function fillAndSubmit(email: string) {
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: email } });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));
  }

  it("shows the generic confirmation message for a registered email (AC1)", async () => {
    const spy = vi.spyOn(authApi, "requestPasswordReset").mockResolvedValue({
      message: "If that email is registered, a reset link has been sent.",
    });

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );
    fillAndSubmit("registered@example.com");

    await waitFor(() => expect(spy).toHaveBeenCalledWith("registered@example.com"));
    expect(await screen.findByText(/if that email is registered/i)).toBeInTheDocument();
  });

  it("shows the same generic confirmation message for an unregistered email (AC2)", async () => {
    vi.spyOn(authApi, "requestPasswordReset").mockResolvedValue({
      message: "If that email is registered, a reset link has been sent.",
    });

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );
    fillAndSubmit("unregistered@example.com");

    expect(await screen.findByText(/if that email is registered/i)).toBeInTheDocument();
  });
});
