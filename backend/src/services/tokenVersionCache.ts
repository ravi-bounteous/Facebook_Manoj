import { knex } from "../db/knex";

interface CacheEntry {
  version: number;
  cachedAt: number;
}

// Bounds worst-case staleness for a cache entry that was never actively
// invalidated (e.g. a token_version bumped by a process other than this one).
// The password reset flow calls setTokenVersion() to invalidate immediately,
// so this TTL is a safety net, not the primary invalidation mechanism.
const CACHE_TTL_MS = 5000;

const cache = new Map<string, CacheEntry>();

export async function getTokenVersion(userId: string): Promise<number | null> {
  const cached = cache.get(userId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.version;
  }

  const user = await knex("users").where({ id: userId }).first(["token_version"]);
  if (!user) {
    cache.delete(userId);
    return null;
  }

  cache.set(userId, { version: user.token_version, cachedAt: Date.now() });
  return user.token_version;
}

export function setTokenVersion(userId: string, version: number): void {
  cache.set(userId, { version, cachedAt: Date.now() });
}
