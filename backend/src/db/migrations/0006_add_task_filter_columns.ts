import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("tasks", (table) => {
    table.text("description").nullable();
    table.text("category").nullable();
    table.specificType("tags", "text[]").nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("tasks", (table) => {
    table.dropColumn("description");
    table.dropColumn("category");
    table.dropColumn("tags");
  });
}
