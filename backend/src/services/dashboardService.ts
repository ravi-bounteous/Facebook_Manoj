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

export async function getDashboardForUser(userId: string): Promise<DashboardResult> {
  const user = await knex("users").where({ id: userId }).first("timezone");
  const timezone = user?.timezone ?? "UTC";

  const [{ count: totalCount }] = await knex("tasks").where({ user_id: userId }).count<{ count: string }[]>("id as count");
  const [{ count: completedCount }] = await knex("tasks")
    .where({ user_id: userId, completed: true })
    .count<{ count: string }[]>("id as count");
  const [{ count: pendingCount }] = await knex("tasks")
    .where({ user_id: userId, completed: false })
    .count<{ count: string }[]>("id as count");

  const [{ count: overdueCount }] = await knex("tasks")
    .where({ user_id: userId, completed: false })
    .whereNotNull("due_date")
    .whereRaw("(due_date AT TIME ZONE ?)::date < (now() AT TIME ZONE ?)::date", [timezone, timezone])
    .count<{ count: string }[]>("id as count");

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
