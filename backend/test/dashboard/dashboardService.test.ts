import { knex } from "../../src/db/knex";
import { getDashboardForUser } from "../../src/services/dashboardService";
import request from "supertest";
import { createApp } from "../../src/app";
import { VALID_CREDENTIAL } from "../fixtures/credentials";

const app = createApp();

async function registerUser(email: string) {
  const res = await request(app).post("/api/auth/register").send({ email, password: VALID_CREDENTIAL });
  return res.body;
}

function daysFromNow(days: number): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

describe("getDashboardForUser summary counts (AC1, AC10, AC11)", () => {
  it("returns total/completed/pending/overdue counts matching fixture data", async () => {
    const user = await registerUser("summary1@example.com");
    await knex("tasks").insert({ user_id: user.user.id, title: "completed-1", completed: true });
    await knex("tasks").insert({ user_id: user.user.id, title: "completed-2", completed: true });
    await knex("tasks").insert({ user_id: user.user.id, title: "overdue-1", completed: false, due_date: daysFromNow(-2) });
    await knex("tasks").insert({ user_id: user.user.id, title: "future-1", completed: false, due_date: daysFromNow(3) });

    const result = await getDashboardForUser(user.user.id);

    expect(result.totalCount).toBe(4);
    expect(result.completedCount).toBe(2);
    expect(result.pendingCount).toBe(2);
    expect(result.overdueCount).toBe(1);
  });

  it("returns all zero counts and empty upcoming list when the user has no tasks (AC10)", async () => {
    const user = await registerUser("zero1@example.com");
    const result = await getDashboardForUser(user.user.id);

    expect(result.totalCount).toBe(0);
    expect(result.completedCount).toBe(0);
    expect(result.pendingCount).toBe(0);
    expect(result.overdueCount).toBe(0);
    expect(result.upcomingTasks).toEqual([]);
  });

  it("total count equals completed count plus pending count (AC11)", async () => {
    const user = await registerUser("total-sum@example.com");
    await knex("tasks").insert({ user_id: user.user.id, title: "done", completed: true });
    await knex("tasks").insert({ user_id: user.user.id, title: "not-done-1", completed: false });
    await knex("tasks").insert({ user_id: user.user.id, title: "not-done-2", completed: false });

    const result = await getDashboardForUser(user.user.id);

    expect(result.totalCount).toBe(result.completedCount + result.pendingCount);
  });
});

describe("getDashboardForUser overdue count (AC4, AC6, AC12)", () => {
  it("returns zero overdue when there are no incomplete tasks due before today (AC4)", async () => {
    const user = await registerUser("overdue-zero@example.com");
    await knex("tasks").insert({ user_id: user.user.id, title: "future", completed: false, due_date: daysFromNow(2) });

    const result = await getDashboardForUser(user.user.id);
    expect(result.overdueCount).toBe(0);
  });

  it("does not count a task due exactly today as overdue (AC6)", async () => {
    const user = await registerUser("due-today-not-overdue@example.com");
    await knex("tasks").insert({ user_id: user.user.id, title: "due-today", completed: false, due_date: daysFromNow(0) });

    const result = await getDashboardForUser(user.user.id);
    expect(result.overdueCount).toBe(0);
  });

  it("keeps the overdue count from exceeding the pending count (AC12)", async () => {
    const user = await registerUser("overdue-not-exceed@example.com");
    await knex("tasks").insert({ user_id: user.user.id, title: "overdue-1", completed: false, due_date: daysFromNow(-1) });
    await knex("tasks").insert({ user_id: user.user.id, title: "not-overdue", completed: false, due_date: daysFromNow(5) });

    const result = await getDashboardForUser(user.user.id);
    expect(result.overdueCount).toBeLessThanOrEqual(result.pendingCount);
  });
});

describe("getDashboardForUser upcoming preview (AC5, AC7, AC8, AC14, AC15, AC16)", () => {
  it("excludes incomplete tasks with no due date set (AC5)", async () => {
    const user = await registerUser("no-due-date@example.com");
    await knex("tasks").insert({ user_id: user.user.id, title: "no-due", completed: false, due_date: null });

    const result = await getDashboardForUser(user.user.id);
    expect(result.upcomingTasks.map((t) => t.title)).not.toContain("no-due");
    expect(result.overdueCount).toBe(0);
  });

  it("includes a task due exactly 7 days from today (AC7)", async () => {
    const user = await registerUser("exactly-7-days@example.com");
    await knex("tasks").insert({ user_id: user.user.id, title: "due-in-7", completed: false, due_date: daysFromNow(7) });

    const result = await getDashboardForUser(user.user.id);
    expect(result.upcomingTasks.map((t) => t.title)).toContain("due-in-7");
  });

  it("excludes a task due 8 days from today (AC8)", async () => {
    const user = await registerUser("8-days@example.com");
    await knex("tasks").insert({ user_id: user.user.id, title: "due-in-8", completed: false, due_date: daysFromNow(8) });

    const result = await getDashboardForUser(user.user.id);
    expect(result.upcomingTasks.map((t) => t.title)).not.toContain("due-in-8");
  });

  it("shows all qualifying tasks with none omitted when more than 7 are due within 7 days (AC14)", async () => {
    const user = await registerUser("more-than-7@example.com");
    for (let i = 0; i < 10; i++) {
      await knex("tasks").insert({ user_id: user.user.id, title: `task-${i}`, completed: false, due_date: daysFromNow(1) });
    }

    const result = await getDashboardForUser(user.user.id);
    expect(result.upcomingTasks).toHaveLength(10);
  });

  it("includes a task due exactly today in the preview list (AC15)", async () => {
    const user = await registerUser("due-today-included@example.com");
    await knex("tasks").insert({ user_id: user.user.id, title: "due-today", completed: false, due_date: daysFromNow(0) });

    const result = await getDashboardForUser(user.user.id);
    expect(result.upcomingTasks.map((t) => t.title)).toContain("due-today");
  });

  it("orders same-due-date tasks by created_at ascending (AC16)", async () => {
    const user = await registerUser("same-date-order@example.com");
    const dueDate = daysFromNow(2);
    await knex("tasks").insert({
      user_id: user.user.id,
      title: "created-earlier",
      completed: false,
      due_date: dueDate,
      created_at: new Date(Date.now() - 10000),
    });
    await knex("tasks").insert({
      user_id: user.user.id,
      title: "created-later",
      completed: false,
      due_date: dueDate,
      created_at: new Date(Date.now() - 1000),
    });

    const result = await getDashboardForUser(user.user.id);
    const titles = result.upcomingTasks.map((t) => t.title);
    expect(titles).toContain("created-earlier");
    expect(titles).toContain("created-later");
    expect(titles.indexOf("created-earlier")).toBeLessThan(titles.indexOf("created-later"));
  });
});

describe("getDashboardForUser upcoming preview empty state (AC3 service-level)", () => {
  it("returns an empty upcomingTasks array when nothing is due within 7 days", async () => {
    const user = await registerUser("empty-preview@example.com");
    await knex("tasks").insert({ user_id: user.user.id, title: "far-future", completed: false, due_date: daysFromNow(30) });

    const result = await getDashboardForUser(user.user.id);
    expect(result.upcomingTasks).toEqual([]);
  });
});

describe("getDashboardForUser user isolation (AC9)", () => {
  it("reflects only the requesting user's tasks", async () => {
    const userA = await registerUser("isolation-a@example.com");
    const userB = await registerUser("isolation-b@example.com");
    await knex("tasks").insert({ user_id: userA.user.id, title: "a-task", completed: false, due_date: daysFromNow(1) });
    await knex("tasks").insert({ user_id: userB.user.id, title: "b-task", completed: false, due_date: daysFromNow(1) });
    await knex("tasks").insert({ user_id: userB.user.id, title: "b-task-2", completed: true });

    const resultA = await getDashboardForUser(userA.user.id);
    expect(resultA.totalCount).toBe(1);
    expect(resultA.upcomingTasks.map((t) => t.title)).toEqual(["a-task"]);
  });
});
