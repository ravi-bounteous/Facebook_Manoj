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

describe("getDashboardForUser overdue does not exceed pending (AC12)", () => {
  it("keeps overdueCount less than or equal to pendingCount", async () => {
    const user = await registerUser("overduepending1@example.com");
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await knex("tasks").insert({ user_id: user.user.id, title: "overdue", completed: false, due_date: yesterday });
    await knex("tasks").insert({ user_id: user.user.id, title: "not-overdue", completed: false, due_date: tomorrow });

    const result = await getDashboardForUser(user.user.id);

    expect(result.overdueCount).toBeLessThanOrEqual(result.pendingCount);
  });
});
