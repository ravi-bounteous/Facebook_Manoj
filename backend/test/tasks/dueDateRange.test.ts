import { knex } from "../../src/db/knex";
import { listTasksForUser } from "../../src/services/taskService";
import { ValidationError } from "../../src/services/errors";
import request from "supertest";
import { createApp } from "../../src/app";
import { VALID_CREDENTIAL } from "../fixtures/credentials";

const app = createApp();

async function registerUser(email: string) {
  const res = await request(app).post("/api/auth/register").send({ email, password: VALID_CREDENTIAL });
  return res.body;
}

describe("listTasksForUser due-date range (AC3, AC7, AC9)", () => {
  it("returns only tasks with due_date within the inclusive range, excluding null due dates", async () => {
    const user = await registerUser("range1@example.com");
    await knex("tasks").insert({ user_id: user.user.id, title: "before", due_date: new Date("2026-01-04") });
    await knex("tasks").insert({ user_id: user.user.id, title: "inside", due_date: new Date("2026-01-07") });
    await knex("tasks").insert({ user_id: user.user.id, title: "after", due_date: new Date("2026-01-11") });
    await knex("tasks").insert({ user_id: user.user.id, title: "none", due_date: null });

    const result = await listTasksForUser(user.user.id, { dueFrom: "2026-01-05", dueTo: "2026-01-10" });
    expect(result.tasks.map((t: any) => t.title)).toEqual(["inside"]);
  });

  it("includes tasks whose due date falls exactly on the start or end boundary (AC7)", async () => {
    const user = await registerUser("range2@example.com");
    await knex("tasks").insert({ user_id: user.user.id, title: "start-boundary", due_date: new Date("2026-01-05") });
    await knex("tasks").insert({ user_id: user.user.id, title: "end-boundary", due_date: new Date("2026-01-10") });

    const result = await listTasksForUser(user.user.id, { dueFrom: "2026-01-05", dueTo: "2026-01-10" });
    expect(result.tasks.map((t: any) => t.title).sort()).toEqual(["end-boundary", "start-boundary"]);
  });

  it("filters using only dueFrom, including tasks on or after the start date (AC3)", async () => {
    const user = await registerUser("range4@example.com");
    await knex("tasks").insert({ user_id: user.user.id, title: "before", due_date: new Date("2026-01-04") });
    await knex("tasks").insert({ user_id: user.user.id, title: "on-start", due_date: new Date("2026-01-05") });
    await knex("tasks").insert({ user_id: user.user.id, title: "after", due_date: new Date("2026-01-11") });

    const result = await listTasksForUser(user.user.id, { dueFrom: "2026-01-05" });
    expect(result.tasks.map((t: any) => t.title).sort()).toEqual(["after", "on-start"]);
  });

  it("filters using only dueTo, including tasks on or before the end date (AC3)", async () => {
    const user = await registerUser("range5@example.com");
    await knex("tasks").insert({ user_id: user.user.id, title: "before", due_date: new Date("2026-01-04") });
    await knex("tasks").insert({ user_id: user.user.id, title: "on-end", due_date: new Date("2026-01-10") });
    await knex("tasks").insert({ user_id: user.user.id, title: "after", due_date: new Date("2026-01-11") });

    const result = await listTasksForUser(user.user.id, { dueTo: "2026-01-10" });
    expect(result.tasks.map((t: any) => t.title).sort()).toEqual(["before", "on-end"]);
  });

  it("throws ValidationError when start date is after end date (AC9)", async () => {
    const user = await registerUser("range3@example.com");
    await expect(
      listTasksForUser(user.user.id, { dueFrom: "2026-01-10", dueTo: "2026-01-05" })
    ).rejects.toThrow(ValidationError);
  });
});
