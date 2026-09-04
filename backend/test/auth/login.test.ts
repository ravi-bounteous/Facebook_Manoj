import request from "supertest";
import { createApp } from "../../src/app";
import { knex } from "../../src/db/knex";

const app = createApp();

async function registerUser(email: string, password: string) {
  await request(app).post("/api/auth/register").send({ email, password });
}

describe("POST /api/auth/login", () => {
  it("logs in with correct credentials (AC6)", async () => {
    await registerUser("erin@example.com", "Passw0rd");
    const res = await request(app).post("/api/auth/login").send({ email: "erin@example.com", password: "Passw0rd" });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  it("rejects an incorrect password with a generic error (AC7, AC8)", async () => {
    await registerUser("frank@example.com", "Passw0rd");
    const res = await request(app).post("/api/auth/login").send({ email: "frank@example.com", password: "WrongPass1" });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid email or password/i);
    expect(res.body.accessToken).toBeUndefined();
  });

  it("rejects an unregistered email with the same generic error (AC7, AC8)", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "nobody@example.com", password: "Passw0rd" });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid email or password/i);
  });

  it("does not create a session on failed login", async () => {
    await registerUser("grace@example.com", "Passw0rd");
    await request(app).post("/api/auth/login").send({ email: "grace@example.com", password: "WrongPass1" });

    const protectedRes = await request(app).get("/api/tasks");
    expect(protectedRes.status).toBe(401);
  });

  it("authenticates case-insensitively on email (AC20)", async () => {
    await registerUser("henry@example.com", "Passw0rd");
    const res = await request(app).post("/api/auth/login").send({ email: "Henry@Example.com", password: "Passw0rd" });

    expect(res.status).toBe(200);
  });

  it("returns a short-lived access token and longer-lived refresh token (AC21, AC22)", async () => {
    await registerUser("ivy@example.com", "Passw0rd");
    const res = await request(app).post("/api/auth/login").send({ email: "ivy@example.com", password: "Passw0rd" });

    const jwt = require("jsonwebtoken");
    const access = jwt.decode(res.body.accessToken);
    const refresh = jwt.decode(res.body.refreshToken);
    expect(refresh.exp - refresh.iat).toBeGreaterThan(access.exp - access.iat);
  });
});
