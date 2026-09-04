import request from "supertest";
import { createApp } from "../../src/app";
import { knex } from "../../src/db/knex";

const app = createApp();

describe("GET /api/tasks isolation (AC15)", () => {
  it("returns only the requesting user's tasks", async () => {
    const userA = await request(app).post("/api/auth/register").send({ email: "kate@example.com", password: "Passw0rd" });
    const userB = await request(app).post("/api/auth/register").send({ email: "liam@example.com", password: "Passw0rd" });

    await knex("tasks").insert({ user_id: userA.body.user.id, title: "A's task" });
    await knex("tasks").insert({ user_id: userB.body.user.id, title: "B's task" });

    const res = await request(app).get("/api/tasks").set("Authorization", `Bearer ${userA.body.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.tasks).toHaveLength(1);
    expect(res.body.tasks[0].title).toBe("A's task");
  });
});
