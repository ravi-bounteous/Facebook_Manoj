import request from "supertest";
import { createApp } from "../../src/app";
import { logger } from "../../src/utils/logger";
import { VALID_CREDENTIAL } from "../fixtures/credentials";

const app = createApp();

async function registerUser(email: string) {
  const res = await request(app).post("/api/auth/register").send({ email, password: VALID_CREDENTIAL });
  return res.body.accessToken as string;
}

describe("task routes observability", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("logs a request event with operation, status and duration for a successful list request", async () => {
    const infoSpy = jest.spyOn(logger, "info").mockImplementation(() => undefined);
    const token = await registerUser("obs-route1@example.com");

    await request(app).get("/api/tasks").set("Authorization", `Bearer ${token}`);

    expect(infoSpy).toHaveBeenCalledWith(
      "task.request",
      expect.objectContaining({ operation: "list", status: 200, durationMs: expect.any(Number) })
    );
    const [, fields] = infoSpy.mock.calls.find(([event]) => event === "task.request")!;
    expect(fields).not.toHaveProperty("userId");
    expect(fields).not.toHaveProperty("taskId");
  });

  it("logs a request event with a 404 status for a get on a missing task", async () => {
    const infoSpy = jest.spyOn(logger, "info").mockImplementation(() => undefined);
    const token = await registerUser("obs-route2@example.com");
    const missingId = "00000000-0000-0000-0000-000000000000";

    await request(app).get(`/api/tasks/${missingId}`).set("Authorization", `Bearer ${token}`);

    expect(infoSpy).toHaveBeenCalledWith(
      "task.request",
      expect.objectContaining({ operation: "get", status: 404, durationMs: expect.any(Number) })
    );
  });
});
