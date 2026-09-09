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

describe("listTasksForUser search (AC1, AC8)", () => {
  it("matches title or description case-insensitively", async () => {
    const user = await registerUser("search1@example.com");
    await knex("tasks").insert({ user_id: user.user.id, title: "Team Meeting" });
    await knex("tasks").insert({ user_id: user.user.id, title: "Groceries", description: "plan the MEETING agenda" });
    await knex("tasks").insert({ user_id: user.user.id, title: "Unrelated" });

    const result = await listTasksForUser(user.user.id, { search: "meeting" });

    expect(result.tasks.map((t: any) => t.title).sort()).toEqual(["Groceries", "Team Meeting"]);
  });

  it("returns full unfiltered list when search is empty or whitespace only", async () => {
    const user = await registerUser("search2@example.com");
    await knex("tasks").insert({ user_id: user.user.id, title: "A" });
    await knex("tasks").insert({ user_id: user.user.id, title: "B" });

    const empty = await listTasksForUser(user.user.id, { search: "" });
    expect(empty.tasks).toHaveLength(2);

    const whitespace = await listTasksForUser(user.user.id, { search: "   " });
    expect(whitespace.tasks).toHaveLength(2);
  });
});
