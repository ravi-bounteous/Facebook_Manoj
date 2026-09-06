import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../services/tokenService";

export interface AuthenticatedRequest extends Request {
  user?: { id: string };
}

// Access tokens are trusted without a per-request DB lookup: token_version is
// enforced at refresh time instead (see authService.refresh), where it is
// naturally infrequent (bounded by the short access-token TTL) rather than on
// every authenticated request.
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;

  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
