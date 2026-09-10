import bcrypt from "bcrypt";
import { login } from "../../src/services/authService";
import { InvalidCredentialsError } from "../../src/services/errors";
import { VALID_CREDENTIAL } from "../fixtures/credentials";

describe("login timing safety (mitigates user-enumeration via timing side-channel)", () => {
  it("still invokes bcrypt.compare when the email is not registered", async () => {
    const compareSpy = jest.spyOn(bcrypt, "compare");

    await expect(login("nobody-timing@example.com", VALID_CREDENTIAL)).rejects.toThrow(InvalidCredentialsError);

    expect(compareSpy).toHaveBeenCalled();
    compareSpy.mockRestore();
  });

  it("reuses a cached dummy hash instead of recomputing it on every login for unregistered emails", async () => {
    const hashSpy = jest.spyOn(bcrypt, "hash");
    const callsBefore = hashSpy.mock.calls.length;

    await expect(login("nobody-timing-2@example.com", VALID_CREDENTIAL)).rejects.toThrow(InvalidCredentialsError);
    const callsAfterFirst = hashSpy.mock.calls.length;
    await expect(login("nobody-timing-3@example.com", VALID_CREDENTIAL)).rejects.toThrow(InvalidCredentialsError);
    const callsAfterSecond = hashSpy.mock.calls.length;

    expect(callsAfterFirst - callsBefore).toBeLessThanOrEqual(1);
    expect(callsAfterSecond).toBe(callsAfterFirst);
    hashSpy.mockRestore();
  });
});
