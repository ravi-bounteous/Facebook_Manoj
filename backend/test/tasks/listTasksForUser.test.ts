import { knex } from "../../src/db/knex";
import { listTasksForUser } from "../../src/services/taskService";
import { v4 as uuid } from "uuid";

async function createUser() {
  const id = uuid();
  await knex("users").insert({
    id,
    email: `${id}@example.com`,
    password_hash: "hash",
  });
  return id;
}

async function createTask(userId: string, overrides: Record<string, unknown> = {}) {
  const id = uuid();
  await knex("tasks").insert({ id, user_id: userId, title: "task", ...overrides });
  return id;
}

describe("listTasksForUser", () => {
  it("defaults to sorting by due_date ascending (AC1)", async () => {
    const userId = await createUser();
    await createTask(userId, { title: "later", due_date: new Date("2026-02-01") });
    await createTask(userId, { title: "sooner", due_date: new Date("2026-01-01") });

    const result = await listTasksForUser(userId, {});

    expect(result.tasks.map((t: any) => t.title)).toEqual(["sooner", "later"]);
  });

  it("paginates to a fixed page size of 10 (AC2, AC8, AC9)", async () => {
    const userId = await createUser();
    for (let i = 0; i < 11; i++) {
      await createTask(userId, { title: `task-${i}`, due_date: new Date(2026, 0, i + 1) });
    }

    const page1 = await listTasksForUser(userId, { page: 1 });
    expect(page1.tasks).toHaveLength(10);
    expect(page1.totalCount).toBe(11);
    expect(page1.totalPages).toBe(2);

    const page2 = await listTasksForUser(userId, { page: 2 });
    expect(page2.tasks).toHaveLength(1);
  });

  it("with exactly 10 tasks, yields a single page (AC8)", async () => {
    const userId = await createUser();
    for (let i = 0; i < 10; i++) {
      await createTask(userId, { title: `task-${i}`, due_date: new Date(2026, 0, i + 1) });
    }

    const page1 = await listTasksForUser(userId, { page: 1 });
    expect(page1.tasks).toHaveLength(10);
    expect(page1.totalPages).toBe(1);
  });

  it("sorts by priority High, Medium, Low ascending (AC11)", async () => {
    const userId = await createUser();
    await createTask(userId, { title: "low", priority: "Low" });
    await createTask(userId, { title: "high", priority: "High" });
    await createTask(userId, { title: "medium", priority: "Medium" });

    const result = await listTasksForUser(userId, { sortBy: "priority", sortDir: "asc" });

    expect(result.tasks.map((t: any) => t.title)).toEqual(["high", "medium", "low"]);
  });

  it("toggles direction on repeated same-column requests (AC3, AC10, AC15)", async () => {
    const userId = await createUser();
    await createTask(userId, { title: "a", priority: "Low" });
    await createTask(userId, { title: "b", priority: "High" });

    const asc = await listTasksForUser(userId, { sortBy: "priority", sortDir: "asc" });
    expect(asc.tasks.map((t: any) => t.title)).toEqual(["b", "a"]);

    const desc = await listTasksForUser(userId, { sortBy: "priority", sortDir: "desc" });
    expect(desc.tasks.map((t: any) => t.title)).toEqual(["a", "b"]);
  });

  it("places null due_date tasks at the end for both asc and desc (AC12)", async () => {
    const userId = await createUser();
    await createTask(userId, { title: "no-date" });
    await createTask(userId, { title: "dated", due_date: new Date("2026-01-01") });

    const asc = await listTasksForUser(userId, { sortBy: "due_date", sortDir: "asc" });
    expect(asc.tasks.map((t: any) => t.title)).toEqual(["dated", "no-date"]);

    const desc = await listTasksForUser(userId, { sortBy: "due_date", sortDir: "desc" });
    expect(desc.tasks.map((t: any) => t.title)).toEqual(["dated", "no-date"]);
  });

  it("tie-breaks equal sort-column values by created_at ascending (AC13)", async () => {
    const userId = await createUser();
    const firstId = await createTask(userId, { title: "first", priority: "Medium", created_at: new Date("2026-01-01") });
    const secondId = await createTask(userId, { title: "second", priority: "Medium", created_at: new Date("2026-01-02") });

    const result = await listTasksForUser(userId, { sortBy: "priority", sortDir: "asc" });
    expect(result.tasks.map((t: any) => t.id)).toEqual([firstId, secondId]);
  });

  it("sorts by created_at when it is the requested primary sort column", async () => {
    const userId = await createUser();
    await createTask(userId, { title: "second", created_at: new Date("2026-01-02") });
    await createTask(userId, { title: "first", created_at: new Date("2026-01-01") });

    const result = await listTasksForUser(userId, { sortBy: "created_at", sortDir: "desc" });

    expect(result.tasks.map((t: any) => t.title)).toEqual(["second", "first"]);
  });

  it("only returns tasks belonging to the requesting user", async () => {
    const userA = await createUser();
    const userB = await createUser();
    await createTask(userA, { title: "A's task" });
    await createTask(userB, { title: "B's task" });

    const result = await listTasksForUser(userA, {});
    expect(result.tasks.map((t: any) => t.title)).toEqual(["A's task"]);
  });
});
