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

describe("getDashboardForUser shows all upcoming tasks with no truncation (AC14)", () => {
  it("returns all 10 qualifying tasks with none omitted", async () => {
    const user = await registerUser("overflow1@example.com");
    const titles: string[] = [];
    for (let i = 0; i < 10; i++) {
      const title = `task-${i}`;
      titles.push(title);
      await knex("tasks").insert({
        user_id: user.user.id,
        title,
        completed: false,
        due_date: new Date(Date.now() + i * 12 * 60 * 60 * 1000),
      });
    }

    const result = await getDashboardForUser(user.user.id);

    expect(result.upcomingTasks).toHaveLength(10);
    expect(result.upcomingTasks.map((t: any) => t.title)).toEqual(titles);
  });
});
