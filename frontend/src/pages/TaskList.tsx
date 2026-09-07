import { useEffect, useState } from "react";
import { apiFetch } from "../api/authApi";
import { LogoutButton } from "../components/LogoutButton";

interface Task {
  id: string;
  title: string;
  created_at: string;
  completed: boolean;
}

export function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  async function loadTasks() {
    try {
      const res = await apiFetch("/tasks");
      if (!res.ok) {
        throw new Error("Failed to load tasks");
      }
      const data = await res.json();
      setTasks(data.tasks);
    } catch {
      setError("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
  }, []);

  async function handleToggle(taskId: string) {
    const res = await apiFetch(`/tasks/${taskId}`, { method: "PATCH" });
    if (!res.ok) {
      if (res.status === 404) {
        setError("This task no longer exists. Refreshing your task list.");
        await loadTasks();
        return;
      }
      setError("Failed to update task");
      return;
    }
    const data = await res.json();
    setTasks((prev) => prev.map((task) => (task.id === taskId ? data.task : task)));
  }

  async function handleConfirmDelete(taskId: string) {
    setPendingDeleteId(null);
    const res = await apiFetch(`/tasks/${taskId}`, { method: "DELETE" });
    if (!res.ok) {
      if (res.status === 404) {
        setError("This task no longer exists. Refreshing your task list.");
        await loadTasks();
        return;
      }
      setError("Failed to delete task");
      return;
    }
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
  }

  const pendingDeleteTask = tasks.find((task) => task.id === pendingDeleteId) ?? null;

  useEffect(() => {
    if (!pendingDeleteTask) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setPendingDeleteId(null);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [pendingDeleteTask]);

  return (
    <div>
      <h1>Task List</h1>
      {loading && <p>Loading...</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && (
        <ul>
          {tasks.map((task) => (
            <li key={task.id}>
              <label>
                <input
                  type="checkbox"
                  checked={task.completed}
                  aria-label={task.title}
                  onChange={() => handleToggle(task.id)}
                />
                {task.title}
              </label>
              <button type="button" aria-label={`Delete ${task.title}`} onClick={() => setPendingDeleteId(task.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
      {pendingDeleteTask && (
        <div role="dialog" aria-label={`Confirm delete ${pendingDeleteTask.title}`}>
          <div className="dialog-overlay" onClick={() => setPendingDeleteId(null)} />
          <p>Delete "{pendingDeleteTask.title}"? This cannot be undone.</p>
          <button type="button" onClick={() => handleConfirmDelete(pendingDeleteTask.id)}>
            Confirm
          </button>
          <button type="button" onClick={() => setPendingDeleteId(null)}>
            Cancel
          </button>
        </div>
      )}
      <LogoutButton />
    </div>
  );
}
