import { Router, Response, NextFunction } from "express";
import { validate as isUUID } from "uuid";
import { requireAuth, AuthenticatedRequest } from "../middleware/requireAuth";
import { listTasksForUser, listFilterOptionsForUser, toggleTaskCompletion, deleteTask } from "../services/taskService";
import { getDashboardForUser } from "../services/dashboardService";
import { NotFoundError, ValidationError } from "../services/errors";

export const tasksRouter = Router();

function toStringArray(value: unknown): string[] | undefined {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  return undefined;
}

tasksRouter.get(
  "/",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { sortBy, sortDir, page, search, status, priority, tag, category, dueFrom, dueTo } = req.query;
      const parsedPage = typeof page === "string" ? parseInt(page, 10) : undefined;
      const filters = {
        search: typeof search === "string" ? search : undefined,
        status: typeof status === "string" ? status : undefined,
        priority: toStringArray(priority),
        tag: toStringArray(tag),
        category: typeof category === "string" ? category : undefined,
        dueFrom: typeof dueFrom === "string" ? dueFrom : undefined,
        dueTo: typeof dueTo === "string" ? dueTo : undefined,
      };

      const startTime = Date.now();
      const result = await listTasksForUser(req.user!.id, {
        sortBy: typeof sortBy === "string" ? sortBy : undefined,
        sortDir: typeof sortDir === "string" ? sortDir : undefined,
        page: parsedPage && Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : undefined,
        ...filters,
      });

      console.log(
        JSON.stringify({
          event: "tasks.list.success",
          userId: req.user!.id,
          filters: {
            hasSearch: !!filters.search,
            status: filters.status,
            priorityCount: filters.priority?.length ?? 0,
            tagCount: filters.tag?.length ?? 0,
            category: filters.category,
            hasDueDateRange: !!(filters.dueFrom || filters.dueTo),
          },
          resultCount: result.totalCount,
          durationMs: Date.now() - startTime,
        })
      );

      res.status(200).json(result);
    } catch (err) {
      if (err instanceof ValidationError) {
        console.error(
          JSON.stringify({
            event: "tasks.list.validation_error",
            userId: req.user!.id,
            error: err.message,
          })
        );
        res.status(400).json({ error: err.message });
        return;
      }
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

tasksRouter.get(
  "/dashboard",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await getDashboardForUser(req.user!.id);
      console.log(
        JSON.stringify({
          event: "tasks.dashboard.retrieved",
          userId: req.user!.id,
          totalCount: result.totalCount,
          overdueCount: result.overdueCount,
          upcomingCount: result.upcomingTasks.length,
        })
      );
      res.status(200).json(result);
    } catch (err) {
      console.error(
        JSON.stringify({
          event: "tasks.dashboard.error",
          userId: req.user!.id,
          error: err instanceof Error ? err.message : String(err),
        })
      );
      next(err);
    }
  }
);

tasksRouter.get(
  "/filter-options",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await listFilterOptionsForUser(req.user!.id);
      console.log(
        JSON.stringify({
          event: "tasks.filterOptions.retrieved",
          userId: req.user!.id,
          categoryCount: result.categories.length,
          tagCount: result.tags.length,
        })
      );
      res.status(200).json(result);
    } catch (err) {
      console.error(
        JSON.stringify({
          event: "tasks.filterOptions.error",
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
