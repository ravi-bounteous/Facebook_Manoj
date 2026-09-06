import { Router, Response } from "express";
import { requireAuth, AuthenticatedRequest } from "../middleware/requireAuth";
import { createTask, getTaskForUser, listTasksForUser, updateTask } from "../services/taskService";
import { ForbiddenError, NotFoundError, ValidationError } from "../services/errors";

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

tasksRouter.get("/", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const tasks = await listTasksForUser(req.user!.id);
  res.status(200).json({ tasks });
});

tasksRouter.post("/", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const task = await createTask(req.user!.id, req.body);
    res.status(201).json({ task });
  } catch (err) {
    handleError(err, res);
  }
});

tasksRouter.get("/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const task = await getTaskForUser(req.params.id, req.user!.id);
    res.status(200).json({ task });
  } catch (err) {
    handleError(err, res);
  }
});

tasksRouter.put("/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const task = await updateTask(req.params.id, req.user!.id, req.body);
    res.status(200).json({ task });
  } catch (err) {
    handleError(err, res);
  }
});
