import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../api/authApi";
import { LogoutButton } from "../components/LogoutButton";

interface Task {
  id: string;
  title: string;
  created_at: string;
  completed: boolean;
}

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);

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
    try {
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
    } catch {
      setError("Network error. Please try again.");
    }
  }

  function openDeleteConfirmation(taskId: string) {
    lastFocusedElementRef.current = document.activeElement as HTMLElement | null;
    setPendingDeleteId(taskId);
  }

  function closeDeleteConfirmation() {
    setPendingDeleteId(null);
    lastFocusedElementRef.current?.focus();
    lastFocusedElementRef.current = null;
  }

  async function handleConfirmDelete(taskId: string) {
    setPendingDeleteId(null);
    lastFocusedElementRef.current = null;
    try {
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
    } catch {
      setError("Network error. Please try again.");
    }
  }

  const pendingDeleteTask = tasks.find((task) => task.id === pendingDeleteId) ?? null;

  useEffect(() => {
    if (!pendingDeleteTask) return;

    confirmButtonRef.current?.focus();
    rootRef.current?.setAttribute("inert", "");

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeDeleteConfirmation();
        return;
      }
      if (e.key === "Tab") {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      rootRef.current?.removeAttribute("inert");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingDeleteTask]);

  return (
    <div>
      <div ref={rootRef}>
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
                <button
                  type="button"
                  aria-label={`Delete ${task.title}`}
                  onClick={() => openDeleteConfirmation(task.id)}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
        <LogoutButton />
      </div>
      {pendingDeleteTask && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Confirm delete ${pendingDeleteTask.title}`}
        >
          <div className="dialog-overlay" onClick={closeDeleteConfirmation} />
          <p>Delete "{pendingDeleteTask.title}"? This cannot be undone.</p>
          <button ref={confirmButtonRef} type="button" onClick={() => handleConfirmDelete(pendingDeleteTask.id)}>
            Confirm
          </button>
          <button type="button" onClick={closeDeleteConfirmation}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
