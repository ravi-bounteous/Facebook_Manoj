import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ResetPassword } from "../../src/pages/ResetPassword";
import * as authApi from "../../src/api/authApi";

function renderResetPassword(token = "abc123") {
  return render(
    <MemoryRouter initialEntries={[`/reset-password?token=${token}`]}>
      <Routes>
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/login" element={<div>Log In Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ResetPassword page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function fillAndSubmit(password: string) {
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: password } });
    fireEvent.click(screen.getByRole("button", { name: /reset password/i }));
  }

  it("navigates to /login on a valid link and strong password (AC4)", async () => {
    const spy = vi.spyOn(authApi, "resetPassword").mockResolvedValue(undefined);

    renderResetPassword("valid-token");
    fillAndSubmit("NewPassw0rd");

    await waitFor(() => expect(spy).toHaveBeenCalledWith("valid-token", "NewPassw0rd"));
    expect(await screen.findByText(/log in page/i)).toBeInTheDocument();
  });

  it("shows an error message and does not navigate for an expired/used link (AC5)", async () => {
    vi.spyOn(authApi, "resetPassword").mockRejectedValue(
      new Error("This password reset link is invalid or has expired.")
    );

    renderResetPassword("expired-token");
    fillAndSubmit("NewPassw0rd");

    expect(await screen.findByText(/invalid or has expired/i)).toBeInTheDocument();
    expect(screen.queryByText(/log in page/i)).not.toBeInTheDocument();
  });

  it("shows an error message and does not navigate for a weak password (AC7)", async () => {
    vi.spyOn(authApi, "resetPassword").mockRejectedValue(
      new Error("Password must be at least 8 characters")
    );

    renderResetPassword("valid-token");
    fillAndSubmit("weak");

    expect(await screen.findByText(/8 characters/i)).toBeInTheDocument();
    expect(screen.queryByText(/log in page/i)).not.toBeInTheDocument();
  });
});
