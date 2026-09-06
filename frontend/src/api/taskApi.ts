import { apiFetch } from "./authApi";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string;
  tags: string[];
  category: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskPayload {
  title: string;
  description?: string;
  due_date?: string;
  priority?: string;
  tags?: string[];
  category?: string;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function handle(res: Response): Promise<any> {
  const data = await res.json();
  if (!res.ok) {
    throw new ApiError(res.status, data.error || "Request failed");
  }
  return data;
}

export async function createTask(payload: TaskPayload): Promise<Task> {
  const res = await apiFetch("/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await handle(res);
  return data.task;
}

export async function getTask(id: string): Promise<Task> {
  const res = await apiFetch(`/tasks/${id}`);
  const data = await handle(res);
  return data.task;
}

export async function updateTask(id: string, payload: TaskPayload): Promise<Task> {
  const res = await apiFetch(`/tasks/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await handle(res);
  return data.task;
}
