import { knex } from "../db/knex";

export interface DashboardTask {
  id: string;
  title: string;
  due_date: string;
  priority: string;
  created_at: string;
  completed: boolean;
}

export interface DashboardResult {
  totalCount: number;
  completedCount: number;
  pendingCount: number;
  overdueCount: number;
  upcomingTasks: DashboardTask[];
}

const UPCOMING_WINDOW_DAYS = 7;

interface DashboardSummaryRow {
  timezone: string;
  total_count: string;
  completed_count: string;
  pending_count: string;
  overdue_count: string;
}

export async function getDashboardForUser(userId: string): Promise<DashboardResult> {
  const summary = await knex("users")
    .where("users.id", userId)
    .leftJoin("tasks", "tasks.user_id", "users.id")
    .first<DashboardSummaryRow>(
      "users.timezone as timezone",
      knex.raw("count(tasks.id) as total_count"),
      knex.raw("sum(case when tasks.completed then 1 else 0 end) as completed_count"),
      knex.raw("sum(case when not tasks.completed then 1 else 0 end) as pending_count"),
      knex.raw(
        `sum(case when not tasks.completed and tasks.due_date is not null
              and (tasks.due_date at time zone users.timezone)::date < (now() at time zone users.timezone)::date
              then 1 else 0 end) as overdue_count`
      )
    )
    .groupBy("users.id", "users.timezone");

  const timezone = summary?.timezone ?? "UTC";
  const totalCount = summary?.total_count ?? "0";
  const completedCount = summary?.completed_count ?? "0";
  const pendingCount = summary?.pending_count ?? "0";
  const overdueCount = summary?.overdue_count ?? "0";

  const upcomingTasks = await knex("tasks")
    .select("id", "title", "due_date", "priority", "created_at", "completed")
    .where({ user_id: userId, completed: false })
    .whereNotNull("due_date")
    .whereRaw("(due_date AT TIME ZONE ?)::date >= (now() AT TIME ZONE ?)::date", [timezone, timezone])
    .whereRaw(`(due_date AT TIME ZONE ?)::date <= ((now() AT TIME ZONE ?)::date + (?::text || ' days')::interval)`, [
      timezone,
      timezone,
      UPCOMING_WINDOW_DAYS,
    ])
    .orderBy("due_date", "asc")
    .orderBy("created_at", "asc");

  return {
    totalCount: Number(totalCount),
    completedCount: Number(completedCount),
    pendingCount: Number(pendingCount),
    overdueCount: Number(overdueCount),
    upcomingTasks,
  };
}
