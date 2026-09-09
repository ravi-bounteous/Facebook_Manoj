import { knex } from "../db/knex";
import { systemClock, Clock } from "../utils/clock";

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

function todayInTimezone(timezone: string, clock: Clock): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(clock.now());
}

export async function getDashboardForUser(userId: string, clock: Clock = systemClock): Promise<DashboardResult> {
  const user = await knex("users").where({ id: userId }).select("timezone").first();
  const timezone = user?.timezone ?? "UTC";
  const today = todayInTimezone(timezone, clock);

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
    .whereRaw("(due_date AT TIME ZONE ?)::date < ?::date", [timezone, today])
    .count<{ count: string }[]>("id as count");

  const upcomingTasks = await knex("tasks")
    .where({ user_id: userId, completed: false })
    .whereNotNull("due_date")
    .whereRaw("(due_date AT TIME ZONE ?)::date BETWEEN ?::date AND (?::date + INTERVAL '7 days')", [timezone, today, today])
    .orderBy("due_date", "asc")
    .orderBy("created_at", "asc")
    .select("id", "title", "due_date", "priority", "created_at", "completed");

  return {
    totalCount: Number(totalCount),
    completedCount: Number(completedCount),
    pendingCount: Number(pendingCount),
    overdueCount: Number(overdueCount),
    upcomingTasks,
  };
}
