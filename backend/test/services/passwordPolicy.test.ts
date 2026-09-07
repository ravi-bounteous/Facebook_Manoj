import { isValidPassword } from "../../src/services/passwordPolicy";

describe("isValidPassword", () => {
  it("accepts an exactly-8-char password with upper, lower, digit (AC16)", () => {
    expect(isValidPassword("Passw0rd")).toEqual({ valid: true });
  });

  it("rejects a 7-char password with a descriptive error (AC17)", () => {
    const result = isValidPassword("Pass0rd");
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/at least 8 characters/i);
  });

  it("rejects a password missing an uppercase letter (AC18)", () => {
    const result = isValidPassword("password0");
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/uppercase/i);
  });

  it("rejects a password missing a lowercase letter (AC18)", () => {
    const result = isValidPassword("PASSWORD0");
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/lowercase/i);
  });

  it("rejects a password missing a digit (AC18)", () => {
    const result = isValidPassword("Password");
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/digit/i);
  });

  it("rejects a missing password", () => {
    const result = isValidPassword("");
    expect(result.valid).toBe(false);
  });
});
