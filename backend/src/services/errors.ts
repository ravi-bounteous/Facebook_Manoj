export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class DuplicateEmailError extends Error {
  constructor() {
    super("Email already registered");
    this.name = "DuplicateEmailError";
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid email or password");
    this.name = "InvalidCredentialsError";
  }
}

export class AccountLockedError extends Error {
  constructor() {
    super("Account temporarily locked. Try again later.");
    this.name = "AccountLockedError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "Task not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to edit this task") {
    super(message);
    this.name = "ForbiddenError";
  }
}
