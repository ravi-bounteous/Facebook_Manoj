import dotenv from "dotenv";
import path from "path";

dotenv.config({
  path: path.resolve(__dirname, "..", process.env.NODE_ENV === "test" ? ".env.test" : ".env"),
});

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set (no insecure default is provided)`);
  }
  return value;
}

export const config = {
  databaseUrl: process.env.DATABASE_URL || "",
  accessTokenSecret: requireEnv("ACCESS_TOKEN_SECRET"),
  refreshTokenSecret: requireEnv("REFRESH_TOKEN_SECRET"),
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || "15m",
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL || "7d",
  lockoutThreshold: Number(process.env.LOCKOUT_THRESHOLD || 5),
  lockoutDurationMs: Number(process.env.LOCKOUT_DURATION_MS || 15 * 60 * 1000),
  port: Number(process.env.ARC_DEV_PORT || 8001),
};
