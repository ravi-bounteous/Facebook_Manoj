import { useEffect, useState } from "react";
import { apiFetch } from "../api/authApi";
import { LogoutButton } from "../components/LogoutButton";

interface UpcomingTask {
  id: string;
  title: string;
  due_date: string | null;
  priority: string;
  created_at: string;
  completed: boolean;
}

interface DashboardData {
  totalCount: number;
  completedCount: number;
  pendingCount: number;
  overdueCount: number;
  upcomingTasks: UpcomingTask[];
}

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/tasks/dashboard")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load dashboard");
        return res.json();
      })
      .then((result) => setData(result))
      .catch(() => setError("Failed to load dashboard"));
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      <LogoutButton />
      {error && <p role="alert">{error}</p>}
      {data && (
        <>
          <dl>
            <dt>Total</dt>
            <dd>{data.totalCount}</dd>
            <dt>Completed</dt>
            <dd>{data.completedCount}</dd>
            <dt>Pending</dt>
            <dd>{data.pendingCount}</dd>
            <dt>Overdue</dt>
            <dd>{data.overdueCount}</dd>
          </dl>
          <h2>Upcoming Tasks</h2>
          {data.upcomingTasks.length === 0 ? (
            <p>No upcoming tasks due in the next 7 days</p>
          ) : (
            <ul>
              {data.upcomingTasks.map((task) => (
                <li key={task.id}>
                  <span>{task.title}</span> <span>{task.due_date}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
