import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import { authRouter } from "./routes/auth";
import { tasksRouter } from "./routes/tasks";
import { metricsRegistry, requestMetrics } from "./metrics";
import { requireAuth, AuthenticatedRequest } from "./middleware/requireAuth";
import { config } from "./config";

export function createApp(): Express {
  const app = express();
  app.use(cors({ origin: config.frontendUrl }));
  app.use(express.json());
  app.use(requestMetrics);
  app.get("/metrics", requireAuth, async (_req: AuthenticatedRequest, res: Response) => {
    res.set("Content-Type", metricsRegistry.contentType);
    res.end(await metricsRegistry.metrics());
  });
  app.use("/api/auth", authRouter);
  app.use("/api/tasks", tasksRouter);
  app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      next(err);
      return;
    }
    console.error(
      JSON.stringify({
        event: "unhandled_error",
        path: req.path,
        method: req.method,
        error: err instanceof Error ? err.message : String(err),
      })
    );
    res.status(500).json({ error: "Internal server error" });
  });
  return app;
}
