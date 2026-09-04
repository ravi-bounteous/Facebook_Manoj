import request from "supertest";
import { createApp } from "../../src/app";
import { knex } from "../../src/db/knex";

const app = createApp();

describe("POST /api/auth/register concurrency (AC13, AC14)", () => {
  it("creates only one account and returns duplicate error for the loser", async () => {
    const email = "concurrent@example.com";
    const [res1, res2] = await Promise.all([
      request(app).post("/api/auth/register").send({ email, password: "Passw0rd" }),
      request(app).post("/api/auth/register").send({ email, password: "Passw0rd" }),
    ]);

    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([201, 409]);

    const loser = res1.status === 409 ? res1 : res2;
    expect(loser.body.error).toMatch(/already registered/i);

    const rows = await knex("users").where({ email });
    expect(rows.length).toBe(1);
  });
});
