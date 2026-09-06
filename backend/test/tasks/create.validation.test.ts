import request from "supertest";
import { createApp } from "../../src/app";
import { knex } from "../../src/db/knex";
import { VALID_CREDENTIAL } from "../fixtures/credentials";

const app = createApp();

async function registerUser(email: string) {
  const res = await request(app).post("/api/auth/register").send({ email, password: VALID_CREDENTIAL });
  return res.body.accessToken as string;
}

async function countTasks() {
  const [{ count }] = await knex("tasks").count("id");
  return Number(count);
}

describe("POST /api/tasks validation", () => {
  it("rejects a missing title (AC3, AC4)", async () => {
    const token = await registerUser("v1@example.com");
    const res = await request(app).post("/api/tasks").set("Authorization", `Bearer ${token}`).send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
    expect(await countTasks()).toBe(0);
  });

  it("rejects a whitespace-only title (AC28, AC29)", async () => {
    const token = await registerUser("v2@example.com");
    const res = await request(app).post("/api/tasks").set("Authorization", `Bearer ${token}`).send({ title: "   " });
    expect(res.status).toBe(400);
    expect(await countTasks()).toBe(0);
  });

  it("rejects a title exceeding 100 characters (AC31, AC32)", async () => {
    const token = await registerUser("v3@example.com");
    const res = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "a".repeat(101) });
    expect(res.status).toBe(400);
    expect(await countTasks()).toBe(0);
  });

  it("accepts a title of exactly 100 characters (AC35)", async () => {
    const token = await registerUser("v4@example.com");
    const res = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "a".repeat(100) });
    expect(res.status).toBe(201);
    expect(res.body.task.title).toHaveLength(100);
  });

  it("rejects a description exceeding 1000 characters (AC33, AC34)", async () => {
    const token = await registerUser("v5@example.com");
    const res = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Task", description: "a".repeat(1001) });
    expect(res.status).toBe(400);
    expect(await countTasks()).toBe(0);
  });

  it("rejects more than 5 tags (AC5, AC6)", async () => {
    const token = await registerUser("v6@example.com");
    const res = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Task", tags: ["a", "b", "c", "d", "e", "f"] });
    expect(res.status).toBe(400);
    expect(await countTasks()).toBe(0);
  });

  it("dedupes duplicate tags on save (AC30)", async () => {
    const token = await registerUser("v7@example.com");
    const res = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Task", tags: ["a", "a", "b"] });
    expect(res.status).toBe(201);
    expect(res.body.task.tags.sort()).toEqual(["a", "b"]);
  });

  it("rejects an invalid calendar date (AC8, AC9)", async () => {
    const token = await registerUser("v8@example.com");
    const res = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Task", due_date: "2026-13-40" });
    expect(res.status).toBe(400);
    expect(await countTasks()).toBe(0);
  });

  it("accepts today's date and a past date (AC14, AC27)", async () => {
    const token = await registerUser("v9@example.com");
    const today = new Date().toISOString().slice(0, 10);
    const res1 = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Today task", due_date: today });
    expect(res1.status).toBe(201);
    expect(res1.body.task.due_date.slice(0, 10)).toBe(today);

    const res2 = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Past task", due_date: "2000-01-01" });
    expect(res2.status).toBe(201);
  });

  it("accepts low/medium/high priority and rejects invalid priority (AC24, AC25, AC26)", async () => {
    const token = await registerUser("v10@example.com");
    for (const priority of ["low", "medium", "high"]) {
      const res = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: `Task ${priority}`, priority });
      expect(res.status).toBe(201);
      expect(res.body.task.priority).toBe(priority);
    }

    const before = await countTasks();
    const invalid = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Invalid priority task", priority: "urgent" });
    expect(invalid.status).toBe(400);
    expect(await countTasks()).toBe(before);
  });

  it("rejects a category not in the predefined list (AC22, AC23)", async () => {
    const token = await registerUser("v11@example.com");
    const res = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Task", category: "not-a-real-category" });
    expect(res.status).toBe(400);
    expect(await countTasks()).toBe(0);
  });

  it("saves with no category set when omitted (AC21)", async () => {
    const token = await registerUser("v12@example.com");
    const res = await request(app).post("/api/tasks").set("Authorization", `Bearer ${token}`).send({ title: "Task" });
    expect(res.status).toBe(201);
    expect(res.body.task.category).toBeNull();
  });
});
