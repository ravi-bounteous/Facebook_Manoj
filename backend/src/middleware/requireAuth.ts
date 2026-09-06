import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../services/tokenService";
import { knex } from "../db/knex";

export interface AuthenticatedRequest extends Request {
  user?: { id: string };
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;

  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await knex("users").where({ id: payload.sub }).first();
    if (!user || (payload.ver ?? 0) !== user.token_version) {
      console.info(
        `[auth] access token rejected user_id=${payload.sub} reason="token_version mismatch (session invalidated, e.g. by password reset)"`
      );
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }
    req.user = { id: payload.sub };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
