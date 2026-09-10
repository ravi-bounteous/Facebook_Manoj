import request from "supertest";
import { createApp } from "../../src/app";

const app = createApp();

describe("app security configuration", () => {
  it("does not reflect an arbitrary origin in Access-Control-Allow-Origin (CORS)", async () => {
    const res = await request(app)
      .get("/api/tasks/dashboard")
      .set("Origin", "https://evil.example.com");

    expect(res.headers["access-control-allow-origin"]).not.toBe("https://evil.example.com");
    expect(res.headers["access-control-allow-origin"]).not.toBe("*");
  });

  it("requires authentication to access /metrics", async () => {
    const res = await request(app).get("/metrics");
    expect(res.status).toBe(401);
  });
});
