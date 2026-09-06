process.env.NODE_ENV = "test";

import { knex } from "../src/db/knex";

beforeAll(async () => {
  await knex.migrate.latest();
});

beforeEach(async () => {
  await knex.raw("TRUNCATE TABLE tasks, password_reset_tokens, users CASCADE");
});

afterAll(async () => {
  await knex.destroy();
});
