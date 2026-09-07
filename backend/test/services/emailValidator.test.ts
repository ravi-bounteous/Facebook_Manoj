import { isValidEmail, normalizeEmail } from "../../src/services/emailValidator";

describe("isValidEmail", () => {
  it("accepts a well-formed email", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
  });

  it("rejects a missing email", () => {
    expect(isValidEmail("")).toBe(false);
  });

  it("rejects an invalid-format email", () => {
    expect(isValidEmail("not-an-email")).toBe(false);
  });
});

describe("normalizeEmail", () => {
  it("lowercases and trims the email", () => {
    expect(normalizeEmail("  User@Example.com  ")).toBe("user@example.com");
  });
});
