import crypto from "crypto";
import { knex } from "../db/knex";
import { config } from "../config";
import { isValidEmail, normalizeEmail } from "./emailValidator";
import { isValidPassword } from "./passwordPolicy";
import { InvalidResetTokenError, ValidationError } from "./errors";
import { systemClock, Clock } from "../utils/clock";
import { EmailService, ConsoleEmailService } from "./emailService";
import { setTokenVersion } from "./tokenVersionCache";
import bcrypt from "bcrypt";

const BCRYPT_ROUNDS = 10;
const RESET_LINK_PATH = "/reset-password";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function requestReset(
  email: string,
  clock: Clock = systemClock,
  emailService: EmailService = new ConsoleEmailService()
): Promise<void> {
  if (!isValidEmail(email)) {
    throw new ValidationError("A valid email is required");
  }

  const normalizedEmail = normalizeEmail(email);
  const user = await knex("users").where({ email: normalizedEmail }).first();
  if (!user) {
    return;
  }

  const now = clock.now();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const recentCount = await knex("password_reset_tokens")
    .where({ user_id: user.id })
    .where("created_at", ">", oneHourAgo)
    .count<{ count: string }[]>("id as count")
    .first();
  const count = Number(recentCount?.count ?? 0);
  if (count >= config.passwordResetRateLimitPerHour) {
    console.warn(
      `[password-reset] rate limit exceeded user_id=${user.id} count=${count} limit=${config.passwordResetRateLimitPerHour}`
    );
    return;
  }

  await knex("password_reset_tokens")
    .where({ user_id: user.id, used_at: null })
    .update({ used_at: now });

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(now.getTime() + config.passwordResetTtlMs);

  await knex("password_reset_tokens").insert({
    user_id: user.id,
    token_hash: tokenHash,
    created_at: now,
    expires_at: expiresAt,
  });

  const resetLink = `${config.emailBaseUrl}${RESET_LINK_PATH}?token=${rawToken}`;
  await emailService.send({
    to: user.email,
    subject: "Reset your password",
    body: `Use the link below to reset your password. This link expires in 1 hour.\n${resetLink}`,
  });
}

export async function resetPassword(
  token: string,
  newPassword: string,
  clock: Clock = systemClock,
  emailService: EmailService = new ConsoleEmailService()
): Promise<void> {
  const tokenHash = hashToken(token);

  const record = await knex("password_reset_tokens").where({ token_hash: tokenHash }).first();
  if (!record || record.used_at || new Date(record.expires_at) <= clock.now()) {
    const reason = !record ? "not found" : record.used_at ? "already used" : "expired";
    console.info(`[password-reset] invalid reset token rejected reason="${reason}"`);
    throw new InvalidResetTokenError();
  }

  const passwordCheck = isValidPassword(newPassword);
  if (!passwordCheck.valid) {
    throw new ValidationError(passwordCheck.reason!);
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  const now = clock.now();

  const user = await knex.transaction(async (trx) => {
    const lockedRecord = await trx("password_reset_tokens")
      .where({ id: record.id })
      .forUpdate()
      .first();

    if (!lockedRecord || lockedRecord.used_at || new Date(lockedRecord.expires_at) <= now) {
      console.info("[password-reset] invalid reset token rejected reason=\"already used or expired (concurrent submit)\"");
      throw new InvalidResetTokenError();
    }

    const [updatedUser] = await trx("users")
      .where({ id: lockedRecord.user_id })
      .update({
        password_hash: passwordHash,
        token_version: trx.raw("token_version + 1"),
      })
      .returning(["id", "email", "token_version"]);

    await trx("password_reset_tokens")
      .where({ user_id: lockedRecord.user_id, used_at: null })
      .update({ used_at: now });

    return updatedUser;
  });

  // Invalidate the cached token_version immediately so requireAuth/refresh see
  // the new version on their very next check, rather than waiting out the
  // cache TTL (see tokenVersionCache.ts).
  setTokenVersion(user.id, user.token_version);

  await emailService.send({
    to: user.email,
    subject: "Your password was changed",
    body: "This is a security notice: your password was recently changed. If you did not make this change, please contact support immediately.",
  });
}
