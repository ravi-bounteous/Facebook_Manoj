import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Register } from "../../src/pages/Register";
import * as authApi from "../../src/api/authApi";

function renderRegister() {
  return render(
    <MemoryRouter initialEntries={["/register"]}>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/tasks" element={<div>Task List</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Register page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function fillAndSubmit(email: string, password: string) {
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: email } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: password } });
    fireEvent.click(screen.getByRole("button", { name: /register/i }));
  }

  it("navigates to /tasks on successful registration (AC1)", async () => {
    const registerSpy = vi.spyOn(authApi, "register").mockResolvedValue({
      accessToken: "a",
      refreshToken: "r",
      user: { id: "1", email: "a@b.com" },
    });

    renderRegister();

    fillAndSubmit("a@b.com", "Passw0rd");

    await waitFor(() => expect(registerSpy).toHaveBeenCalledWith("a@b.com", "Passw0rd"));
    expect(await screen.findByText(/task list/i)).toBeInTheDocument();
  });

  it("shows a duplicate-email error and does not navigate (AC2)", async () => {
    vi.spyOn(authApi, "register").mockRejectedValue(new Error("Email already registered"));

    renderRegister();

    fillAndSubmit("a@b.com", "Passw0rd");

    expect(await screen.findByText(/already registered/i)).toBeInTheDocument();
  });

  it("shows a validation error and does not call the API for an invalid email (AC4, AC5)", async () => {
    const registerSpy = vi.spyOn(authApi, "register");

    renderRegister();

    fillAndSubmit("not-an-email", "Passw0rd");

    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
    expect(registerSpy).not.toHaveBeenCalled();
  });

  it("shows a validation error and does not call the API for a weak password (AC4, AC5)", async () => {
    const registerSpy = vi.spyOn(authApi, "register");

    renderRegister();

    fillAndSubmit("a@b.com", "weak");

    expect(await screen.findByText(/8 characters/i)).toBeInTheDocument();
    expect(registerSpy).not.toHaveBeenCalled();
  });
});
