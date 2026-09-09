import request from "supertest";
import { createApp } from "../../src/app";
import { knex } from "../../src/db/knex";
import { VALID_CREDENTIAL } from "../fixtures/credentials";

const app = createApp();

async function registerUser(email: string) {
  const res = await request(app).post("/api/auth/register").send({ email, password: VALID_CREDENTIAL });
  return res.body;
}

describe("GET /api/tasks/filter-options (AC11)", () => {
  it("returns the distinct tag and category values for the current user's tasks", async () => {
    const user = await registerUser("filteroptions@example.com");
    await knex("tasks").insert({
      user_id: user.user.id,
      title: "t1",
      category: "Work",
      tags: knex.raw("ARRAY['urgent','billing']"),
    });
    await knex("tasks").insert({
      user_id: user.user.id,
      title: "t2",
      category: "Personal",
      tags: knex.raw("ARRAY['urgent']"),
    });

    const res = await request(app)
      .get("/api/tasks/filter-options")
      .set("Authorization", `Bearer ${user.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.categories.sort()).toEqual(["Personal", "Work"]);
    expect(res.body.tags.sort()).toEqual(["billing", "urgent"]);
  });

  it("excludes other users' categories and tags", async () => {
    const userA = await registerUser("filteroptions-a@example.com");
    const userB = await registerUser("filteroptions-b@example.com");

    await knex("tasks").insert({
      user_id: userA.user.id,
      title: "a1",
      category: "Work",
      tags: knex.raw("ARRAY['urgent']"),
    });
    await knex("tasks").insert({
      user_id: userB.user.id,
      title: "b1",
      category: "SecretCategory",
      tags: knex.raw("ARRAY['secret-tag']"),
    });

    const res = await request(app)
      .get("/api/tasks/filter-options")
      .set("Authorization", `Bearer ${userA.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.categories).toEqual(["Work"]);
    expect(res.body.tags).toEqual(["urgent"]);
    expect(res.body.categories).not.toContain("SecretCategory");
    expect(res.body.tags).not.toContain("secret-tag");
  });
});
