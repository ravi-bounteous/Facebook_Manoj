import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("tasks", (table) => {
    table.text("description").nullable();
    table.date("due_date").nullable();
    table.text("priority").notNullable().defaultTo("medium");
    table.jsonb("tags").notNullable().defaultTo("[]");
    table.text("category").nullable();
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("tasks", (table) => {
    table.dropColumn("description");
    table.dropColumn("due_date");
    table.dropColumn("priority");
    table.dropColumn("tags");
    table.dropColumn("category");
    table.dropColumn("updated_at");
  });
}
