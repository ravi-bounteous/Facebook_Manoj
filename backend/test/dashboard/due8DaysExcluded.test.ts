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

describe("getDashboardForUser 8-day boundary excluded (AC8)", () => {
  it("excludes a task due 8 days from today from upcomingTasks", async () => {
    const user = await registerUser("boundary8-1@example.com");
    const in8Days = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
    await knex("tasks").insert({ user_id: user.user.id, title: "due-in-8", completed: false, due_date: in8Days });

    const result = await getDashboardForUser(user.user.id);

    expect(result.upcomingTasks).toEqual([]);
  });
});
