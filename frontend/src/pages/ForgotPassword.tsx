import { Link } from "react-router-dom";

export function ForgotPassword() {
  return (
    <div>
      <h1>Forgot Password</h1>
      <p>Password reset is not yet available. Please contact support to regain access to your account.</p>
      <Link to="/login">Back to Log In</Link>
    </div>
  );
}
