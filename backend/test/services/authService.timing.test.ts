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
});
