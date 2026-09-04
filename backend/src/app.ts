import express, { Express } from "express";
import cors from "cors";
import { authRouter } from "./routes/auth";
import { tasksRouter } from "./routes/tasks";

export function createApp(): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use("/api/auth", authRouter);
  app.use("/api/tasks", tasksRouter);
  return app;
}
