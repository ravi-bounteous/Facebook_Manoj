import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/authApi";
import { LogoutButton } from "../components/LogoutButton";

interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string;
  tags: string[];
  category: string | null;
  created_at: string;
}

export function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTasks() {
      try {
        const res = await apiFetch("/tasks");
        if (!res.ok) {
          throw new Error("Failed to load tasks");
        }
        const data = await res.json();
        if (!cancelled) {
          setTasks(data.tasks);
        }
      } catch {
        if (!cancelled) {
          setError("Failed to load tasks");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTasks();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <h1>Task List</h1>
      <Link to="/tasks/new">New Task</Link>
      {loading && <p>Loading...</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && (
        <ul>
          {tasks.map((task) => (
            <li key={task.id}>
              {task.title}
              {task.priority && <span> ({task.priority})</span>}
              {task.category && <span> [{task.category}]</span>}
              {task.due_date && <span> due {task.due_date}</span>}
              {task.tags && task.tags.length > 0 && <span> tags: {task.tags.join(", ")}</span>}
              <Link to={`/tasks/${task.id}/edit`}>Edit</Link>
            </li>
          ))}
        </ul>
      )}
      <LogoutButton />
    </div>
  );
}
