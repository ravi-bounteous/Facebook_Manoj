import { Router, Response, NextFunction } from "express";
import { validate as isUUID } from "uuid";
import { requireAuth, AuthenticatedRequest } from "../middleware/requireAuth";
import { listTasksForUser, toggleTaskCompletion, deleteTask } from "../services/taskService";
import { NotFoundError } from "../services/errors";

export const tasksRouter = Router();

tasksRouter.get(
  "/",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const tasks = await listTasksForUser(req.user!.id);
      res.status(200).json({ tasks });
    } catch (err) {
      console.error(
        JSON.stringify({
          event: "tasks.list.error",
          userId: req.user!.id,
          error: err instanceof Error ? err.message : String(err),
        })
      );
      next(err);
    }
  }
);

tasksRouter.patch(
  "/:id",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!isUUID(req.params.id)) {
      res.status(400).json({ error: "Invalid task ID" });
      return;
    }
    try {
      const task = await toggleTaskCompletion(req.user!.id, req.params.id);
      res.status(200).json({ task });
    } catch (err) {
      if (err instanceof NotFoundError) {
        res.status(404).json({ error: err.message });
        return;
      }
      console.error(
        JSON.stringify({
          event: "task.toggle.error",
          userId: req.user!.id,
          taskId: req.params.id,
          error: err instanceof Error ? err.message : String(err),
        })
      );
      next(err);
    }
  }
);

tasksRouter.delete(
  "/:id",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!isUUID(req.params.id)) {
      res.status(400).json({ error: "Invalid task ID" });
      return;
    }
    try {
      await deleteTask(req.user!.id, req.params.id);
      res.status(200).json({});
    } catch (err) {
      if (err instanceof NotFoundError) {
        res.status(404).json({ error: err.message });
        return;
      }
      console.error(
        JSON.stringify({
          event: "task.delete.error",
          userId: req.user!.id,
          taskId: req.params.id,
          error: err instanceof Error ? err.message : String(err),
        })
      );
      next(err);
    }
  }
);
