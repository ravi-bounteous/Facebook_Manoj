import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("tasks", (table) => {
    table.index(["user_id"]);
    table.index(["user_id", "due_date"]);
    table.index(["user_id", "priority"]);
    table.index(["user_id", "created_at"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("tasks", (table) => {
    table.dropIndex(["user_id"]);
    table.dropIndex(["user_id", "due_date"]);
    table.dropIndex(["user_id", "priority"]);
    table.dropIndex(["user_id", "created_at"]);
  });
}
