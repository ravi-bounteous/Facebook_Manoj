import request from "supertest";
import jwt from "jsonwebtoken";
import { createApp } from "../../src/app";
import { config } from "../../src/config";
import { VALID_CREDENTIAL } from "../fixtures/credentials";

const app = createApp();

describe("POST /api/auth/refresh", () => {
  it("issues a new access token for a valid refresh token (AC23)", async () => {
    const reg = await request(app).post("/api/auth/register").send({ email: "mia@example.com", password: VALID_CREDENTIAL });

    const res = await request(app).post("/api/auth/refresh").send({ refreshToken: reg.body.refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    const decoded = jwt.verify(res.body.accessToken, config.accessTokenSecret) as jwt.JwtPayload;
    expect(decoded.exp!).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it("rejects an expired refresh token with 401 (AC24)", async () => {
    const expiredRefreshToken = jwt.sign({ sub: "some-user-id" }, config.refreshTokenSecret, { expiresIn: -10 });

    const res = await request(app).post("/api/auth/refresh").send({ refreshToken: expiredRefreshToken });

    expect(res.status).toBe(401);
  });

  it("rejects a missing refresh token with 401", async () => {
    const res = await request(app).post("/api/auth/refresh").send({});
    expect(res.status).toBe(401);
  });
});
