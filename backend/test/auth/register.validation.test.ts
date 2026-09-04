import request from "supertest";
import { createApp } from "../../src/app";
import { knex } from "../../src/db/knex";

const app = createApp();

describe("POST /api/auth/register validation (AC4, AC5, AC17, AC18)", () => {
  const cases: Array<{ name: string; body: Record<string, unknown> }> = [
    { name: "missing email", body: { password: "Passw0rd" } },
    { name: "invalid-format email", body: { email: "not-an-email", password: "Passw0rd" } },
    { name: "missing password", body: { email: "dave@example.com" } },
    { name: "7-char password", body: { email: "dave@example.com", password: "Pass0rd" } },
    { name: "password missing uppercase", body: { email: "dave@example.com", password: "password0" } },
    { name: "password missing lowercase", body: { email: "dave@example.com", password: "PASSWORD0" } },
    { name: "password missing digit", body: { email: "dave@example.com", password: "Password" } },
  ];

  it.each(cases)("returns 400 with a descriptive error for $name", async ({ body }) => {
    const res = await request(app).post("/api/auth/register").send(body);
    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe("string");
    expect(res.body.error.length).toBeGreaterThan(0);
  });

  it("does not create an account when validation fails", async () => {
    await request(app).post("/api/auth/register").send({ email: "dave@example.com", password: "weak" });
    const rows = await knex("users").where({ email: "dave@example.com" });
    expect(rows.length).toBe(0);
  });
});
