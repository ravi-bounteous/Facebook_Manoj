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

describe("getDashboardForUser excludes null due dates (AC5)", () => {
  it("excludes incomplete tasks with no due date from upcomingTasks and overdueCount", async () => {
    const user = await registerUser("nulldue1@example.com");
    await knex("tasks").insert({ user_id: user.user.id, title: "no-due-date", completed: false, due_date: null });

    const result = await getDashboardForUser(user.user.id);

    expect(result.upcomingTasks).toEqual([]);
    expect(result.overdueCount).toBe(0);
    expect(result.pendingCount).toBe(1);
  });
});
