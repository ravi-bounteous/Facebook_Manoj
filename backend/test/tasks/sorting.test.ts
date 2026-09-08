import request from "supertest";
import { createApp } from "../../src/app";
import { knex } from "../../src/db/knex";
import { VALID_CREDENTIAL } from "../fixtures/credentials";

const app = createApp();

async function registerUser(email: string) {
  const res = await request(app).post("/api/auth/register").send({ email, password: VALID_CREDENTIAL });
  return res.body;
}

describe("GET /api/tasks sorting", () => {
  it("toggles sort direction on repeated requests for the same column (AC3, AC10)", async () => {
    const user = await registerUser("sort@example.com");
    await knex("tasks").insert({ user_id: user.user.id, title: "low", priority: "Low" });
    await knex("tasks").insert({ user_id: user.user.id, title: "high", priority: "High" });

    const asc = await request(app).get("/api/tasks?sortBy=priority&sortDir=asc").set("Authorization", `Bearer ${user.accessToken}`);
    expect(asc.body.tasks.map((t: any) => t.title)).toEqual(["high", "low"]);

    const desc = await request(app).get("/api/tasks?sortBy=priority&sortDir=desc").set("Authorization", `Bearer ${user.accessToken}`);
    expect(desc.body.tasks.map((t: any) => t.title)).toEqual(["low", "high"]);
  });

  it("preserves sort column/direction when navigating to a different page (AC15)", async () => {
    const user = await registerUser("sortpage@example.com");
    for (let i = 0; i < 11; i++) {
      await knex("tasks").insert({ user_id: user.user.id, title: `task-${i}`, due_date: new Date(2026, 0, 11 - i) });
    }

    const page1 = await request(app)
      .get("/api/tasks?sortBy=due_date&sortDir=desc&page=1")
      .set("Authorization", `Bearer ${user.accessToken}`);
    expect(page1.body.tasks[0].title).toBe("task-0");

    const page2 = await request(app)
      .get("/api/tasks?sortBy=due_date&sortDir=desc&page=2")
      .set("Authorization", `Bearer ${user.accessToken}`);
    expect(page2.body.tasks).toHaveLength(1);
    expect(page2.body.tasks[0].title).toBe("task-10");
  });

  it("ignores unrecognized sortBy values and falls back to the default", async () => {
    const user = await registerUser("badsort@example.com");
    await knex("tasks").insert({ user_id: user.user.id, title: "b", due_date: new Date("2026-01-02") });
    await knex("tasks").insert({ user_id: user.user.id, title: "a", due_date: new Date("2026-01-01") });

    const res = await request(app).get("/api/tasks?sortBy=not-a-column").set("Authorization", `Bearer ${user.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.tasks).toHaveLength(2);
    expect(new Date(res.body.tasks[0].due_date).getTime()).toBeLessThanOrEqual(new Date(res.body.tasks[1].due_date).getTime());
    expect(res.body.tasks.map((t: any) => t.title)).toEqual(["a", "b"]);
  });
});
