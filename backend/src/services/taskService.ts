import { knex } from "../db/knex";
import { ForbiddenError, NotFoundError } from "./errors";
import { TaskInput, validateTaskInput } from "./taskValidator";
import { logger } from "../utils/logger";

const TASK_COLUMNS = [
  "id",
  "title",
  "description",
  "due_date",
  "priority",
  "tags",
  "category",
  "created_at",
  "updated_at",
];

export async function listTasksForUser(userId: string) {
  return knex("tasks").where({ user_id: userId }).select(TASK_COLUMNS);
}

export async function createTask(userId: string, input: TaskInput) {
  const validated = validateTaskInput(input);
  try {
    const [task] = await knex("tasks")
      .insert({
        user_id: userId,
        title: validated.title,
        description: validated.description,
        due_date: validated.due_date,
        priority: validated.priority,
        tags: JSON.stringify(validated.tags),
        category: validated.category,
      })
      .returning(TASK_COLUMNS);
    logger.info("task.created");
    return task;
  } catch (err) {
    logger.error("task.create_failed", { userId, error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

async function findTaskById(taskId: string) {
  return knex("tasks").where({ id: taskId }).first();
}

export async function getTaskForUser(taskId: string, userId: string) {
  const task = await findTaskById(taskId);
  if (!task) {
    throw new NotFoundError();
  }
  if (task.user_id !== userId) {
    logger.warn("task.authorization_denied", { userId, taskId, action: "read" });
    throw new ForbiddenError();
  }
  return task;
}

export async function updateTask(taskId: string, userId: string, input: TaskInput) {
  const task = await findTaskById(taskId);
  if (!task) {
    throw new NotFoundError();
  }
  if (task.user_id !== userId) {
    logger.warn("task.authorization_denied", { userId, taskId, action: "update" });
    throw new ForbiddenError();
  }

  const validated = validateTaskInput(input);
  try {
    const [updated] = await knex("tasks")
      .where({ id: taskId })
      .update({
        title: validated.title,
        description: validated.description,
        due_date: validated.due_date,
        priority: validated.priority,
        tags: JSON.stringify(validated.tags),
        category: validated.category,
        updated_at: knex.fn.now(),
      })
      .returning(TASK_COLUMNS);
    logger.info("task.updated");
    return updated;
  } catch (err) {
    logger.error("task.update_failed", { userId, taskId, error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}
