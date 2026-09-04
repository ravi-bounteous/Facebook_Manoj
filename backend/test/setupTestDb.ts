process.env.NODE_ENV = "test";

import { knex } from "../src/db/knex";

beforeAll(async () => {
  await knex.migrate.latest();
});

beforeEach(async () => {
  await knex.raw("TRUNCATE TABLE tasks, users CASCADE");
});

afterAll(async () => {
  await knex.destroy();
});
