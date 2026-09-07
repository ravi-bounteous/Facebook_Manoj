import request from "supertest";
import { createApp } from "../../src/app";
import { knex } from "../../src/db/knex";
import {
  VALID_CREDENTIAL,
  SHORT_CREDENTIAL,
  NO_UPPERCASE_CREDENTIAL,
  NO_LOWERCASE_CREDENTIAL,
  NO_DIGIT_CREDENTIAL,
  WEAK_CREDENTIAL,
} from "../fixtures/credentials";

const app = createApp();

describe("POST /api/auth/register validation (AC4, AC5, AC17, AC18)", () => {
  const cases: Array<{ name: string; body: Record<string, unknown> }> = [
    { name: "missing email", body: { password: VALID_CREDENTIAL } },
    { name: "invalid-format email", body: { email: "not-an-email", password: VALID_CREDENTIAL } },
    { name: "missing password", body: { email: "dave@example.com" } },
    { name: "7-char password", body: { email: "dave@example.com", password: SHORT_CREDENTIAL } },
    { name: "password missing uppercase", body: { email: "dave@example.com", password: NO_UPPERCASE_CREDENTIAL } },
    { name: "password missing lowercase", body: { email: "dave@example.com", password: NO_LOWERCASE_CREDENTIAL } },
    { name: "password missing digit", body: { email: "dave@example.com", password: NO_DIGIT_CREDENTIAL } },
  ];

  it.each(cases)("returns 400 with a descriptive error for $name", async ({ body }) => {
    const res = await request(app).post("/api/auth/register").send(body);
    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe("string");
    expect(res.body.error.length).toBeGreaterThan(0);
  });

  it("does not create an account when validation fails", async () => {
    await request(app).post("/api/auth/register").send({ email: "dave@example.com", password: WEAK_CREDENTIAL });
    const rows = await knex("users").where({ email: "dave@example.com" });
    expect(rows.length).toBe(0);
  });
});
