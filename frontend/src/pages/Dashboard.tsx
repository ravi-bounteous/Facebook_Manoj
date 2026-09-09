import { useEffect, useState } from "react";
import { apiFetch } from "../api/authApi";
import { LogoutButton } from "../components/LogoutButton";

interface UpcomingTask {
  id: string;
  title: string;
  due_date: string | null;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/tasks/dashboard")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load dashboard");
        return res.json();
      })
      .then((body) => {
        setData(body);
        setError(null);
      })
      .catch(() => {
        setError("Failed to load dashboard");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      {loading && <p>Loading...</p>}
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
          <h2>Upcoming (next 7 days)</h2>
          {data.upcomingTasks.length === 0 ? (
            <p>No upcoming tasks due in the next 7 days</p>
          ) : (
            <ul>
              {data.upcomingTasks.map((task) => (
                <li key={task.id}>
                  {task.title} - {task.due_date}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <LogoutButton />
    </div>
  );
}
