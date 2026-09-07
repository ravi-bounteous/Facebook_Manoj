import request from "supertest";
import { createApp } from "../../src/app";
import { knex } from "../../src/db/knex";
import { VALID_CREDENTIAL } from "../fixtures/credentials";

const app = createApp();

describe("PATCH /api/tasks/:id (AC1, AC2)", () => {
  it("toggles an incomplete task to complete", async () => {
    const user = await request(app).post("/api/auth/register").send({ email: "toggle1@example.com", password: VALID_CREDENTIAL });
    const [task] = await knex("tasks").insert({ user_id: user.body.user.id, title: "Task" }).returning("*");

    const res = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .set("Authorization", `Bearer ${user.body.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.task.completed).toBe(true);

    const list = await request(app).get("/api/tasks").set("Authorization", `Bearer ${user.body.accessToken}`);
    expect(list.body.tasks.find((t: any) => t.id === task.id).completed).toBe(true);
  });

  it("toggles a complete task back to incomplete", async () => {
    const user = await request(app).post("/api/auth/register").send({ email: "toggle2@example.com", password: VALID_CREDENTIAL });
    const [task] = await knex("tasks").insert({ user_id: user.body.user.id, title: "Task", completed: true }).returning("*");

    const res = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .set("Authorization", `Bearer ${user.body.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.task.completed).toBe(false);
  });
});
