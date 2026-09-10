import { knex } from "../db/knex";
import { NotFoundError, ValidationError } from "./errors";

export const SORTABLE_COLUMNS = ["due_date", "priority", "created_at"] as const;
export type SortColumn = (typeof SORTABLE_COLUMNS)[number];
export type SortDirection = "asc" | "desc";

const PAGE_SIZE = 10;
const VALID_PRIORITIES = ["High", "Medium", "Low"];
const VALID_STATUSES = ["completed", "incomplete"];

export interface ListTasksOptions {
  sortBy?: string;
  sortDir?: string;
  page?: number;
  search?: string;
  status?: string;
  priority?: string[];
  tag?: string[];
  category?: string;
  dueFrom?: string;
  dueTo?: string;
}

function isValidDateString(value: string): boolean {
  return !Number.isNaN(new Date(value).getTime());
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

function applyFilters(query: ReturnType<typeof knex>, userId: string, options: ListTasksOptions) {
  query.where({ user_id: userId });

  const search = options.search?.trim();
  if (search) {
    const escapedSearch = search.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
    query.where((builder) => {
      builder
        .whereRaw("title ILIKE ? ESCAPE '\\'", [`%${escapedSearch}%`])
        .orWhereRaw("description ILIKE ? ESCAPE '\\'", [`%${escapedSearch}%`]);
    });
  }

  if (options.status === "completed") {
    query.where({ completed: true });
  } else if (options.status === "incomplete") {
    query.where({ completed: false });
  }

  if (options.priority && options.priority.length > 0) {
    query.whereIn("priority", options.priority);
  }

  if (options.tag && options.tag.length > 0) {
    query.whereRaw("tags && ?::text[]", [options.tag]);
  }

  if (options.category) {
    query.where({ category: options.category });
  }

  if (options.dueFrom || options.dueTo) {
    if (options.dueFrom && options.dueTo && new Date(options.dueFrom).getTime() > new Date(options.dueTo).getTime()) {
      throw new ValidationError("dueFrom must not be after dueTo");
    }
    if (options.dueFrom) {
      query.whereRaw("(due_date AT TIME ZONE 'UTC')::date >= ?", [options.dueFrom]);
    }
    if (options.dueTo) {
      query.whereRaw("(due_date AT TIME ZONE 'UTC')::date <= ?", [options.dueTo]);
    }
  }
}

export async function listTasksForUser(userId: string, options: ListTasksOptions = {}): Promise<ListTasksResult> {
  const sortBy: SortColumn = isSortColumn(options.sortBy) ? options.sortBy : "due_date";
  const sortDir: SortDirection = isSortDirection(options.sortDir) ? options.sortDir : "asc";
  const page = options.page && options.page > 0 ? Math.floor(options.page) : 1;

  if (options.dueFrom && !isValidDateString(options.dueFrom)) {
    throw new ValidationError("Invalid dueFrom date");
  }
  if (options.dueTo && !isValidDateString(options.dueTo)) {
    throw new ValidationError("Invalid dueTo date");
  }
  if (options.priority) {
    for (const p of options.priority) {
      if (!VALID_PRIORITIES.includes(p)) {
        throw new ValidationError("Invalid priority value");
      }
    }
  }
  if (options.status !== undefined && options.status !== "" && !VALID_STATUSES.includes(options.status)) {
    throw new ValidationError("Invalid status value");
  }

  const countQuery = knex("tasks");
  applyFilters(countQuery, userId, options);
  const [{ count }] = await countQuery.count<{ count: string }[]>("id as count");
  const totalCount = Number(count);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const query = knex("tasks").select("id", "title", "due_date", "priority", "created_at", "completed");
  applyFilters(query, userId, options);

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

export async function listFilterOptionsForUser(userId: string): Promise<{ categories: string[]; tags: string[] }> {
  let categoryRows: { category: string }[];
  try {
    categoryRows = await knex("tasks").where({ user_id: userId }).whereNotNull("category").distinct("category");
  } catch (err) {
    console.error(
      JSON.stringify({
        event: "tasks.filterOptions.categoryQuery.error",
        userId,
        error: err instanceof Error ? err.message : String(err),
      })
    );
    throw err;
  }

  let tagRows: { tag: string }[];
  try {
    tagRows = await knex("tasks")
      .where({ user_id: userId })
      .whereNotNull("tags")
      .select(knex.raw("DISTINCT unnest(tags) as tag"));
  } catch (err) {
    console.error(
      JSON.stringify({
        event: "tasks.filterOptions.tagQuery.error",
        userId,
        error: err instanceof Error ? err.message : String(err),
      })
    );
    throw err;
  }

  const categories = categoryRows.map((row) => row.category);
  const tags = tagRows.map((row) => row.tag);

  console.log(
    JSON.stringify({
      event: "tasks.filterOptions.queried",
      userId,
      categoryCount: categories.length,
      tagCount: tags.length,
    })
  );

  return { categories, tags };
}

export interface DashboardCounts {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
}

export interface DashboardResult {
  counts: DashboardCounts;
  upcoming: any[];
}

export async function getDashboardForUser(userId: string): Promise<DashboardResult> {
  const user = await knex("users").where({ id: userId }).select("timezone").first();
  const timeZone = user?.timezone ?? "UTC";

  const [row] = await knex("tasks")
    .where({ user_id: userId })
    .select(
      knex.raw("COUNT(*)::int as total"),
      knex.raw("COUNT(*) FILTER (WHERE completed)::int as completed"),
      knex.raw("COUNT(*) FILTER (WHERE NOT completed)::int as pending"),
      knex.raw(
        "COUNT(*) FILTER (WHERE NOT completed AND due_date IS NOT NULL AND (due_date AT TIME ZONE ?)::date < (now() AT TIME ZONE ?)::date)::int as overdue",
        [timeZone, timeZone]
      )
    );

  const upcoming = await knex("tasks")
    .where({ user_id: userId, completed: false })
    .whereNotNull("due_date")
    .whereRaw("(due_date AT TIME ZONE ?)::date >= (now() AT TIME ZONE ?)::date", [timeZone, timeZone])
    .whereRaw("(due_date AT TIME ZONE ?)::date <= ((now() AT TIME ZONE ?)::date + interval '7 days')", [
      timeZone,
      timeZone,
    ])
    .select("id", "title", "due_date", "priority", "created_at", "completed")
    .orderBy("due_date", "asc")
    .orderBy("created_at", "asc")
    .orderBy("id", "asc");

  return {
    counts: {
      total: row?.total ?? 0,
      completed: row?.completed ?? 0,
      pending: row?.pending ?? 0,
      overdue: row?.overdue ?? 0,
    },
    upcoming,
  };
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
