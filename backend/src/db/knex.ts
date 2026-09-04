import knexFactory from "knex";
import { config } from "../config";

export const knex = knexFactory({
  client: "pg",
  connection: config.databaseUrl,
  migrations: {
    directory: __dirname + "/migrations",
    extension: "ts",
  },
});
