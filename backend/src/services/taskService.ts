import { knex } from "../db/knex";
import { NotFoundError } from "./errors";

export async function listTasksForUser(userId: string) {
  return knex("tasks").where({ user_id: userId }).select("id", "title", "created_at", "completed");
}

export async function toggleTaskCompletion(userId: string, taskId: string) {
  const task = await knex("tasks").where({ id: taskId, user_id: userId }).first();
  if (!task) {
    throw new NotFoundError();
  }

  const [updated] = await knex("tasks")
    .where({ id: taskId, user_id: userId })
    .update({ completed: !task.completed })
    .returning(["id", "title", "created_at", "completed"]);

  return updated;
}

export async function deleteTask(userId: string, taskId: string) {
  const deletedCount = await knex("tasks").where({ id: taskId, user_id: userId }).del();
  if (deletedCount === 0) {
    throw new NotFoundError();
  }
}
