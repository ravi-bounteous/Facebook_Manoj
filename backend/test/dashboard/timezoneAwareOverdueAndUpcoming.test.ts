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

describe("getDashboardForUser timezone-aware overdue and upcoming (AC17)", () => {
  it("uses the user's stored timezone, not the server timezone, to determine today's date", async () => {
    const user = await registerUser("tzaware1@example.com");
    await knex("users").where({ id: user.user.id }).update({ timezone: "Pacific/Kiritimati" });

    const now = new Date();
    const todayMidnightUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    const dueDate = new Date(todayMidnightUtc.getTime() - 60 * 60 * 1000);

    await knex("tasks").insert({ user_id: user.user.id, title: "tz-shifted", completed: false, due_date: dueDate });

    const result = await getDashboardForUser(user.user.id);

    expect(result.overdueCount).toBe(0);
    expect(result.upcomingTasks.map((t: any) => t.title)).toEqual(["tz-shifted"]);
  });
});
