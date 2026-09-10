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

describe("getDashboardForUser summary counts (AC1)", () => {
  it("returns total, completed, pending, and overdue counts", async () => {
    const user = await registerUser("summary1@example.com");
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await knex("tasks").insert({ user_id: user.user.id, title: "completed", completed: true, due_date: null });
    await knex("tasks").insert({ user_id: user.user.id, title: "pending-future", completed: false, due_date: tomorrow });
    await knex("tasks").insert({ user_id: user.user.id, title: "overdue", completed: false, due_date: yesterday });

    const result = await getDashboardForUser(user.user.id);

    expect(result.totalCount).toBe(3);
    expect(result.completedCount).toBe(1);
    expect(result.pendingCount).toBe(2);
    expect(result.overdueCount).toBe(1);
  });
});
