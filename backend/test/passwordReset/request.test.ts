import request from "supertest";
import { createApp } from "../../src/app";
import { knex } from "../../src/db/knex";
import * as authService from "../../src/services/authService";
import * as passwordResetService from "../../src/services/passwordResetService";
import { FakeEmailService } from "../fixtures/fakeEmailService";
import { VALID_CREDENTIAL } from "../fixtures/credentials";

const app = createApp();

describe("password reset request", () => {
  it("sends a reset email with a unique link for a registered email (AC1)", async () => {
    await authService.register("dave@example.com", VALID_CREDENTIAL);
    const emailService = new FakeEmailService();

    await passwordResetService.requestReset("dave@example.com", undefined, emailService);

    expect(emailService.sent).toHaveLength(1);
    expect(emailService.sent[0].to).toBe("dave@example.com");
    expect(emailService.sent[0].body).toMatch(/token=[a-f0-9]{64}/);

    const rows = await knex("password_reset_tokens");
    expect(rows).toHaveLength(1);
  });

  it("shows the same generic confirmation message for an unregistered email (AC2)", async () => {
    await authService.register("erin@example.com", VALID_CREDENTIAL);

    const registeredRes = await request(app)
      .post("/api/auth/password-reset/request")
      .send({ email: "erin@example.com" });
    const unregisteredRes = await request(app)
      .post("/api/auth/password-reset/request")
      .send({ email: "unknown@example.com" });

    expect(unregisteredRes.status).toBe(registeredRes.status);
    expect(unregisteredRes.body).toEqual(registeredRes.body);
  });

  it("sends no email for an unregistered email (AC3)", async () => {
    const emailService = new FakeEmailService();

    await passwordResetService.requestReset("nobody@example.com", undefined, emailService);

    expect(emailService.sent).toHaveLength(0);
    const rows = await knex("password_reset_tokens");
    expect(rows).toHaveLength(0);
  });
});
