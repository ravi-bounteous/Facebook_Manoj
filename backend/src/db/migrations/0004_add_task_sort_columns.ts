import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("tasks", (table) => {
    table.timestamp("due_date", { useTz: true }).nullable();
    table.text("priority").notNullable().defaultTo("Medium");
  });
  await knex.raw(
    `ALTER TABLE tasks ADD CONSTRAINT tasks_priority_check CHECK (priority IN ('High', 'Medium', 'Low'))`
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("tasks", (table) => {
    table.dropColumn("due_date");
    table.dropColumn("priority");
  });
}
