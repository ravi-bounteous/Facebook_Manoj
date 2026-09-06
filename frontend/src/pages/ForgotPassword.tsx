import { FormEvent, useState } from "react";
import * as authApi from "../api/authApi";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = await authApi.requestPasswordReset(email);
    setMessage(result.message);
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Forgot Password</h1>
      <label htmlFor="forgot-password-email">Email</label>
      <input
        id="forgot-password-email"
        type="text"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      {message && <p role="status">{message}</p>}

      <button type="submit">Send Reset Link</button>
    </form>
  );
}
