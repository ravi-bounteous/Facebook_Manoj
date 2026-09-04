import { Router, Response } from "express";
import { requireAuth, AuthenticatedRequest } from "../middleware/requireAuth";
import { listTasksForUser } from "../services/taskService";

export const tasksRouter = Router();

tasksRouter.get("/", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const tasks = await listTasksForUser(req.user!.id);
  res.status(200).json({ tasks });
});
