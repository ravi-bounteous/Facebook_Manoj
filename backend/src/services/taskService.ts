import { knex } from "../db/knex";

export async function listTasksForUser(userId: string) {
  return knex("tasks").where({ user_id: userId }).select("id", "title", "created_at");
}
