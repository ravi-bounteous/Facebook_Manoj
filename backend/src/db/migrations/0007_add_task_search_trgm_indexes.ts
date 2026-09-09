import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pg_trgm"');
  await knex.raw("CREATE INDEX idx_tasks_title_trgm ON tasks USING GIN (title gin_trgm_ops)");
  await knex.raw("CREATE INDEX idx_tasks_description_trgm ON tasks USING GIN (description gin_trgm_ops)");
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw("DROP INDEX IF EXISTS idx_tasks_title_trgm");
  await knex.raw("DROP INDEX IF EXISTS idx_tasks_description_trgm");
}
