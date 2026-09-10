import { getDashboardForUser } from "../../src/services/dashboardService";
import request from "supertest";
import { createApp } from "../../src/app";
import { VALID_CREDENTIAL } from "../fixtures/credentials";

const app = createApp();

async function registerUser(email: string) {
  const res = await request(app).post("/api/auth/register").send({ email, password: VALID_CREDENTIAL });
  return res.body;
}

describe("getDashboardForUser zero tasks (AC10)", () => {
  it("returns all zero counts and an empty upcomingTasks list when the user has no tasks", async () => {
    const user = await registerUser("zerotasks1@example.com");

    const result = await getDashboardForUser(user.user.id);

    expect(result.totalCount).toBe(0);
    expect(result.completedCount).toBe(0);
    expect(result.pendingCount).toBe(0);
    expect(result.overdueCount).toBe(0);
    expect(result.upcomingTasks).toEqual([]);
  });
});
