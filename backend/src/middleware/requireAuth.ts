import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { verifyAccessToken } from "../services/tokenService";
import { config } from "../config";

export interface AuthenticatedRequest extends Request {
  user?: { id: string };
}

function extractBearerToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  return header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);

  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub };
    next();
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError || err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }
    next(err);
  }
}

export function requireMetricsAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);

  if (!token || token !== config.metricsToken) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  next();
}
