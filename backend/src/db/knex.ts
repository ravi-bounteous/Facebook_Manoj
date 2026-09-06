import knexFactory from "knex";
import { types } from "pg";
import { config } from "../config";

const DATE_OID = 1082;
types.setTypeParser(DATE_OID, (value: string) => value);

export const knex = knexFactory({
  client: "pg",
  connection: config.databaseUrl,
  migrations: {
    directory: __dirname + "/migrations",
    extension: "ts",
  },
});
