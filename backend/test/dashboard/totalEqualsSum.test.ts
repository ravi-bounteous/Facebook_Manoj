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

describe("getDashboardForUser total equals sum of completed and pending (AC11)", () => {
  it("keeps totalCount consistent with completedCount + pendingCount", async () => {
    const user = await registerUser("totalsum1@example.com");
    await knex("tasks").insert({ user_id: user.user.id, title: "c1", completed: true, due_date: null });
    await knex("tasks").insert({ user_id: user.user.id, title: "c2", completed: true, due_date: null });
    await knex("tasks").insert({ user_id: user.user.id, title: "p1", completed: false, due_date: new Date() });

    const result = await getDashboardForUser(user.user.id);

    expect(result.totalCount).toBe(result.completedCount + result.pendingCount);
  });
});
