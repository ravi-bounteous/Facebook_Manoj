import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TaskList } from "../../src/pages/TaskList";
import { tokenStorage } from "../../src/api/tokenStorage";

function makeToken(exp: number) {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({ sub: "1", exp }));
  return `${header}.${payload}.signature`;
}

describe("TaskList", () => {
  beforeEach(() => {
    tokenStorage.clear();
    tokenStorage.setTokens(makeToken(Math.floor(Date.now() / 1000) + 900), "refresh");
  });

  it("fetches and displays only the requesting user's tasks (AC15)", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ tasks: [{ id: "1", title: "A's task", created_at: "" }] }),
    }) as any;

    render(
      <MemoryRouter>
        <TaskList />
      </MemoryRouter>
    );

    expect(await screen.findByText("A's task")).toBeInTheDocument();
    expect(screen.queryByText("B's task")).not.toBeInTheDocument();
  });

  it("displays priority, category, due date, tags, and an edit link for each task", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        tasks: [
          {
            id: "1",
            title: "Full task",
            priority: "high",
            category: "work",
            due_date: "2026-01-15",
            tags: ["urgent", "billing"],
            created_at: "",
          },
        ],
      }),
    }) as any;

    render(
      <MemoryRouter>
        <TaskList />
      </MemoryRouter>
    );

    expect(await screen.findByText("Full task")).toBeInTheDocument();
    expect(screen.getByText(/\(high\)/)).toBeInTheDocument();
    expect(screen.getByText(/\[work\]/)).toBeInTheDocument();
    expect(screen.getByText(/due 2026-01-15/)).toBeInTheDocument();
    expect(screen.getByText(/tags: urgent, billing/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /edit full task/i })).toHaveAttribute("href", "/tasks/1/edit");
    expect(screen.getByRole("link", { name: /new task/i })).toHaveAttribute("href", "/tasks/new");
  });

  it("refreshes the access token and retries after a 401 (AC23)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ accessToken: "new-access" }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ tasks: [{ id: "2", title: "Refreshed task", created_at: "" }] }) });
    globalThis.fetch = fetchMock as any;

    render(
      <MemoryRouter>
        <TaskList />
      </MemoryRouter>
    );

    expect(await screen.findByText("Refreshed task")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(tokenStorage.getAccessToken()).toBe("new-access");
  });

  it("shows an error message when the request fails", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }) as any;

    render(
      <MemoryRouter>
        <TaskList />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  });
});
