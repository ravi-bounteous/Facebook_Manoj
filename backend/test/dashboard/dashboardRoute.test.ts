import { knex } from "../../src/db/knex";
import request from "supertest";
import { createApp } from "../../src/app";
import { VALID_CREDENTIAL } from "../fixtures/credentials";

const app = createApp();

async function registerUser(email: string) {
  const res = await request(app).post("/api/auth/register").send({ email, password: VALID_CREDENTIAL });
  return res.body;
}

function daysFromNow(days: number): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

describe("GET /api/tasks/dashboard (AC2, AC18)", () => {
  it("returns summary counts and an upcoming preview list ordered by due date ascending", async () => {
    const user = await registerUser("route-preview@example.com");
    await knex("tasks").insert({ user_id: user.user.id, title: "due-in-5", completed: false, due_date: daysFromNow(5) });
    await knex("tasks").insert({ user_id: user.user.id, title: "due-in-1", completed: false, due_date: daysFromNow(1) });

    const res = await request(app).get("/api/tasks/dashboard").set("Authorization", `Bearer ${user.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.upcomingTasks.map((t: any) => t.title)).toEqual(["due-in-1", "due-in-5"]);
  });

  it("requires authentication", async () => {
    const res = await request(app).get("/api/tasks/dashboard");
    expect(res.status).toBe(401);
  });

  it("does not include any link/URL to a full upcoming-tasks view even when there are more than 7 upcoming tasks", async () => {
    const user = await registerUser("route-no-link@example.com");
    for (let i = 0; i < 9; i++) {
      await knex("tasks").insert({ user_id: user.user.id, title: `task-${i}`, completed: false, due_date: daysFromNow(1) });
    }

    const res = await request(app).get("/api/tasks/dashboard").set("Authorization", `Bearer ${user.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.upcomingTasks).toHaveLength(9);
    const bodyString = JSON.stringify(res.body);
    expect(bodyString).not.toMatch(/href|url|link/i);
  });
});
