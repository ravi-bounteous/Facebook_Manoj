import { Router, Response } from "express";
import { requireAuth, AuthenticatedRequest } from "../middleware/requireAuth";
import { listTasksForUser, toggleTaskCompletion, deleteTask } from "../services/taskService";
import { NotFoundError } from "../services/errors";

export const tasksRouter = Router();

tasksRouter.get("/", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const tasks = await listTasksForUser(req.user!.id);
  res.status(200).json({ tasks });
});

tasksRouter.patch("/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const task = await toggleTaskCompletion(req.user!.id, req.params.id);
    res.status(200).json({ task });
  } catch (err) {
    if (err instanceof NotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    throw err;
  }
});

tasksRouter.delete("/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await deleteTask(req.user!.id, req.params.id);
    res.status(200).json({});
  } catch (err) {
    if (err instanceof NotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    throw err;
  }
});
