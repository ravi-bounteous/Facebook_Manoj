export interface PasswordValidationResult {
  valid: boolean;
  reason?: string;
}

export function isValidPassword(password: string): PasswordValidationResult {
  if (!password) {
    return { valid: false, reason: "Password is required" };
  }
  if (password.length < 8) {
    return { valid: false, reason: "Password must be at least 8 characters" };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, reason: "Password must contain at least one uppercase letter" };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, reason: "Password must contain at least one lowercase letter" };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, reason: "Password must contain at least one digit" };
  }
  return { valid: true };
}
