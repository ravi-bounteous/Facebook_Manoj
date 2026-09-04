import * as authService from "../../src/services/authService";
import { knex } from "../../src/db/knex";
import { AccountLockedError, InvalidCredentialsError } from "../../src/services/errors";
import { Clock } from "../../src/utils/clock";

function fixedClock(date: Date): Clock {
  return { now: () => date };
}

describe("account lockout (AC25, AC26, AC27)", () => {
  const email = "noah@example.com";
  const password = "Passw0rd";
  const start = new Date("2026-01-01T00:00:00Z");

  beforeEach(async () => {
    await authService.register(email, password);
  });

  it("locks the account after 5 consecutive failed logins (AC25)", async () => {
    for (let i = 0; i < 5; i++) {
      await expect(authService.login(email, "WrongPass1", fixedClock(start))).rejects.toThrow(InvalidCredentialsError);
    }

    const user = await knex("users").where({ email }).first();
    expect(user.locked_until).not.toBeNull();
    expect(new Date(user.locked_until).getTime()).toBeGreaterThan(start.getTime());
  });

  it("denies login during the lockout cooldown with a lockout message (AC26)", async () => {
    for (let i = 0; i < 5; i++) {
      await expect(authService.login(email, "WrongPass1", fixedClock(start))).rejects.toThrow(InvalidCredentialsError);
    }

    const duringCooldown = new Date(start.getTime() + 60 * 1000);
    await expect(authService.login(email, password, fixedClock(duringCooldown))).rejects.toThrow(AccountLockedError);
  });

  it("allows login again once the cooldown elapses (AC27)", async () => {
    for (let i = 0; i < 5; i++) {
      await expect(authService.login(email, "WrongPass1", fixedClock(start))).rejects.toThrow(InvalidCredentialsError);
    }

    const afterCooldown = new Date(start.getTime() + 20 * 60 * 1000);
    const result = await authService.login(email, password, fixedClock(afterCooldown));
    expect(result.accessToken).toBeDefined();

    const user = await knex("users").where({ email }).first();
    expect(user.failed_login_attempts).toBe(0);
    expect(user.locked_until).toBeNull();
  });
});
