import { knex } from "../db/knex";
import { NotFoundError } from "./errors";

export const SORTABLE_COLUMNS = ["due_date", "priority", "created_at"] as const;
export type SortColumn = (typeof SORTABLE_COLUMNS)[number];
export type SortDirection = "asc" | "desc";

const PAGE_SIZE = 10;

export interface ListTasksOptions {
  sortBy?: string;
  sortDir?: string;
  page?: number;
}

export interface ListTasksResult {
  tasks: any[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export function isSortColumn(value: unknown): value is SortColumn {
  return typeof value === "string" && (SORTABLE_COLUMNS as readonly string[]).includes(value);
}

export function isSortDirection(value: unknown): value is SortDirection {
  return value === "asc" || value === "desc";
}

export async function listTasksForUser(userId: string, options: ListTasksOptions = {}): Promise<ListTasksResult> {
  const sortBy: SortColumn = isSortColumn(options.sortBy) ? options.sortBy : "due_date";
  const sortDir: SortDirection = isSortDirection(options.sortDir) ? options.sortDir : "asc";
  const page = options.page && options.page > 0 ? Math.floor(options.page) : 1;

  const [{ count }] = await knex("tasks").where({ user_id: userId }).count<{ count: string }[]>("id as count");
  const totalCount = Number(count);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const query = knex("tasks")
    .where({ user_id: userId })
    .select("id", "title", "due_date", "priority", "created_at", "completed");

  if (sortBy === "priority") {
    query.orderByRaw(
      `CASE priority WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 WHEN 'Low' THEN 3 ELSE 4 END ${sortDir === "asc" ? "ASC" : "DESC"}`
    );
  } else if (sortBy === "due_date") {
    query.orderByRaw(`due_date IS NULL ASC`).orderBy("due_date", sortDir);
  } else {
    query.orderBy(sortBy, sortDir);
  }

  if (sortBy !== "created_at") {
    query.orderBy("created_at", "asc");
  }

  query.limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE);

  const tasks = await query;

  return { tasks, page, pageSize: PAGE_SIZE, totalCount, totalPages };
}

export async function toggleTaskCompletion(userId: string, taskId: string) {
  const [updated] = await knex("tasks")
    .where({ id: taskId, user_id: userId })
    .update({ completed: knex.raw("NOT completed") })
    .returning(["id", "title", "due_date", "priority", "created_at", "completed"]);

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
