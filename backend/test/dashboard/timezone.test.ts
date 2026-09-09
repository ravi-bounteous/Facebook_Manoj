import { knex } from "../../src/db/knex";
import { getDashboardForUser } from "../../src/services/dashboardService";
import { Clock } from "../../src/utils/clock";
import request from "supertest";
import { createApp } from "../../src/app";
import { VALID_CREDENTIAL } from "../fixtures/credentials";

const app = createApp();

async function registerUser(email: string) {
  const res = await request(app).post("/api/auth/register").send({ email, password: VALID_CREDENTIAL });
  return res.body;
}

function fixedClock(date: Date): Clock {
  return { now: () => date };
}

describe("getDashboardForUser timezone-aware date calculation (AC17)", () => {
  it("does not flag a task as overdue in the user's timezone when it would be overdue in UTC", async () => {
    const user = await registerUser("tz-overdue@example.com");
    await knex("users").where({ id: user.user.id }).update({ timezone: "Pacific/Kiritimati" });

    // now = 2026-03-11T00:30:00Z is 2026-03-11 in UTC, but 2026-03-11 in Kiritimati too (offset +14h -> 2026-03-11T14:30).
    const now = new Date("2026-03-11T00:30:00Z");
    // due_date = 2026-03-10T09:00:00Z: UTC date is 2026-03-10 (yesterday relative to UTC "now" date 2026-03-11 -> overdue in UTC terms).
    // In Kiritimati (+14h): 2026-03-10T09:00Z + 14h = 2026-03-10T23:00 local -> still 2026-03-10, which is yesterday relative to
    // Kiritimati "today" (2026-03-11), so it is ALSO overdue there. Use a due date that differs instead:
    const dueDate = new Date("2026-03-10T20:00:00Z"); // +14h -> 2026-03-11T10:00 local -> today in Kiritimati, not overdue there

    await knex("tasks").insert({
      user_id: user.user.id,
      title: "overdue-in-utc-not-in-tz",
      completed: false,
      due_date: dueDate,
    });

    const result = await getDashboardForUser(user.user.id, fixedClock(now));

    expect(result.overdueCount).toBe(0);
    expect(result.upcomingTasks.map((t) => t.title)).toContain("overdue-in-utc-not-in-tz");
  });
});
