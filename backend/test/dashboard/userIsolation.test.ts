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

describe("getDashboardForUser user isolation (AC9)", () => {
  it("only reflects the requesting user's own tasks", async () => {
    const userA = await registerUser("isolationA@example.com");
    const userB = await registerUser("isolationB@example.com");

    await knex("tasks").insert({ user_id: userA.user.id, title: "a-task", completed: false, due_date: new Date() });
    await knex("tasks").insert({ user_id: userB.user.id, title: "b-task-1", completed: false, due_date: new Date() });
    await knex("tasks").insert({ user_id: userB.user.id, title: "b-task-2", completed: true, due_date: null });

    const resultA = await getDashboardForUser(userA.user.id);
    const resultB = await getDashboardForUser(userB.user.id);

    expect(resultA.totalCount).toBe(1);
    expect(resultA.upcomingTasks.map((t: any) => t.title)).toEqual(["a-task"]);
    expect(resultB.totalCount).toBe(2);
    expect(resultB.upcomingTasks.map((t: any) => t.title)).toEqual(["b-task-1"]);
  });
});
