import { knex } from "../../src/db/knex";
import * as authService from "../../src/services/authService";
import { getTokenVersion, setTokenVersion } from "../../src/services/tokenVersionCache";
import { VALID_CREDENTIAL } from "../fixtures/credentials";

describe("tokenVersionCache", () => {
  it("serves cached reads without reflecting a raw DB write until explicitly invalidated", async () => {
    const { user } = await authService.register("cache-user@example.com", VALID_CREDENTIAL);

    const first = await getTokenVersion(user.id);
    expect(first).toBe(0);

    await knex("users").where({ id: user.id }).update({ token_version: 5 });

    const stillCached = await getTokenVersion(user.id);
    expect(stillCached).toBe(0);

    setTokenVersion(user.id, 5);

    const afterInvalidate = await getTokenVersion(user.id);
    expect(afterInvalidate).toBe(5);
  });

  it("returns null for a user that does not exist", async () => {
    const version = await getTokenVersion("00000000-0000-0000-0000-000000000000");
    expect(version).toBeNull();
  });
});
