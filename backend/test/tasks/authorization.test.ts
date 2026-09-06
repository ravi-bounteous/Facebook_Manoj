import request from "supertest";
import { createApp } from "../../src/app";
import { VALID_CREDENTIAL } from "../fixtures/credentials";

const app = createApp();

async function registerUser(email: string) {
  const res = await request(app).post("/api/auth/register").send({ email, password: VALID_CREDENTIAL });
  return res.body.accessToken as string;
}

describe("Task edit authorization and not-found (AC17, AC18, AC19)", () => {
  it("returns 403 with a permission message when editing another user's task and does not update it", async () => {
    const tokenA = await registerUser("owner@example.com");
    const tokenB = await registerUser("intruder@example.com");

    const createRes = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ title: "Owner's task" });
    const task = createRes.body.task;

    const res = await request(app)
      .put(`/api/tasks/${task.id}`)
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ title: "Hijacked" });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/permission/i);

    const get = await request(app).get(`/api/tasks/${task.id}`).set("Authorization", `Bearer ${tokenA}`);
    expect(get.body.task.title).toBe("Owner's task");
  });

  it("returns 403 when viewing another user's task", async () => {
    const tokenA = await registerUser("owner2@example.com");
    const tokenB = await registerUser("intruder2@example.com");

    const createRes = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ title: "Owner's task" });
    const task = createRes.body.task;

    const res = await request(app).get(`/api/tasks/${task.id}`).set("Authorization", `Bearer ${tokenB}`);
    expect(res.status).toBe(403);
  });

  it("returns 404 'task not found' for a deleted/non-existent task", async () => {
    const token = await registerUser("gone@example.com");
    const missingId = "00000000-0000-0000-0000-000000000000";

    const getRes = await request(app).get(`/api/tasks/${missingId}`).set("Authorization", `Bearer ${token}`);
    expect(getRes.status).toBe(404);
    expect(getRes.body.error).toMatch(/not found/i);

    const putRes = await request(app)
      .put(`/api/tasks/${missingId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "New title" });
    expect(putRes.status).toBe(404);
    expect(putRes.body.error).toMatch(/not found/i);
  });
});
