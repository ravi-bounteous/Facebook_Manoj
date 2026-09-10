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

describe("getDashboardForUser upcoming preview empty (AC3)", () => {
  it("returns an empty upcomingTasks array when nothing is due within 7 days", async () => {
    const user = await registerUser("upcomingempty1@example.com");
    const farFuture = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await knex("tasks").insert({ user_id: user.user.id, title: "far-future", completed: false, due_date: farFuture });

    const result = await getDashboardForUser(user.user.id);

    expect(result.upcomingTasks).toEqual([]);
  });
});
