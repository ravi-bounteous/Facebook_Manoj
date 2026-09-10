import { knex } from "../../src/db/knex";
import { getDashboardCountsForUser, getDashboardUpcomingForUser } from "../../src/services/taskService";
import request from "supertest";
import { createApp } from "../../src/app";
import { VALID_CREDENTIAL } from "../fixtures/credentials";

const app = createApp();

async function registerUser(email: string) {
  const res = await request(app).post("/api/auth/register").send({ email, password: VALID_CREDENTIAL });
  return res.body;
}

async function getDashboardForUser(userId: string) {
  const [counts, upcoming] = await Promise.all([
    getDashboardCountsForUser(userId),
    getDashboardUpcomingForUser(userId),
  ]);
  return { counts, upcoming };
}

function daysFromToday(days: number): Date {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

describe("getDashboardForUser (AC1-AC21)", () => {
  it("returns correct total/completed/pending/overdue counts (AC1)", async () => {
    const user = await registerUser("dash1@example.com");
    await knex("tasks").insert({ user_id: user.user.id, title: "completed", completed: true });
    await knex("tasks").insert({ user_id: user.user.id, title: "future", due_date: daysFromToday(3) });
    await knex("tasks").insert({ user_id: user.user.id, title: "overdue", due_date: daysFromToday(-2) });

    const dashboard = await getDashboardForUser(user.user.id);
    expect(dashboard.counts).toEqual({ total: 3, completed: 1, pending: 2, overdue: 1 });
  });

  it("returns only incomplete tasks due within the next 7 days ordered by due_date ascending (AC2)", async () => {
    const user = await registerUser("dash2@example.com");
    await knex("tasks").insert({ user_id: user.user.id, title: "day5", due_date: daysFromToday(5) });
    await knex("tasks").insert({ user_id: user.user.id, title: "day1", due_date: daysFromToday(1) });
    await knex("tasks").insert({ user_id: user.user.id, title: "toofar", due_date: daysFromToday(10) });

    const dashboard = await getDashboardForUser(user.user.id);
    expect(dashboard.upcoming.map((t: any) => t.title)).toEqual(["day1", "day5"]);
  });

  it("returns empty upcoming array when nothing is due within 7 days (AC3)", async () => {
    const user = await registerUser("dash3@example.com");
    await knex("tasks").insert({ user_id: user.user.id, title: "toofar", due_date: daysFromToday(20) });

    const dashboard = await getDashboardForUser(user.user.id);
    expect(dashboard.upcoming).toEqual([]);
  });

  it("returns overdue=0 when no incomplete tasks are due before today (AC4)", async () => {
    const user = await registerUser("dash4@example.com");
    await knex("tasks").insert({ user_id: user.user.id, title: "future", due_date: daysFromToday(3) });

    const dashboard = await getDashboardForUser(user.user.id);
    expect(dashboard.counts.overdue).toBe(0);
  });

  it("excludes incomplete tasks with no due date from the upcoming list (AC5)", async () => {
    const user = await registerUser("dash5@example.com");
    await knex("tasks").insert({ user_id: user.user.id, title: "nodate", due_date: null });

    const dashboard = await getDashboardForUser(user.user.id);
    expect(dashboard.upcoming).toEqual([]);
    expect(dashboard.counts.overdue).toBe(0);
  });

  it("does not count a task due exactly today as overdue (AC6)", async () => {
    const user = await registerUser("dash6@example.com");
    await knex("tasks").insert({ user_id: user.user.id, title: "today", due_date: daysFromToday(0) });

    const dashboard = await getDashboardForUser(user.user.id);
    expect(dashboard.counts.overdue).toBe(0);
  });

  it("includes a task due exactly 7 days from today in the upcoming list (AC7)", async () => {
    const user = await registerUser("dash7@example.com");
    await knex("tasks").insert({ user_id: user.user.id, title: "day7", due_date: daysFromToday(7) });

    const dashboard = await getDashboardForUser(user.user.id);
    expect(dashboard.upcoming.map((t: any) => t.title)).toEqual(["day7"]);
  });

  it("excludes a task due 8 days from today from the upcoming list (AC8)", async () => {
    const user = await registerUser("dash8@example.com");
    await knex("tasks").insert({ user_id: user.user.id, title: "day8", due_date: daysFromToday(8) });

    const dashboard = await getDashboardForUser(user.user.id);
    expect(dashboard.upcoming).toEqual([]);
  });

  it("isolates counts and upcoming list per user (AC9)", async () => {
    const userA = await registerUser("dash9a@example.com");
    const userB = await registerUser("dash9b@example.com");
    await knex("tasks").insert({ user_id: userA.user.id, title: "a-upcoming", due_date: daysFromToday(1) });
    await knex("tasks").insert({ user_id: userB.user.id, title: "b-upcoming", due_date: daysFromToday(1) });
    await knex("tasks").insert({ user_id: userB.user.id, title: "b-completed", completed: true });

    const dashboard = await getDashboardForUser(userA.user.id);
    expect(dashboard.counts).toEqual({ total: 1, completed: 0, pending: 1, overdue: 0 });
    expect(dashboard.upcoming.map((t: any) => t.title)).toEqual(["a-upcoming"]);
  });

  it("returns all zero counts for a user with zero tasks (AC10)", async () => {
    const user = await registerUser("dash10@example.com");
    const dashboard = await getDashboardForUser(user.user.id);
    expect(dashboard.counts).toEqual({ total: 0, completed: 0, pending: 0, overdue: 0 });
  });

  it("total equals completed + pending (AC11)", async () => {
    const user = await registerUser("dash11@example.com");
    await knex("tasks").insert({ user_id: user.user.id, title: "c1", completed: true });
    await knex("tasks").insert({ user_id: user.user.id, title: "c2", completed: true });
    await knex("tasks").insert({ user_id: user.user.id, title: "p1", completed: false });

    const dashboard = await getDashboardForUser(user.user.id);
    expect(dashboard.counts.total).toBe(dashboard.counts.completed + dashboard.counts.pending);
  });

  it("overdue count never exceeds pending count (AC12)", async () => {
    const user = await registerUser("dash12@example.com");
    await knex("tasks").insert({ user_id: user.user.id, title: "overdue1", due_date: daysFromToday(-1) });
    await knex("tasks").insert({ user_id: user.user.id, title: "future1", due_date: daysFromToday(2) });

    const dashboard = await getDashboardForUser(user.user.id);
    expect(dashboard.counts.overdue).toBeLessThanOrEqual(dashboard.counts.pending);
  });

  it("returns all qualifying tasks with none omitted when more than 7 are due within 7 days (AC14)", async () => {
    const user = await registerUser("dash14@example.com");
    for (let i = 0; i < 9; i++) {
      await knex("tasks").insert({ user_id: user.user.id, title: `task${i}`, due_date: daysFromToday(1) });
    }

    const dashboard = await getDashboardForUser(user.user.id);
    expect(dashboard.upcoming.length).toBe(9);
  });

  it("includes a task due today in the upcoming list (AC15)", async () => {
    const user = await registerUser("dash15@example.com");
    await knex("tasks").insert({ user_id: user.user.id, title: "today", due_date: daysFromToday(0) });

    const dashboard = await getDashboardForUser(user.user.id);
    expect(dashboard.upcoming.map((t: any) => t.title)).toEqual(["today"]);
  });

  it("orders same-due-date tasks by created_at ascending (AC16)", async () => {
    const user = await registerUser("dash16@example.com");
    const dueDate = daysFromToday(2);
    await knex("tasks").insert({
      user_id: user.user.id,
      title: "earlier",
      due_date: dueDate,
      created_at: new Date("2026-01-01T00:00:00Z"),
    });
    await knex("tasks").insert({
      user_id: user.user.id,
      title: "later",
      due_date: dueDate,
      created_at: new Date("2026-01-02T00:00:00Z"),
    });

    const dashboard = await getDashboardForUser(user.user.id);
    expect(dashboard.upcoming.map((t: any) => t.title)).toEqual(["earlier", "later"]);
  });

  it("computes overdue and upcoming using the user's stored profile time zone (AC17)", async () => {
    const user = await registerUser("dash17@example.com");
    await knex("users").where({ id: user.user.id }).update({ timezone: "Pacific/Kiritimati" });

    const now = new Date();
    const dueDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 0, 0));
    await knex("tasks").insert({ user_id: user.user.id, title: "tz-task", due_date: dueDate });

    const dashboard = await getDashboardForUser(user.user.id);
    expect(dashboard.counts.overdue).toBe(0);
  });

  it("orders same-due-date same-created_at tasks by ascending task id (AC21)", async () => {
    const user = await registerUser("dash21@example.com");
    const dueDate = daysFromToday(3);
    const createdAt = new Date("2026-01-01T00:00:00Z");
    const [task1] = await knex("tasks")
      .insert({ user_id: user.user.id, title: "first", due_date: dueDate, created_at: createdAt })
      .returning("*");
    const [task2] = await knex("tasks")
      .insert({ user_id: user.user.id, title: "second", due_date: dueDate, created_at: createdAt })
      .returning("*");
    const [lowerId, higherId] = [task1.id, task2.id].sort();

    const dashboard = await getDashboardForUser(user.user.id);
    const ids = dashboard.upcoming.map((t: any) => t.id);
    expect(ids.indexOf(lowerId)).toBeLessThan(ids.indexOf(higherId));
  });
});

describe("GET /api/tasks/dashboard/counts and /api/tasks/dashboard/upcoming routes (AC13, AC19)", () => {
  it("returns 401 for unauthenticated requests to the counts route", async () => {
    const res = await request(app).get("/api/tasks/dashboard/counts");
    expect(res.status).toBe(401);
  });

  it("returns 401 for unauthenticated requests to the upcoming route", async () => {
    const res = await request(app).get("/api/tasks/dashboard/upcoming");
    expect(res.status).toBe(401);
  });

  it("returns counts for the authenticated user from the counts route", async () => {
    const user = await registerUser("dashroute1@example.com");
    await knex("tasks").insert({ user_id: user.user.id, title: "task1", due_date: daysFromToday(1) });

    const res = await request(app)
      .get("/api/tasks/dashboard/counts")
      .set("Authorization", `Bearer ${user.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.counts.total).toBe(1);
  });

  it("returns upcoming tasks for the authenticated user from the upcoming route", async () => {
    const user = await registerUser("dashroute2@example.com");
    await knex("tasks").insert({ user_id: user.user.id, title: "task1", due_date: daysFromToday(1) });

    const res = await request(app)
      .get("/api/tasks/dashboard/upcoming")
      .set("Authorization", `Bearer ${user.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.upcoming.length).toBe(1);
  });

  it("allows the counts and upcoming routes to be called and fail independently (AC19)", async () => {
    const user = await registerUser("dashroute3@example.com");
    await knex("tasks").insert({ user_id: user.user.id, title: "task1", due_date: daysFromToday(1) });

    const countsRes = await request(app)
      .get("/api/tasks/dashboard/counts")
      .set("Authorization", `Bearer ${user.accessToken}`);
    const upcomingRes = await request(app)
      .get("/api/tasks/dashboard/upcoming")
      .set("Authorization", `Bearer invalid-token`);

    expect(countsRes.status).toBe(200);
    expect(upcomingRes.status).toBe(401);
  });
});
