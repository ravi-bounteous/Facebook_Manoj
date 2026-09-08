import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("tasks", (table) => {
    table.text("description").nullable();
    table.text("category").nullable();
    table.specificType("tags", "text[]").nullable();
  });
  await knex.schema.alterTable("tasks", (table) => {
    table.index(["user_id", "category"]);
  });
  await knex.raw("CREATE INDEX tasks_tags_gin_idx ON tasks USING GIN (tags)");
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw("DROP INDEX IF EXISTS tasks_tags_gin_idx");
  await knex.schema.alterTable("tasks", (table) => {
    table.dropIndex(["user_id", "category"]);
  });
  await knex.schema.alterTable("tasks", (table) => {
    table.dropColumn("description");
    table.dropColumn("category");
    table.dropColumn("tags");
  });
}
