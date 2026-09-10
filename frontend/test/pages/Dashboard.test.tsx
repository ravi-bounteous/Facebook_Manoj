import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Dashboard } from "../../src/pages/Dashboard";
import { tokenStorage } from "../../src/api/tokenStorage";

function makeDashboardResponse(overrides: Partial<any> = {}) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      totalCount: 0,
      completedCount: 0,
      pendingCount: 0,
      overdueCount: 0,
      upcomingTasks: [],
      ...overrides,
    }),
  };
}

function makeToken(exp: number) {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({ sub: "1", exp }));
  return `${header}.${payload}.signature`;
}

describe("Dashboard", () => {
  beforeEach(() => {
    tokenStorage.clear();
    tokenStorage.setTokens(makeToken(Math.floor(Date.now() / 1000) + 900), "refresh");
  });

  it("renders the four summary counts (AC1)", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        makeDashboardResponse({ totalCount: 5, completedCount: 2, pendingCount: 3, overdueCount: 1 })
      ) as any;

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(await screen.findByText("5")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("shows the empty-state message when no tasks are due in the next 7 days (AC3)", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(makeDashboardResponse()) as any;

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(await screen.findByText("No upcoming tasks due in the next 7 days")).toBeInTheDocument();
  });

  it("renders the upcoming tasks preview list without any full-list link (AC2, AC18)", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      makeDashboardResponse({
        upcomingTasks: [
          { id: "1", title: "Task One", due_date: "2026-09-11", priority: "High", created_at: "", completed: false },
          { id: "2", title: "Task Two", due_date: "2026-09-12", priority: "Low", created_at: "", completed: false },
        ],
      })
    ) as any;

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(await screen.findByText("Task One")).toBeInTheDocument();
    expect(screen.getByText("Task Two")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
