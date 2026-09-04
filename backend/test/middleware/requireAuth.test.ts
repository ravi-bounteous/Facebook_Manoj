import request from "supertest";
import { createApp } from "../../src/app";
import { VALID_CREDENTIAL } from "../fixtures/credentials";

const app = createApp();

describe("GET /api/tasks (requireAuth)", () => {
  it("denies access with no Authorization header (AC11)", async () => {
    const res = await request(app).get("/api/tasks");
    expect(res.status).toBe(401);
  });

  it("denies access with an invalid token", async () => {
    const res = await request(app).get("/api/tasks").set("Authorization", "Bearer not-a-real-token");
    expect(res.status).toBe(401);
  });

  it("allows access with a valid access token", async () => {
    const reg = await request(app).post("/api/auth/register").send({ email: "jack@example.com", password: VALID_CREDENTIAL });
    const res = await request(app).get("/api/tasks").set("Authorization", `Bearer ${reg.body.accessToken}`);
    expect(res.status).toBe(200);
  });
});
