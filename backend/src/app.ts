import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import { register } from "prom-client";
import { authRouter } from "./routes/auth";
import { tasksRouter } from "./routes/tasks";

export function createApp(): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.get("/metrics", async (_req: Request, res: Response) => {
    res.set("Content-Type", register.contentType);
    res.send(await register.metrics());
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
