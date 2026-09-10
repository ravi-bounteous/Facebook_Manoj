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

describe("getDashboardForUser due today is not overdue (AC6)", () => {
  it("does not count a task due exactly today as overdue", async () => {
    const user = await registerUser("duetoday1@example.com");
    await knex("tasks").insert({ user_id: user.user.id, title: "due-today", completed: false, due_date: new Date() });

    const result = await getDashboardForUser(user.user.id);

    expect(result.overdueCount).toBe(0);
  });
});
