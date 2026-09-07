import { knex } from "../db/knex";
import { InvalidCredentialsError } from "./errors";

export async function getTokenVersion(userId: string): Promise<number | null> {
  const user = await knex("users").where({ id: userId }).first(["token_version"]);
  return user ? user.token_version : null;
}

export async function validateTokenVersion(userId: string, tokenVersion: number): Promise<void> {
  const currentVersion = await getTokenVersion(userId);
  if (currentVersion === null || tokenVersion !== currentVersion) {
    throw new InvalidCredentialsError();
  }
}
