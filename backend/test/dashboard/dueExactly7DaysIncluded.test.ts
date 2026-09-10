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

describe("getDashboardForUser 7-day boundary included (AC7)", () => {
  it("includes a task due exactly 7 days from today in upcomingTasks", async () => {
    const user = await registerUser("boundary7-1@example.com");
    const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await knex("tasks").insert({ user_id: user.user.id, title: "due-in-7", completed: false, due_date: in7Days });

    const result = await getDashboardForUser(user.user.id);

    expect(result.upcomingTasks.map((t: any) => t.title)).toEqual(["due-in-7"]);
  });
});
