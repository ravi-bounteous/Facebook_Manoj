import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Login } from "../../src/pages/Login";
import * as authApi from "../../src/api/authApi";
import { tokenStorage } from "../../src/api/tokenStorage";

function validToken() {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({ sub: "1", exp: Math.floor(Date.now() / 1000) + 15 * 60 }));
  return `${header}.${payload}.signature`;
}

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/tasks" element={<div>Task List</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Login page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    tokenStorage.clear();
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

  it("shows an error message and does not navigate on invalid credentials (AC3, AC4)", async () => {
    vi.spyOn(authApi, "login").mockRejectedValue(new Error("Invalid email or password"));

    renderLogin();
    fillAndSubmit("a@b.com", "wrong");

    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /log in/i })).toBeInTheDocument();
  });

  it("shows a validation message and does not call the login API when the email is empty (AC5, AC6)", async () => {
    const loginSpy = vi.spyOn(authApi, "login");

    renderLogin();
    fillAndSubmit("", "somepassword");

    expect(await screen.findByRole("alert")).toHaveTextContent(/email.*required|required.*email/i);
    expect(loginSpy).not.toHaveBeenCalled();
  });

  it("shows a validation message and does not call the login API when the password is empty (AC5, AC6)", async () => {
    const loginSpy = vi.spyOn(authApi, "login");

    renderLogin();
    fillAndSubmit("a@b.com", "");

    expect(await screen.findByRole("alert")).toHaveTextContent(/password.*required|required.*password/i);
    expect(loginSpy).not.toHaveBeenCalled();
  });

  it("shows a validation message and does not call the login API when the email is not a valid format", async () => {
    const loginSpy = vi.spyOn(authApi, "login");

    renderLogin();
    fillAndSubmit("not-an-email", "somepassword");

    expect(await screen.findByRole("alert")).toHaveTextContent(/valid email/i);
    expect(loginSpy).not.toHaveBeenCalled();
  });

  it("submits successfully with a simple, non-complex password (AC8)", async () => {
    const loginSpy = vi.spyOn(authApi, "login").mockResolvedValue({
      accessToken: "a",
      refreshToken: "r",
      user: { id: "1", email: "a@b.com" },
    });

    renderLogin();
    fillAndSubmit("a@b.com", "abc");

    await waitFor(() => expect(loginSpy).toHaveBeenCalledWith("a@b.com", "abc"));
    expect(await screen.findByText(/task list/i)).toBeInTheDocument();
  });

  it("completes login with a single submission and no additional factor prompt (AC13)", async () => {
    vi.spyOn(authApi, "login").mockResolvedValue({
      accessToken: "a",
      refreshToken: "r",
      user: { id: "1", email: "a@b.com" },
    });

    renderLogin();
    fillAndSubmit("a@b.com", "Passw0rd");

    expect(await screen.findByText(/task list/i)).toBeInTheDocument();
    expect(screen.queryByText(/verification code|two-factor|mfa/i)).not.toBeInTheDocument();
  });

  it("renders a Forgot Password link (AC11)", () => {
    renderLogin();
    expect(screen.getByRole("link", { name: /forgot password/i })).toBeInTheDocument();
  });

  it("redirects an already-authenticated user away from /login without showing the form (AC7)", () => {
    tokenStorage.setTokens(validToken(), "some-refresh");

    renderLogin();

    expect(screen.getByText(/task list/i)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /log in/i })).not.toBeInTheDocument();
  });
});
