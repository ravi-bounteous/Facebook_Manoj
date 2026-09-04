import request from "supertest";
import { createApp } from "../../src/app";
import { knex } from "../../src/db/knex";
import { VALID_CREDENTIAL } from "../fixtures/credentials";

const app = createApp();

describe("POST /api/auth/register", () => {
  it("registers a valid user and returns tokens (AC1)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "alice@example.com", password: VALID_CREDENTIAL });

    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user.email).toBe("alice@example.com");
  });

  it("rejects a duplicate email with 409 (AC2, AC3)", async () => {
    await request(app).post("/api/auth/register").send({ email: "bob@example.com", password: VALID_CREDENTIAL });
    const res = await request(app).post("/api/auth/register").send({ email: "bob@example.com", password: VALID_CREDENTIAL });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already registered/i);

    const rows = await knex("users").where({ email: "bob@example.com" });
    expect(rows.length).toBe(1);
  });

  it("detects a duplicate email case-insensitively (AC19)", async () => {
    await request(app).post("/api/auth/register").send({ email: "user@example.com", password: VALID_CREDENTIAL });
    const res = await request(app).post("/api/auth/register").send({ email: "User@Example.com", password: VALID_CREDENTIAL });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already registered/i);
  });

  it("creates an account for exactly-8-char strong password (AC16)", async () => {
    const res = await request(app).post("/api/auth/register").send({ email: "carol@example.com", password: VALID_CREDENTIAL });
    expect(res.status).toBe(201);
  });
});
