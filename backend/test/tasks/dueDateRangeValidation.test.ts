import request from "supertest";
import { createApp } from "../../src/app";
import { knex } from "../../src/db/knex";
import { VALID_CREDENTIAL } from "../fixtures/credentials";

const app = createApp();

async function registerUser(email: string) {
  const res = await request(app).post("/api/auth/register").send({ email, password: VALID_CREDENTIAL });
  return res.body;
}

describe("GET /api/tasks due-date range validation (AC10)", () => {
  it("returns 400 and does not apply the filter when start date is after end date", async () => {
    const user = await registerUser("routevalidation@example.com");
    await knex("tasks").insert({ user_id: user.user.id, title: "task", due_date: new Date("2026-01-07") });

    const res = await request(app)
      .get("/api/tasks?dueFrom=2026-01-10&dueTo=2026-01-05")
      .set("Authorization", `Bearer ${user.accessToken}`);

    expect(res.status).toBe(400);
    expect(res.body.tasks).toBeUndefined();
  });
});
