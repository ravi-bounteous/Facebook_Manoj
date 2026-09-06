import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Login } from "../../src/pages/Login";
import * as authApi from "../../src/api/authApi";

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/tasks" element={<div>Task List</div>} />
        <Route path="/forgot-password" element={<div>Forgot Password Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Login page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function fillAndSubmit(email: string, password: string) {
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: email } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: password } });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));
  }

  it("navigates to /tasks on successful login (AC6)", async () => {
    const loginSpy = vi.spyOn(authApi, "login").mockResolvedValue({
      accessToken: "a",
      refreshToken: "r",
      user: { id: "1", email: "a@b.com" },
    });

    renderLogin();
    fillAndSubmit("a@b.com", "Passw0rd");

    await waitFor(() => expect(loginSpy).toHaveBeenCalledWith("a@b.com", "Passw0rd"));
    expect(await screen.findByText(/task list/i)).toBeInTheDocument();
  });

  it("shows an error message and does not navigate on invalid credentials (AC7)", async () => {
    vi.spyOn(authApi, "login").mockRejectedValue(new Error("Invalid email or password"));

    renderLogin();
    fillAndSubmit("a@b.com", "wrong");

    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
  });

  it("navigates to /forgot-password when the forgot-password link is clicked", () => {
    renderLogin();

    fireEvent.click(screen.getByRole("link", { name: /forgot password/i }));

    expect(screen.getByText(/forgot password page/i)).toBeInTheDocument();
  });
});
