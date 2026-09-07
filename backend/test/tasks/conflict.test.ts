import request from "supertest";
import { createApp } from "../../src/app";
import { knex } from "../../src/db/knex";
import { VALID_CREDENTIAL } from "../fixtures/credentials";

const app = createApp();

describe("PATCH/DELETE /api/tasks/:id conflicts (AC6)", () => {
  it("returns 404 with a clear error when toggling an already-deleted task", async () => {
    const user = await request(app).post("/api/auth/register").send({ email: "conflict1@example.com", password: VALID_CREDENTIAL });
    const [task] = await knex("tasks").insert({ user_id: user.body.user.id, title: "Task" }).returning("*");
    await knex("tasks").where({ id: task.id }).del();

    const res = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .set("Authorization", `Bearer ${user.body.accessToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Task not found");
  });

  it("returns 404 with a clear error when deleting an already-deleted task", async () => {
    const user = await request(app).post("/api/auth/register").send({ email: "conflict2@example.com", password: VALID_CREDENTIAL });
    const [task] = await knex("tasks").insert({ user_id: user.body.user.id, title: "Task" }).returning("*");
    await knex("tasks").where({ id: task.id }).del();

    const res = await request(app)
      .delete(`/api/tasks/${task.id}`)
      .set("Authorization", `Bearer ${user.body.accessToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Task not found");
  });

  it("returns 404 when toggling or deleting another user's task", async () => {
    const userA = await request(app).post("/api/auth/register").send({ email: "conflict3a@example.com", password: VALID_CREDENTIAL });
    const userB = await request(app).post("/api/auth/register").send({ email: "conflict3b@example.com", password: VALID_CREDENTIAL });
    const [task] = await knex("tasks").insert({ user_id: userB.body.user.id, title: "B's task" }).returning("*");

    const patchRes = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .set("Authorization", `Bearer ${userA.body.accessToken}`);
    expect(patchRes.status).toBe(404);

    const deleteRes = await request(app)
      .delete(`/api/tasks/${task.id}`)
      .set("Authorization", `Bearer ${userA.body.accessToken}`);
    expect(deleteRes.status).toBe(404);
  });
});
