import { knex } from "../db/knex";
import { NotFoundError } from "./errors";

export async function listTasksForUser(userId: string) {
  return knex("tasks").where({ user_id: userId }).select("id", "title", "created_at", "completed");
}

export async function toggleTaskCompletion(userId: string, taskId: string) {
  const [updated] = await knex("tasks")
    .where({ id: taskId, user_id: userId })
    .update({ completed: knex.raw("NOT completed") })
    .returning(["id", "title", "created_at", "completed"]);

  if (!updated) {
    throw new NotFoundError();
  }

  console.log(
    JSON.stringify({
      event: "task.toggle",
      userId,
      taskId,
      completed: updated.completed,
      timestamp: new Date().toISOString(),
    })
  );

  return updated;
}

export async function deleteTask(userId: string, taskId: string) {
  const deletedCount = await knex("tasks").where({ id: taskId, user_id: userId }).del();
  if (deletedCount === 0) {
    throw new NotFoundError();
  }

  console.log(
    JSON.stringify({
      event: "task.delete",
      userId,
      taskId,
      timestamp: new Date().toISOString(),
    })
  );
}
