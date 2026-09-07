import request from "supertest";
import { createApp } from "../../src/app";
import { VALID_CREDENTIAL } from "../fixtures/credentials";

const app = createApp();

describe("GET /api/tasks empty state (AC6)", () => {
  it("returns an empty tasks array for a user with no tasks", async () => {
    const user = await request(app).post("/api/auth/register").send({ email: "empty@example.com", password: VALID_CREDENTIAL });

    const res = await request(app).get("/api/tasks").set("Authorization", `Bearer ${user.body.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.tasks).toEqual([]);
    expect(res.body.totalCount).toBe(0);
  });
});
