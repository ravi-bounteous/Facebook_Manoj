import { knex } from "../../src/db/knex";
import request from "supertest";
import { createApp } from "../../src/app";
import { VALID_CREDENTIAL } from "../fixtures/credentials";

const app = createApp();

async function registerUser(email: string) {
  const res = await request(app).post("/api/auth/register").send({ email, password: VALID_CREDENTIAL });
  return res.body;
}

describe("GET /api/tasks/dashboard (AC18)", () => {
  it("returns no link/URL field for a full upcoming-tasks list even with more than 7 qualifying tasks", async () => {
    const user = await registerUser("nofulllink1@example.com");
    for (let i = 0; i < 10; i++) {
      await knex("tasks").insert({
        user_id: user.user.id,
        title: `task-${i}`,
        completed: false,
        due_date: new Date(Date.now() + i * 12 * 60 * 60 * 1000),
      });
    }

    const res = await request(app)
      .get("/api/tasks/dashboard")
      .set("Authorization", `Bearer ${user.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.upcomingTasks.length).toBe(10);
    const bodyString = JSON.stringify(res.body);
    expect(bodyString).not.toMatch(/fullList|viewAllUrl|upcomingLink/i);
  });

  it("requires authentication", async () => {
    const res = await request(app).get("/api/tasks/dashboard");
    expect(res.status).toBe(401);
  });
});
