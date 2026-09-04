import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as authApi from "../api/authApi";
import { isValidEmail, isValidPassword } from "../validators";

export function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!isValidEmail(email)) {
      setError("A valid email is required");
      return;
    }
    const passwordCheck = isValidPassword(password);
    if (!passwordCheck.valid) {
      setError(passwordCheck.reason!);
      return;
    }

    try {
      await authApi.register(email, password);
      navigate("/tasks");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Register</h1>
      <label htmlFor="register-email">Email</label>
      <input id="register-email" type="text" value={email} onChange={(e) => setEmail(e.target.value)} />

      <label htmlFor="register-password">Password</label>
      <input
        id="register-password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {error && <p role="alert">{error}</p>}

      <button type="submit">Register</button>
    </form>
  );
}
