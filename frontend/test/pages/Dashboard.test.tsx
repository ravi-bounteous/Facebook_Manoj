import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Dashboard } from "../../src/pages/Dashboard";
import { tokenStorage } from "../../src/api/tokenStorage";

function makeToken(exp: number) {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({ sub: "1", exp }));
  return `${header}.${payload}.signature`;
}

function makeDashboardResponse(overrides: Partial<{
  totalCount: number;
  completedCount: number;
  pendingCount: number;
  overdueCount: number;
  upcomingTasks: { id: string; title: string; due_date: string | null }[];
}> = {}) {
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

describe("Dashboard", () => {
  beforeEach(() => {
    tokenStorage.clear();
    tokenStorage.setTokens(makeToken(Math.floor(Date.now() / 1000) + 900), "refresh");
  });

  it("renders the four summary counts (AC1)", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(makeDashboardResponse({ totalCount: 5, completedCount: 2, pendingCount: 3, overdueCount: 1 })) as any;

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await screen.findByText("5");
    expect(screen.getByText("Total").nextElementSibling).toHaveTextContent("5");
    expect(screen.getByText("Completed").nextElementSibling).toHaveTextContent("2");
    expect(screen.getByText("Pending").nextElementSibling).toHaveTextContent("3");
    expect(screen.getByText("Overdue").nextElementSibling).toHaveTextContent("1");
  });

  it("renders the upcoming preview list (AC2)", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      makeDashboardResponse({
        upcomingTasks: [{ id: "1", title: "Finish report", due_date: "2026-09-12" }],
      })
    ) as any;

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(await screen.findByText(/finish report/i)).toBeInTheDocument();
  });

  it("shows the exact empty-state message when no tasks are due within 7 days (AC3)", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(makeDashboardResponse()) as any;

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(await screen.findByText("No upcoming tasks due in the next 7 days")).toBeInTheDocument();
  });

  it("does not render a link to a full upcoming-tasks view even with many upcoming tasks (AC18)", async () => {
    const upcomingTasks = Array.from({ length: 9 }, (_, i) => ({
      id: String(i),
      title: `Task ${i}`,
      due_date: "2026-09-12",
    }));
    globalThis.fetch = vi.fn().mockResolvedValue(makeDashboardResponse({ upcomingTasks })) as any;

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await screen.findByText(/task 0/i);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
});
