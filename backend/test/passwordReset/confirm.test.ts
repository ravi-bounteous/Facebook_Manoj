import request from "supertest";
import { createApp } from "../../src/app";
import { knex } from "../../src/db/knex";
import * as authService from "../../src/services/authService";
import * as passwordResetService from "../../src/services/passwordResetService";
import { InvalidResetTokenError } from "../../src/services/errors";
import { FakeEmailService } from "../fixtures/fakeEmailService";
import { VALID_CREDENTIAL, WEAK_CREDENTIAL } from "../fixtures/credentials";
import { Clock } from "../../src/utils/clock";

const app = createApp();

function fixedClock(date: Date): Clock {
  return { now: () => date };
}

function extractToken(body: string): string {
  const match = body.match(/token=([a-f0-9]{64})/);
  if (!match) throw new Error("no token found in email body");
  return match[1];
}

async function requestResetAndGetToken(email: string, clock: Clock = { now: () => new Date() }) {
  const emailService = new FakeEmailService();
  await passwordResetService.requestReset(email, clock, emailService);
  return extractToken(emailService.sent[emailService.sent.length - 1].body);
}

describe("password reset confirm", () => {
  it("redirects (succeeds) with a valid link and strong password (AC4)", async () => {
    await authService.register("frank@example.com", VALID_CREDENTIAL);
    const token = await requestResetAndGetToken("frank@example.com");

    const res = await request(app)
      .post("/api/auth/password-reset/confirm")
      .send({ token, password: "NewPassw0rd" });

    expect(res.status).toBe(200);

    const login = await request(app).post("/api/auth/login").send({ email: "frank@example.com", password: "NewPassw0rd" });
    expect(login.status).toBe(200);
    const oldLogin = await request(app).post("/api/auth/login").send({ email: "frank@example.com", password: VALID_CREDENTIAL });
    expect(oldLogin.status).toBe(401);
  });

  it("shows an error for an already-used link and does not change the password (AC5, AC6)", async () => {
    await authService.register("grace@example.com", VALID_CREDENTIAL);
    const token = await requestResetAndGetToken("grace@example.com");

    const first = await request(app).post("/api/auth/password-reset/confirm").send({ token, password: "NewPassw0rd" });
    expect(first.status).toBe(200);

    const second = await request(app).post("/api/auth/password-reset/confirm").send({ token, password: "AnotherPass1" });
    expect(second.status).toBe(400);

    const login = await request(app).post("/api/auth/login").send({ email: "grace@example.com", password: "NewPassw0rd" });
    expect(login.status).toBe(200);
  });

  it("shows an error for an expired link and does not change the password (AC5, AC6)", async () => {
    const start = new Date("2026-01-01T00:00:00Z");
    await authService.register("henry@example.com", VALID_CREDENTIAL);
    const token = await requestResetAndGetToken("henry@example.com", fixedClock(start));

    const wayLater = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    await expect(
      passwordResetService.resetPassword(token, "NewPassw0rd", fixedClock(wayLater))
    ).rejects.toThrow(InvalidResetTokenError);

    const login = await request(app).post("/api/auth/login").send({ email: "henry@example.com", password: VALID_CREDENTIAL });
    expect(login.status).toBe(200);
  });

  it("shows an error for a weak password and does not change the password (AC7, AC8)", async () => {
    await authService.register("iris@example.com", VALID_CREDENTIAL);
    const token = await requestResetAndGetToken("iris@example.com");

    const res = await request(app).post("/api/auth/password-reset/confirm").send({ token, password: WEAK_CREDENTIAL });
    expect(res.status).toBe(400);

    const login = await request(app).post("/api/auth/login").send({ email: "iris@example.com", password: VALID_CREDENTIAL });
    expect(login.status).toBe(200);

    const stillUsable = await request(app).post("/api/auth/password-reset/confirm").send({ token, password: "GoodPass1" });
    expect(stillUsable.status).toBe(200);
  });

  it("only lets the first of two concurrent submissions succeed (AC9, AC10)", async () => {
    await authService.register("jack@example.com", VALID_CREDENTIAL);
    const token = await requestResetAndGetToken("jack@example.com");

    const results = await Promise.allSettled([
      passwordResetService.resetPassword(token, "NewPassw0rd", { now: () => new Date() }),
      passwordResetService.resetPassword(token, "OtherPass1", { now: () => new Date() }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
  });

  it("allows a reset 59 minutes after issuance (AC11)", async () => {
    const start = new Date("2026-01-01T00:00:00Z");
    await authService.register("kate@example.com", VALID_CREDENTIAL);
    const token = await requestResetAndGetToken("kate@example.com", fixedClock(start));

    const almostExpired = new Date(start.getTime() + 59 * 60 * 1000);
    await expect(
      passwordResetService.resetPassword(token, "NewPassw0rd", fixedClock(almostExpired))
    ).resolves.toBeUndefined();
  });

  it("rejects a reset 61 minutes after issuance and does not change the password (AC12, AC13)", async () => {
    const start = new Date("2026-01-01T00:00:00Z");
    await authService.register("liam@example.com", VALID_CREDENTIAL);
    const token = await requestResetAndGetToken("liam@example.com", fixedClock(start));

    const pastExpiry = new Date(start.getTime() + 61 * 60 * 1000);
    await expect(
      passwordResetService.resetPassword(token, "NewPassw0rd", fixedClock(pastExpiry))
    ).rejects.toThrow(InvalidResetTokenError);

    const login = await request(app).post("/api/auth/login").send({ email: "liam@example.com", password: VALID_CREDENTIAL });
    expect(login.status).toBe(200);
  });

  it("invalidates a superseded earlier link with the same generic error (AC14)", async () => {
    await authService.register("mona@example.com", VALID_CREDENTIAL);
    const firstToken = await requestResetAndGetToken("mona@example.com");
    await requestResetAndGetToken("mona@example.com");

    await expect(
      passwordResetService.resetPassword(firstToken, "NewPassw0rd")
    ).rejects.toThrow(InvalidResetTokenError);
  });

  it("shows the same generic error for a malformed/tampered token (AC15)", async () => {
    await expect(
      passwordResetService.resetPassword("not-a-real-token-abc123", "NewPassw0rd")
    ).rejects.toThrow(InvalidResetTokenError);
  });

  it("invalidates other active sessions on successful reset (AC16)", async () => {
    await authService.register("nina@example.com", VALID_CREDENTIAL);
    const sessionA = await authService.login("nina@example.com", VALID_CREDENTIAL);
    const sessionB = await authService.login("nina@example.com", VALID_CREDENTIAL);

    const token = await requestResetAndGetToken("nina@example.com");
    await passwordResetService.resetPassword(token, "NewPassw0rd");

    const refreshA = await request(app).post("/api/auth/refresh").send({ refreshToken: sessionA.refreshToken });
    const refreshB = await request(app).post("/api/auth/refresh").send({ refreshToken: sessionB.refreshToken });

    expect(refreshA.status).toBe(401);
    expect(refreshB.status).toBe(401);
  });

  it("sends a confirmation security notice email with no actionable link (AC17)", async () => {
    await authService.register("oscar@example.com", VALID_CREDENTIAL);
    const requestEmailService = new FakeEmailService();
    await passwordResetService.requestReset("oscar@example.com", undefined, requestEmailService);
    const token = extractToken(requestEmailService.sent[0].body);

    const confirmEmailService = new FakeEmailService();
    await passwordResetService.resetPassword(token, "NewPassw0rd", undefined, confirmEmailService);

    expect(confirmEmailService.sent).toHaveLength(1);
    expect(confirmEmailService.sent[0].to).toBe("oscar@example.com");
    expect(confirmEmailService.sent[0].body).not.toMatch(/token=/);
  });

  it("still sends a reset email on the 5th request within an hour (AC18)", async () => {
    await authService.register("penny@example.com", VALID_CREDENTIAL);
    const now = new Date("2026-01-01T00:00:00Z");
    const clock = fixedClock(now);
    const emailService = new FakeEmailService();

    for (let i = 0; i < 4; i++) {
      await passwordResetService.requestReset("penny@example.com", clock, emailService);
    }
    emailService.sent = [];

    await passwordResetService.requestReset("penny@example.com", clock, emailService);
    expect(emailService.sent).toHaveLength(1);
  });

  it("shows the generic confirmation message but sends no email on the 6th request within an hour (AC19, AC20)", async () => {
    await authService.register("quinn@example.com", VALID_CREDENTIAL);
    const now = new Date("2026-01-01T00:00:00Z");
    const clock = fixedClock(now);
    const emailService = new FakeEmailService();

    for (let i = 0; i < 5; i++) {
      await passwordResetService.requestReset("quinn@example.com", clock, emailService);
    }
    emailService.sent = [];
    const user = await knex("users").where({ email: "quinn@example.com" }).first();
    const tokenRowsBefore = await knex("password_reset_tokens").where({ user_id: user.id });

    await passwordResetService.requestReset("quinn@example.com", clock, emailService);
    expect(emailService.sent).toHaveLength(0);

    const tokenRowsAfter = await knex("password_reset_tokens").where({ user_id: user.id });
    expect(tokenRowsAfter).toHaveLength(tokenRowsBefore.length);

    const res = await request(app).post("/api/auth/password-reset/request").send({ email: "quinn@example.com" });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("If that email is registered, a reset link has been sent.");
  });
});
