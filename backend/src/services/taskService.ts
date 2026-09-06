import { knex } from "../db/knex";
import { ForbiddenError, NotFoundError } from "./errors";
import { TaskInput, validateTaskInput } from "./taskValidator";

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
  return task;
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
    throw new ForbiddenError();
  }

  const validated = validateTaskInput(input);
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
  return updated;
}
