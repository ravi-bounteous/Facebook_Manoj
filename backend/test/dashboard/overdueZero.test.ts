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

describe("getDashboardForUser overdue zero (AC4)", () => {
  it("returns overdueCount of 0 when no incomplete tasks are due before today", async () => {
    const user = await registerUser("overduezero1@example.com");
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await knex("tasks").insert({ user_id: user.user.id, title: "future", completed: false, due_date: tomorrow });

    const result = await getDashboardForUser(user.user.id);

    expect(result.overdueCount).toBe(0);
  });
});
