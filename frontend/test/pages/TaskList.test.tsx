import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { TaskList } from "../../src/pages/TaskList";
import { tokenStorage } from "../../src/api/tokenStorage";

function makeTasksResponse(tasks: any[], page = 1, totalPages = 1) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ tasks, page, pageSize: 10, totalCount: tasks.length, totalPages }),
  };
}

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
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(makeTasksResponse([{ id: "1", title: "A's task", created_at: "", due_date: null, priority: "Medium" }])) as any;

    render(
      <MemoryRouter>
        <TaskList />
      </MemoryRouter>
    );

    expect(await screen.findByText("A's task")).toBeInTheDocument();
    expect(screen.queryByText("B's task")).not.toBeInTheDocument();
  });

  it("refreshes the access token and retries after a 401 (AC23)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ accessToken: "new-access" }) })
      .mockResolvedValueOnce(makeTasksResponse([{ id: "2", title: "Refreshed task", created_at: "", due_date: null, priority: "Medium" }]));
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

  it("shows an empty-state message when there are no tasks (AC6)", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(makeTasksResponse([])) as any;

    render(
      <MemoryRouter>
        <TaskList />
      </MemoryRouter>
    );

    expect(await screen.findByText(/no tasks/i)).toBeInTheDocument();
  });

  it("clicking a column header toggles sort direction and re-fetches (AC3, AC10)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(makeTasksResponse([{ id: "1", title: "A", created_at: "", due_date: null, priority: "Medium" }]))
      .mockResolvedValueOnce(makeTasksResponse([{ id: "1", title: "A", created_at: "", due_date: null, priority: "Medium" }]))
      .mockResolvedValueOnce(makeTasksResponse([{ id: "1", title: "A", created_at: "", due_date: null, priority: "Medium" }]));
    globalThis.fetch = fetchMock as any;

    render(
      <MemoryRouter>
        <TaskList />
      </MemoryRouter>
    );

    await screen.findByText("A");

    fireEvent.click(screen.getByText(/priority/i));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[1][0]).toMatch(/sortBy=priority/);
    expect(fetchMock.mock.calls[1][0]).toMatch(/sortDir=asc/);

    fireEvent.click(screen.getByText(/priority/i));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[2][0]).toMatch(/sortDir=desc/);
  });

  it("rapid repeated clicks on the same header resolve to the last requested direction (AC10)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeTasksResponse([{ id: "1", title: "A", created_at: "", due_date: null, priority: "Medium" }]));
    globalThis.fetch = fetchMock as any;

    render(
      <MemoryRouter>
        <TaskList />
      </MemoryRouter>
    );

    await screen.findByText("A");

    fireEvent.click(screen.getByText(/priority/i));
    fireEvent.click(screen.getByText(/priority/i));
    fireEvent.click(screen.getByText(/priority/i));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    const lastCallUrl = fetchMock.mock.calls[3][0];
    expect(lastCallUrl).toMatch(/sortBy=priority/);
    expect(lastCallUrl).toMatch(/sortDir=asc/);
  });

  it("navigates between pages and updates the page indicator, disabling controls at bounds (AC4, AC5, AC14, AC15)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(makeTasksResponse([{ id: "1", title: "Page1Task", created_at: "", due_date: null, priority: "Medium" }], 1, 2))
      .mockResolvedValueOnce(makeTasksResponse([{ id: "2", title: "Page2Task", created_at: "", due_date: null, priority: "Medium" }], 2, 2));
    globalThis.fetch = fetchMock as any;

    render(
      <MemoryRouter>
        <TaskList />
      </MemoryRouter>
    );

    await screen.findByText("Page1Task");
    expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /next/i })).not.toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    await screen.findByText("Page2Task");
    expect(screen.getByText(/page 2 of 2/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
    expect(fetchMock.mock.calls[1][0]).toMatch(/page=2/);
  });

  it("toggles an incomplete task to complete (AC1)", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        makeTasksResponse([{ id: "1", title: "A's task", created_at: "", due_date: null, priority: "Medium", completed: false }])
      )
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ task: { id: "1", title: "A's task", created_at: "", due_date: null, priority: "Medium", completed: true } }),
      });
    globalThis.fetch = fetchMock as any;

    render(
      <MemoryRouter>
        <TaskList />
      </MemoryRouter>
    );

    const checkbox = await screen.findByRole("checkbox", { name: /a's task/i });
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);

    await waitFor(() => expect(checkbox).toBeChecked());
    expect(fetchMock).toHaveBeenCalledWith("/api/tasks/1", expect.objectContaining({ method: "PATCH" }));
  });

  it("toggles a complete task back to incomplete (AC2)", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        makeTasksResponse([{ id: "1", title: "A's task", created_at: "", due_date: null, priority: "Medium", completed: true }])
      )
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ task: { id: "1", title: "A's task", created_at: "", due_date: null, priority: "Medium", completed: false } }),
      });
    globalThis.fetch = fetchMock as any;

    render(
      <MemoryRouter>
        <TaskList />
      </MemoryRouter>
    );

    const checkbox = await screen.findByRole("checkbox", { name: /a's task/i });
    expect(checkbox).toBeChecked();

    await user.click(checkbox);

    await waitFor(() => expect(checkbox).not.toBeChecked());
  });

  it("does not delete the task when the confirmation dialog is cancelled (AC4)", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        makeTasksResponse([{ id: "1", title: "A's task", created_at: "", due_date: null, priority: "Medium", completed: false }])
      );
    globalThis.fetch = fetchMock as any;

    render(
      <MemoryRouter>
        <TaskList />
      </MemoryRouter>
    );

    await screen.findByText("A's task");
    await user.click(screen.getByRole("button", { name: /delete a's task/i }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("A's task")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not delete the task when Escape dismisses the dialog (AC4)", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        makeTasksResponse([{ id: "1", title: "A's task", created_at: "", due_date: null, priority: "Medium", completed: false }])
      );
    globalThis.fetch = fetchMock as any;

    render(
      <MemoryRouter>
        <TaskList />
      </MemoryRouter>
    );

    await screen.findByText("A's task");
    await user.click(screen.getByRole("button", { name: /delete a's task/i }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("A's task")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("permanently deletes the task when the dialog is confirmed (AC3)", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        makeTasksResponse([{ id: "1", title: "A's task", created_at: "", due_date: null, priority: "Medium", completed: false }])
      )
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });
    globalThis.fetch = fetchMock as any;

    render(
      <MemoryRouter>
        <TaskList />
      </MemoryRouter>
    );

    await screen.findByText("A's task");
    await user.click(screen.getByRole("button", { name: /delete a's task/i }));
    await user.click(screen.getByRole("button", { name: /confirm/i }));

    await waitFor(() => expect(screen.queryByText("A's task")).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith("/api/tasks/1", expect.objectContaining({ method: "DELETE" }));
  });

  it("shows an error and refetches when toggling a task already deleted elsewhere (AC7)", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        makeTasksResponse([{ id: "1", title: "A's task", created_at: "", due_date: null, priority: "Medium", completed: false }])
      )
      .mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({ error: "Task not found" }) })
      .mockResolvedValueOnce(makeTasksResponse([]));
    globalThis.fetch = fetchMock as any;

    render(
      <MemoryRouter>
        <TaskList />
      </MemoryRouter>
    );

    const checkbox = await screen.findByRole("checkbox", { name: /a's task/i });
    await user.click(checkbox);

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    await waitFor(() => expect(screen.queryByText("A's task")).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
