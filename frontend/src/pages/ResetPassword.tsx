import { FormEvent, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import * as authApi from "../api/authApi";
import { isValidPassword } from "../validators";

export function ResetPassword() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const passwordCheck = isValidPassword(password);
    if (!passwordCheck.valid) {
      setError(passwordCheck.reason!);
      return;
    }

    try {
      await authApi.resetPassword(token, password);
      navigate("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset failed");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Reset Password</h1>
      <label htmlFor="reset-password-new-password">New Password</label>
      <input
        id="reset-password-new-password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {error && <p role="alert">{error}</p>}

      <button type="submit">Reset Password</button>
    </form>
  );
}
