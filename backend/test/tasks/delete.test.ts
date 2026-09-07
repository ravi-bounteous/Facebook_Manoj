import request from "supertest";
import { createApp } from "../../src/app";
import { knex } from "../../src/db/knex";
import { VALID_CREDENTIAL } from "../fixtures/credentials";

const app = createApp();

describe("DELETE /api/tasks/:id (AC3)", () => {
  it("permanently removes an owned incomplete task", async () => {
    const user = await request(app).post("/api/auth/register").send({ email: "delete1@example.com", password: VALID_CREDENTIAL });
    const [task] = await knex("tasks").insert({ user_id: user.body.user.id, title: "Task" }).returning("*");

    const res = await request(app)
      .delete(`/api/tasks/${task.id}`)
      .set("Authorization", `Bearer ${user.body.accessToken}`);

    expect(res.status).toBe(200);

    const list = await request(app).get("/api/tasks").set("Authorization", `Bearer ${user.body.accessToken}`);
    expect(list.body.tasks.find((t: any) => t.id === task.id)).toBeUndefined();
  });

  it("permanently removes an owned completed task", async () => {
    const user = await request(app).post("/api/auth/register").send({ email: "delete2@example.com", password: VALID_CREDENTIAL });
    const [task] = await knex("tasks").insert({ user_id: user.body.user.id, title: "Task", completed: true }).returning("*");

    const res = await request(app)
      .delete(`/api/tasks/${task.id}`)
      .set("Authorization", `Bearer ${user.body.accessToken}`);

    expect(res.status).toBe(200);

    const list = await request(app).get("/api/tasks").set("Authorization", `Bearer ${user.body.accessToken}`);
    expect(list.body.tasks.find((t: any) => t.id === task.id)).toBeUndefined();
  });
});
