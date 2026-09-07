describe("config", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  it("throws instead of falling back to a default secret when ACCESS_TOKEN_SECRET is unset outside tests", () => {
    jest.resetModules();
    process.env.NODE_ENV = "production";
    delete process.env.ACCESS_TOKEN_SECRET;
    process.env.REFRESH_TOKEN_SECRET = "some-refresh-secret";
    process.env.DATABASE_URL = "postgres://example";

    expect(() => require("../src/config")).toThrow(/ACCESS_TOKEN_SECRET/);
  });

  it("throws instead of falling back to a default secret when REFRESH_TOKEN_SECRET is unset outside tests", () => {
    jest.resetModules();
    process.env.NODE_ENV = "production";
    process.env.ACCESS_TOKEN_SECRET = "some-access-secret";
    delete process.env.REFRESH_TOKEN_SECRET;
    process.env.DATABASE_URL = "postgres://example";

    expect(() => require("../src/config")).toThrow(/REFRESH_TOKEN_SECRET/);
  });
});
