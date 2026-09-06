import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../services/tokenService";
import { validateTokenVersion } from "../services/sessionValidation";
import { InvalidCredentialsError } from "../services/errors";

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

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  try {
    await validateTokenVersion(payload.sub, payload.ver ?? 0);
  } catch (err) {
    if (err instanceof InvalidCredentialsError) {
      console.info(
        `[auth] access token rejected user_id=${payload.sub} reason="token_version mismatch (session invalidated, e.g. by password reset)"`
      );
    } else {
      console.error(
        `[auth] access token validation failed due to an unexpected error user_id=${payload.sub} error=${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  req.user = { id: payload.sub };
  next();
}
