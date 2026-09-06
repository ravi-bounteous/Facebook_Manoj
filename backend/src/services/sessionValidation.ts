import { InvalidCredentialsError } from "./errors";
import { getTokenVersion } from "./tokenVersionCache";

export async function validateTokenVersion(userId: string, tokenVersion: number): Promise<void> {
  const currentVersion = await getTokenVersion(userId);
  if (currentVersion === null || tokenVersion !== currentVersion) {
    throw new InvalidCredentialsError();
  }
}
