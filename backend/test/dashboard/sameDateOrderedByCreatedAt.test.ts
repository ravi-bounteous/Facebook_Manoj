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

describe("getDashboardForUser same due date ordered by created_at (AC16)", () => {
  it("orders same-due-date tasks with the earlier-created task first", async () => {
    const user = await registerUser("sameduedate1@example.com");
    const dueDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const earlier = new Date(Date.now() - 60000);
    const later = new Date();

    await knex("tasks").insert({
      user_id: user.user.id,
      title: "created-later",
      completed: false,
      due_date: dueDate,
      created_at: later,
    });
    await knex("tasks").insert({
      user_id: user.user.id,
      title: "created-earlier",
      completed: false,
      due_date: dueDate,
      created_at: earlier,
    });

    const result = await getDashboardForUser(user.user.id);

    expect(result.upcomingTasks.map((t: any) => t.title)).toEqual(["created-earlier", "created-later"]);
  });
});
