import { knex } from "../../src/db/knex";
import { logger } from "../../src/utils/logger";
import { createTask, getTaskForUser, updateTask } from "../../src/services/taskService";
import { ForbiddenError } from "../../src/services/errors";

async function createUser(email: string) {
  const [user] = await knex("users").insert({ email, password_hash: "hash" }).returning(["id"]);
  return user.id as string;
}

describe("taskService observability", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("logs a warning with user and task ids when a forbidden read is attempted", async () => {
    const warnSpy = jest.spyOn(logger, "warn").mockImplementation(() => undefined);
    const ownerId = await createUser("owner-obs@example.com");
    const intruderId = await createUser("intruder-obs@example.com");
    const task = await createTask(ownerId, { title: "Owned task" } as any);

    await expect(getTaskForUser(task.id, intruderId)).rejects.toThrow(ForbiddenError);

    expect(warnSpy).toHaveBeenCalledWith(
      "task.authorization_denied",
      expect.objectContaining({ userId: intruderId, taskId: task.id, action: "read" })
    );
  });

  it("logs a warning with user and task ids when a forbidden update is attempted", async () => {
    const warnSpy = jest.spyOn(logger, "warn").mockImplementation(() => undefined);
    const ownerId = await createUser("owner-obs2@example.com");
    const intruderId = await createUser("intruder-obs2@example.com");
    const task = await createTask(ownerId, { title: "Owned task" } as any);

    await expect(updateTask(task.id, intruderId, { title: "Hijack" } as any)).rejects.toThrow(ForbiddenError);

    expect(warnSpy).toHaveBeenCalledWith(
      "task.authorization_denied",
      expect.objectContaining({ userId: intruderId, taskId: task.id, action: "update" })
    );
  });

  it("logs an error when the create insert violates a database constraint", async () => {
    const errorSpy = jest.spyOn(logger, "error").mockImplementation(() => undefined);
    const nonExistentUserId = "00000000-0000-0000-0000-000000000000";

    await expect(createTask(nonExistentUserId, { title: "Orphan task" } as any)).rejects.toThrow();

    expect(errorSpy).toHaveBeenCalledWith("task.create_failed", expect.objectContaining({ userId: nonExistentUserId }));
  });

  it("logs an error when the update fails at the database layer", async () => {
    const ownerId = await createUser("owner-obs3@example.com");
    const task = await createTask(ownerId, { title: "Task to break" } as any);

    const errorSpy = jest.spyOn(logger, "error").mockImplementation(() => undefined);
    const builderProto = Object.getPrototypeOf(knex("tasks"));
    const updateSpy = jest.spyOn(builderProto, "update").mockImplementationOnce(() => {
      throw new Error("simulated database failure");
    });

    await expect(updateTask(task.id, ownerId, { title: "Changed" } as any)).rejects.toThrow("simulated database failure");

    expect(errorSpy).toHaveBeenCalledWith(
      "task.update_failed",
      expect.objectContaining({ userId: ownerId, taskId: task.id })
    );

    updateSpy.mockRestore();
  });
});
