import { knex } from "../../src/db/knex";
import { listTasksForUser } from "../../src/services/taskService";
import request from "supertest";
import { createApp } from "../../src/app";
import { VALID_CREDENTIAL } from "../fixtures/credentials";

const app = createApp();

async function registerUser(email: string) {
  const res = await request(app).post("/api/auth/register").send({ email, password: VALID_CREDENTIAL });
  return res.body;
}

describe("listTasksForUser filters (AC2, AC4, AC11, AC12, AC13)", () => {
  it("filters by status", async () => {
    const user = await registerUser("filter1@example.com");
    await knex("tasks").insert({ user_id: user.user.id, title: "done", completed: true });
    await knex("tasks").insert({ user_id: user.user.id, title: "todo", completed: false });

    const completed = await listTasksForUser(user.user.id, { status: "completed" });
    expect(completed.tasks.map((t: any) => t.title)).toEqual(["done"]);

    const incomplete = await listTasksForUser(user.user.id, { status: "incomplete" });
    expect(incomplete.tasks.map((t: any) => t.title)).toEqual(["todo"]);
  });

  it("treats an empty status as no filter, consistent with an empty priority list", async () => {
    const user = await registerUser("filter1b@example.com");
    await knex("tasks").insert({ user_id: user.user.id, title: "done", completed: true });
    await knex("tasks").insert({ user_id: user.user.id, title: "todo", completed: false });

    const emptyStatus = await listTasksForUser(user.user.id, { status: "" });
    expect(emptyStatus.tasks.map((t: any) => t.title).sort()).toEqual(["done", "todo"]);

    const emptyPriority = await listTasksForUser(user.user.id, { priority: [] });
    expect(emptyPriority.tasks.map((t: any) => t.title).sort()).toEqual(["done", "todo"]);
  });

  it("filters by a single priority", async () => {
    const user = await registerUser("filter2@example.com");
    await knex("tasks").insert({ user_id: user.user.id, title: "hi", priority: "High" });
    await knex("tasks").insert({ user_id: user.user.id, title: "lo", priority: "Low" });

    const result = await listTasksForUser(user.user.id, { priority: ["High"] });
    expect(result.tasks.map((t: any) => t.title)).toEqual(["hi"]);
  });

  it("filters by multiple priorities (OR) excluding Medium (AC12)", async () => {
    const user = await registerUser("filter3@example.com");
    await knex("tasks").insert({ user_id: user.user.id, title: "hi", priority: "High" });
    await knex("tasks").insert({ user_id: user.user.id, title: "lo", priority: "Low" });
    await knex("tasks").insert({ user_id: user.user.id, title: "med", priority: "Medium" });

    const result = await listTasksForUser(user.user.id, { priority: ["Low", "High"] });
    expect(result.tasks.map((t: any) => t.title).sort()).toEqual(["hi", "lo"]);
  });

  it("filters by tag exact match (AC11)", async () => {
    const user = await registerUser("filter4@example.com");
    await knex("tasks").insert({ user_id: user.user.id, title: "urgent-task", tags: knex.raw("ARRAY['urgent']") });
    await knex("tasks").insert({ user_id: user.user.id, title: "followup-task", tags: knex.raw("ARRAY['urgent-followup']") });

    const result = await listTasksForUser(user.user.id, { tag: ["urgent"] });
    expect(result.tasks.map((t: any) => t.title)).toEqual(["urgent-task"]);
  });

  it("filters by multiple tags (OR within tag filter) (AC13)", async () => {
    const user = await registerUser("filter5@example.com");
    await knex("tasks").insert({ user_id: user.user.id, title: "urgent-task", tags: knex.raw("ARRAY['urgent']") });
    await knex("tasks").insert({ user_id: user.user.id, title: "billing-task", tags: knex.raw("ARRAY['billing']") });
    await knex("tasks").insert({ user_id: user.user.id, title: "other-task", tags: knex.raw("ARRAY['other']") });

    const result = await listTasksForUser(user.user.id, { tag: ["urgent", "billing"] });
    expect(result.tasks.map((t: any) => t.title).sort()).toEqual(["billing-task", "urgent-task"]);
  });

  it("filters by category exact match (AC2, AC11)", async () => {
    const user = await registerUser("filter6@example.com");
    await knex("tasks").insert({ user_id: user.user.id, title: "work-task", category: "Work" });
    await knex("tasks").insert({ user_id: user.user.id, title: "personal-task", category: "Personal" });

    const result = await listTasksForUser(user.user.id, { category: "Work" });
    expect(result.tasks.map((t: any) => t.title)).toEqual(["work-task"]);
  });

  it("combines search + status + priority + tag + category + due-date range with AND semantics (AC4)", async () => {
    const user = await registerUser("filter7@example.com");
    await knex("tasks").insert({
      user_id: user.user.id,
      title: "Team Meeting",
      description: "quarterly planning",
      completed: false,
      priority: "High",
      tags: knex.raw("ARRAY['urgent']"),
      category: "Work",
      due_date: new Date("2026-01-07"),
    });
    await knex("tasks").insert({
      user_id: user.user.id,
      title: "Team Meeting",
      description: "quarterly planning",
      completed: true,
      priority: "High",
      tags: knex.raw("ARRAY['urgent']"),
      category: "Work",
      due_date: new Date("2026-01-07"),
    });
    await knex("tasks").insert({
      user_id: user.user.id,
      title: "Unrelated",
      completed: false,
      priority: "Low",
      category: "Personal",
      due_date: new Date("2026-02-01"),
    });

    const result = await listTasksForUser(user.user.id, {
      search: "meeting",
      status: "incomplete",
      priority: ["High"],
      tag: ["urgent"],
      category: "Work",
      dueFrom: "2026-01-05",
      dueTo: "2026-01-10",
    });

    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].title).toBe("Team Meeting");
  });

  it("filters by multiple priorities passed as repeated query params over HTTP (AC12)", async () => {
    const registerRes = await request(app)
      .post("/api/auth/register")
      .send({ email: "filter8@example.com", password: VALID_CREDENTIAL });
    const user = registerRes.body;

    await knex("tasks").insert({ user_id: user.user.id, title: "hi", priority: "High" });
    await knex("tasks").insert({ user_id: user.user.id, title: "lo", priority: "Low" });
    await knex("tasks").insert({ user_id: user.user.id, title: "med", priority: "Medium" });

    const res = await request(app)
      .get("/api/tasks?priority=High&priority=Low")
      .set("Authorization", `Bearer ${user.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.tasks.map((t: any) => t.title).sort()).toEqual(["hi", "lo"]);
  });
});
