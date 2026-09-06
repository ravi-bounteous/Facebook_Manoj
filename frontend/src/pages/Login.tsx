import { FormEvent, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import * as authApi from "../api/authApi";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    try {
      await authApi.login(email, password);
      const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname;
      navigate(from || "/tasks");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Log In</h1>
      <label htmlFor="login-email">Email</label>
      <input id="login-email" type="text" value={email} onChange={(e) => setEmail(e.target.value)} />

      <label htmlFor="login-password">Password</label>
      <input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

      {error && <p role="alert">{error}</p>}

      <button type="submit">Log In</button>
    </form>
  );
}
