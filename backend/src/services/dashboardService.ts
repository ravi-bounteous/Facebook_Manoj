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

interface CountsRow {
  total: string;
  completed: string;
  pending: string;
  overdue: string;
}

export async function getDashboardForUser(userId: string, clock: Clock = systemClock): Promise<DashboardResult> {
  const user = await knex("users").where({ id: userId }).select("timezone").first();
  const timezone = user?.timezone ?? "UTC";
  const today = todayInTimezone(timezone, clock);

  const [counts, upcomingTasks] = await Promise.all([
    knex("tasks")
      .where({ user_id: userId })
      .select(
        knex.raw("COUNT(*) as total"),
        knex.raw("COUNT(*) FILTER (WHERE completed) as completed"),
        knex.raw("COUNT(*) FILTER (WHERE NOT completed) as pending"),
        knex.raw(
          "COUNT(*) FILTER (WHERE NOT completed AND due_date IS NOT NULL AND (due_date AT TIME ZONE ?)::date < ?::date) as overdue",
          [timezone, today]
        )
      )
      .first<CountsRow>(),
    knex("tasks")
      .where({ user_id: userId, completed: false })
      .whereNotNull("due_date")
      .whereRaw("(due_date AT TIME ZONE ?)::date BETWEEN ?::date AND (?::date + INTERVAL '7 days')", [timezone, today, today])
      .orderBy("due_date", "asc")
      .orderBy("created_at", "asc")
      .select(
        "id",
        "title",
        knex.raw("due_date::text as due_date"),
        "priority",
        knex.raw("created_at::text as created_at"),
        "completed"
      ),
  ]);

  return {
    totalCount: Number(counts?.total ?? 0),
    completedCount: Number(counts?.completed ?? 0),
    pendingCount: Number(counts?.pending ?? 0),
    overdueCount: Number(counts?.overdue ?? 0),
    upcomingTasks,
  };
}
