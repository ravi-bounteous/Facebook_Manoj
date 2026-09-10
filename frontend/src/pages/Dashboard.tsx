import { useEffect, useState } from "react";
import { apiFetch } from "../api/authApi";
import { LogoutButton } from "../components/LogoutButton";

interface DashboardCounts {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
}

interface UpcomingTask {
  id: string;
  title: string;
  due_date: string | null;
  priority: string;
  created_at: string;
  completed: boolean;
}

export function Dashboard() {
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingTask[] | null>(null);
  const [countsLoading, setCountsLoading] = useState(true);
  const [upcomingLoading, setUpcomingLoading] = useState(true);
  const [countsError, setCountsError] = useState<string | null>(null);
  const [upcomingError, setUpcomingError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await apiFetch("/tasks/dashboard");
        if (cancelled) return;
        if (!res.ok) {
          throw new Error("Failed to load dashboard");
        }
        const data = await res.json();
        if (cancelled) return;
        setCounts(data.counts);
        setUpcoming(data.upcoming);
      } catch {
        if (cancelled) return;
        setCountsError("Failed to load summary counts");
        setUpcomingError("Failed to load upcoming tasks");
      } finally {
        if (cancelled) return;
        setCountsLoading(false);
        setUpcomingLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      <section aria-label="Summary counts">
        {countsLoading && <p data-testid="counts-loading">Loading...</p>}
        {!countsLoading && countsError && <p data-testid="counts-error" role="alert">{countsError}</p>}
        {!countsLoading && !countsError && counts && (
          <dl>
            <dt>Total</dt>
            <dd>{counts.total}</dd>
            <dt>Completed</dt>
            <dd>{counts.completed}</dd>
            <dt>Pending</dt>
            <dd>{counts.pending}</dd>
            <dt>Overdue</dt>
            <dd>{counts.overdue}</dd>
          </dl>
        )}
      </section>
      <section aria-label="Upcoming tasks">
        {upcomingLoading && <p data-testid="upcoming-loading">Loading...</p>}
        {!upcomingLoading && upcomingError && <p data-testid="upcoming-error" role="alert">{upcomingError}</p>}
        {!upcomingLoading && !upcomingError && upcoming && upcoming.length === 0 && (
          <p>No upcoming tasks due in the next 7 days</p>
        )}
        {!upcomingLoading && !upcomingError && upcoming && upcoming.length > 0 && (
          <ul>
            {upcoming.map((task) => (
              <li key={task.id}>
                <span>{task.title}</span>
                {task.due_date && <span> (due {task.due_date})</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
      <LogoutButton />
    </div>
  );
}
