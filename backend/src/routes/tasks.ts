import { Router, Response, NextFunction } from "express";
import { requireAuth, AuthenticatedRequest } from "../middleware/requireAuth";
import { createTask, getTaskForUser, listTasksForUser, updateTask } from "../services/taskService";
import { ForbiddenError, NotFoundError, ValidationError } from "../services/errors";
import { logger } from "../utils/logger";

export const tasksRouter = Router();

function handleError(err: unknown, res: Response) {
  if (err instanceof ValidationError) {
    res.status(400).json({ error: err.message });
    return;
  }
  if (err instanceof NotFoundError) {
    res.status(404).json({ error: err.message });
    return;
  }
  if (err instanceof ForbiddenError) {
    res.status(403).json({ error: err.message });
    return;
  }
  throw err;
}

function instrument(operation: string, handler: (req: AuthenticatedRequest, res: Response) => Promise<void>) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const startedAt = Date.now();
    res.on("finish", () => {
      logger.info("task.request", {
        operation,
        userId: req.user?.id,
        taskId: req.params?.id,
        status: res.statusCode,
        durationMs: Date.now() - startedAt,
      });
    });
    try {
      await handler(req, res);
    } catch (err) {
      next(err);
    }
  };
}

tasksRouter.get(
  "/",
  requireAuth,
  instrument("list", async (req, res) => {
    const tasks = await listTasksForUser(req.user!.id);
    res.status(200).json({ tasks });
  })
);

tasksRouter.post(
  "/",
  requireAuth,
  instrument("create", async (req, res) => {
    try {
      const task = await createTask(req.user!.id, req.body);
      res.status(201).json({ task });
    } catch (err) {
      handleError(err, res);
    }
  })
);

tasksRouter.get(
  "/:id",
  requireAuth,
  instrument("get", async (req, res) => {
    try {
      const task = await getTaskForUser(req.params.id, req.user!.id);
      res.status(200).json({ task });
    } catch (err) {
      handleError(err, res);
    }
  })
);

tasksRouter.put(
  "/:id",
  requireAuth,
  instrument("update", async (req, res) => {
    try {
      const task = await updateTask(req.params.id, req.user!.id, req.body);
      res.status(200).json({ task });
    } catch (err) {
      handleError(err, res);
    }
  })
);
