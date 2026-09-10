import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Dashboard } from "../../src/pages/Dashboard";
import { tokenStorage } from "../../src/api/tokenStorage";

function makeToken(exp: number) {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({ sub: "1", exp }));
  return `${header}.${payload}.signature`;
}

function makeCountsResponse(counts: any) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ counts }),
  };
}

function makeUpcomingResponse(upcoming: any[]) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ upcoming }),
  };
}

const ERROR_RESPONSE = { ok: false, status: 500, json: async () => ({ error: "Server error" }) };

function mockFetchByUrl(handlers: { counts: any; upcoming: any }) {
  return vi.fn().mockImplementation((url: string) => {
    if (url.includes("/dashboard/counts")) return Promise.resolve(handlers.counts);
    if (url.includes("/dashboard/upcoming")) return Promise.resolve(handlers.upcoming);
    return Promise.reject(new Error(`Unexpected fetch: ${url}`));
  });
}

describe("Dashboard", () => {
  beforeEach(() => {
    tokenStorage.clear();
    tokenStorage.setTokens(makeToken(Math.floor(Date.now() / 1000) + 900), "refresh");
  });

  it("shows the four summary counts once data loads (AC1)", async () => {
    globalThis.fetch = mockFetchByUrl({
      counts: makeCountsResponse({ total: 5, completed: 2, pending: 3, overdue: 1 }),
      upcoming: makeUpcomingResponse([]),
    }) as any;

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

  it("shows a preview list of upcoming tasks (AC2)", async () => {
    globalThis.fetch = mockFetchByUrl({
      counts: makeCountsResponse({ total: 1, completed: 0, pending: 1, overdue: 0 }),
      upcoming: makeUpcomingResponse([
        { id: "1", title: "Task A", due_date: "2026-09-11", priority: "Medium", created_at: "", completed: false },
      ]),
    }) as any;

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(await screen.findByText("Task A")).toBeInTheDocument();
  });

  it("shows the empty-state message when no tasks are due in the next 7 days (AC3)", async () => {
    globalThis.fetch = mockFetchByUrl({
      counts: makeCountsResponse({ total: 0, completed: 0, pending: 0, overdue: 0 }),
      upcoming: makeUpcomingResponse([]),
    }) as any;

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(await screen.findByText("No upcoming tasks due in the next 7 days")).toBeInTheDocument();
  });

  it("does not render a 'view all' control even with many upcoming tasks (AC18)", async () => {
    const upcoming = Array.from({ length: 9 }, (_, i) => ({
      id: String(i),
      title: `Task ${i}`,
      due_date: "2026-09-11",
      priority: "Medium",
      created_at: "",
      completed: false,
    }));
    globalThis.fetch = mockFetchByUrl({
      counts: makeCountsResponse({ total: 9, completed: 0, pending: 9, overdue: 0 }),
      upcoming: makeUpcomingResponse(upcoming),
    }) as any;

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await screen.findByText("Task 0");
    expect(screen.queryByText(/view all/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/see all/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("shows independent loading indicators for counts and upcoming sections (AC20)", async () => {
    let resolveCounts: (value: any) => void;
    let resolveUpcoming: (value: any) => void;
    const countsPending = new Promise((resolve) => {
      resolveCounts = resolve;
    });
    const upcomingPending = new Promise((resolve) => {
      resolveUpcoming = resolve;
    });
    globalThis.fetch = mockFetchByUrl({ counts: countsPending, upcoming: upcomingPending }) as any;

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(screen.getByTestId("counts-loading")).toBeInTheDocument();
    expect(screen.getByTestId("upcoming-loading")).toBeInTheDocument();

    resolveCounts!(makeCountsResponse({ total: 0, completed: 0, pending: 0, overdue: 0 }));
    await waitFor(() => expect(screen.queryByTestId("counts-loading")).not.toBeInTheDocument());
    expect(screen.getByTestId("upcoming-loading")).toBeInTheDocument();

    resolveUpcoming!(makeUpcomingResponse([]));
    await waitFor(() => expect(screen.queryByTestId("upcoming-loading")).not.toBeInTheDocument());
  });

  it("shows an error only in the counts section when the counts fetch fails and upcoming succeeds (AC19)", async () => {
    globalThis.fetch = mockFetchByUrl({
      counts: ERROR_RESPONSE,
      upcoming: makeUpcomingResponse([
        { id: "1", title: "Task A", due_date: "2026-09-11", priority: "Medium", created_at: "", completed: false },
      ]),
    }) as any;

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(await screen.findByTestId("counts-error")).toBeInTheDocument();
    expect(screen.queryByTestId("upcoming-error")).not.toBeInTheDocument();
    expect(await screen.findByText("Task A")).toBeInTheDocument();
  });

  it("shows an error only in the upcoming section when the upcoming fetch fails and counts succeeds (AC19)", async () => {
    globalThis.fetch = mockFetchByUrl({
      counts: makeCountsResponse({ total: 5, completed: 2, pending: 3, overdue: 1 }),
      upcoming: ERROR_RESPONSE,
    }) as any;

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(await screen.findByTestId("upcoming-error")).toBeInTheDocument();
    expect(screen.queryByTestId("counts-error")).not.toBeInTheDocument();
    expect(await screen.findByText("5")).toBeInTheDocument();
  });
});
