import { knex } from "../../src/db/knex";
import { getDashboardForUser } from "../../src/services/dashboardService";
import request from "supertest";
import { createApp } from "../../src/app";
import { VALID_CREDENTIAL } from "../fixtures/credentials";

const app = createApp();

async function registerUser(email: string) {
  const res = await request(app).post("/api/auth/register").send({ email, password: VALID_CREDENTIAL });
  return res.body;
}

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

describe("getDashboardForUser upcoming preview (AC2)", () => {
  it("returns incomplete tasks due within the next 7 days, ordered by due date ascending", async () => {
    const user = await registerUser("upcoming1@example.com");

    await knex("tasks").insert({ user_id: user.user.id, title: "due-in-3", completed: false, due_date: daysFromNow(3) });
    await knex("tasks").insert({ user_id: user.user.id, title: "due-today", completed: false, due_date: daysFromNow(0) });
    await knex("tasks").insert({ user_id: user.user.id, title: "due-in-7", completed: false, due_date: daysFromNow(7) });
    await knex("tasks").insert({ user_id: user.user.id, title: "completed-in-2", completed: true, due_date: daysFromNow(2) });

    const result = await getDashboardForUser(user.user.id);

    expect(result.upcomingTasks.map((t: any) => t.title)).toEqual(["due-today", "due-in-3", "due-in-7"]);
  });
});
