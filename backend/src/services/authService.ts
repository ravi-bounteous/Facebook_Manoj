import bcrypt from "bcrypt";
import { knex } from "../db/knex";
import { config } from "../config";
import { isValidEmail, normalizeEmail } from "./emailValidator";
import { isValidPassword } from "./passwordPolicy";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "./tokenService";
import { AccountLockedError, DuplicateEmailError, InvalidCredentialsError, ValidationError } from "./errors";
import { systemClock, Clock } from "../utils/clock";

const BCRYPT_ROUNDS = 10;
const POSTGRES_UNIQUE_VIOLATION = "23505";

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string };
}

export async function register(email: string, password: string): Promise<AuthResult> {
  if (!isValidEmail(email)) {
    throw new ValidationError("A valid email is required");
  }
  const passwordCheck = isValidPassword(password);
  if (!passwordCheck.valid) {
    throw new ValidationError(passwordCheck.reason!);
  }

  const normalizedEmail = normalizeEmail(email);
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  let user;
  try {
    [user] = await knex("users")
      .insert({ email: normalizedEmail, password_hash: passwordHash })
      .returning(["id", "email"]);
  } catch (err: any) {
    if (err.code === POSTGRES_UNIQUE_VIOLATION) {
      throw new DuplicateEmailError();
    }
    throw err;
  }

  return {
    accessToken: signAccessToken(user.id),
    refreshToken: signRefreshToken(user.id),
    user: { id: user.id, email: user.email },
  };
}

export async function login(email: string, password: string, clock: Clock = systemClock): Promise<AuthResult> {
  const normalizedEmail = normalizeEmail(email);
  const user = await knex("users").where({ email: normalizedEmail }).first();

  if (!user) {
    throw new InvalidCredentialsError();
  }

  if (user.locked_until && new Date(user.locked_until) > clock.now()) {
    throw new AccountLockedError();
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    await recordFailedAttempt(user.id, user.failed_login_attempts, clock);
    throw new InvalidCredentialsError();
  }

  await knex("users").where({ id: user.id }).update({ failed_login_attempts: 0, locked_until: null });

  return {
    accessToken: signAccessToken(user.id),
    refreshToken: signRefreshToken(user.id),
    user: { id: user.id, email: user.email },
  };
}

async function recordFailedAttempt(userId: string, currentAttempts: number, clock: Clock): Promise<void> {
  const attempts = currentAttempts + 1;
  const update: Record<string, unknown> = { failed_login_attempts: attempts };
  if (attempts >= config.lockoutThreshold) {
    update.locked_until = new Date(clock.now().getTime() + config.lockoutDurationMs);
  }
  await knex("users").where({ id: userId }).update(update);
}

export async function refresh(refreshToken: string): Promise<{ accessToken: string }> {
  const payload = verifyRefreshToken(refreshToken);
  return { accessToken: signAccessToken(payload.sub) };
}
