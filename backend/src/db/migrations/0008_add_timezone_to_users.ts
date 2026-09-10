import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn("users", "timezone");
  if (!hasColumn) {
    await knex.schema.alterTable("users", (table) => {
      table.text("timezone").notNullable().defaultTo("UTC");
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("users", (table) => {
    table.dropColumn("timezone");
  });
}
