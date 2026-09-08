import request from "supertest";
import { createApp } from "../../src/app";
import { knex } from "../../src/db/knex";
import { VALID_CREDENTIAL } from "../fixtures/credentials";

const app = createApp();

async function registerUser(email: string) {
  const res = await request(app).post("/api/auth/register").send({ email, password: VALID_CREDENTIAL });
  return res.body;
}

describe("GET /api/tasks pagination", () => {
  it("returns exactly 10 tasks on page 1 and 5 on page 2 for 15 tasks (AC2, AC4)", async () => {
    const user = await registerUser("page@example.com");
    for (let i = 0; i < 15; i++) {
      await knex("tasks").insert({ user_id: user.user.id, title: `task-${i}`, due_date: new Date(2026, 0, i + 1) });
    }

    const page1 = await request(app).get("/api/tasks?page=1").set("Authorization", `Bearer ${user.accessToken}`);
    expect(page1.body.tasks).toHaveLength(10);
    expect(page1.body.page).toBe(1);
    expect(page1.body.totalCount).toBe(15);
    expect(page1.body.totalPages).toBe(2);
    expect(page1.body.tasks.map((t: any) => t.title)).toEqual(
      Array.from({ length: 10 }, (_, i) => `task-${i}`)
    );

    const page2 = await request(app).get("/api/tasks?page=2").set("Authorization", `Bearer ${user.accessToken}`);
    expect(page2.body.tasks).toHaveLength(5);
    expect(page2.body.page).toBe(2);
    expect(page2.body.tasks.map((t: any) => t.title)).toEqual(
      Array.from({ length: 5 }, (_, i) => `task-${i + 10}`)
    );
  });

  it("returns a single page with all 10 tasks when there are exactly 10 (AC8)", async () => {
    const user = await registerUser("ten@example.com");
    for (let i = 0; i < 10; i++) {
      await knex("tasks").insert({ user_id: user.user.id, title: `task-${i}`, due_date: new Date(2026, 0, i + 1) });
    }

    const res = await request(app).get("/api/tasks").set("Authorization", `Bearer ${user.accessToken}`);
    expect(res.body.tasks).toHaveLength(10);
    expect(res.body.totalPages).toBe(1);
  });

  it("splits 11 tasks into 10 on page 1 and 1 on page 2 (AC9)", async () => {
    const user = await registerUser("eleven@example.com");
    for (let i = 0; i < 11; i++) {
      await knex("tasks").insert({ user_id: user.user.id, title: `task-${i}`, due_date: new Date(2026, 0, i + 1) });
    }

    const page1 = await request(app).get("/api/tasks?page=1").set("Authorization", `Bearer ${user.accessToken}`);
    expect(page1.body.tasks).toHaveLength(10);
    expect(page1.body.tasks.map((t: any) => t.title)).toEqual(
      Array.from({ length: 10 }, (_, i) => `task-${i}`)
    );

    const page2 = await request(app).get("/api/tasks?page=2").set("Authorization", `Bearer ${user.accessToken}`);
    expect(page2.body.tasks).toHaveLength(1);
    expect(page2.body.tasks[0].title).toBe("task-10");
  });
});
