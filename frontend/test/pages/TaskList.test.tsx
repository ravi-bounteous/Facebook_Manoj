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

function makeFilterOptionsResponse(categories: string[] = [], tags: string[] = []) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ categories, tags }),
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

  it("fetches with the default sort params on initial mount (AC1)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(makeTasksResponse([{ id: "1", title: "A", created_at: "", due_date: null, priority: "Medium" }]));
    globalThis.fetch = fetchMock as any;

    render(
      <MemoryRouter>
        <TaskList />
      </MemoryRouter>
    );

    await screen.findByText("A");
    expect(fetchMock.mock.calls[0][0]).toMatch(/sortBy=due_date/);
    expect(fetchMock.mock.calls[0][0]).toMatch(/sortDir=asc/);
  });

  it("displays only the most recently requested response when an older request resolves later (AC10)", async () => {
    let resolveSecond: (value: any) => void;
    const secondResponse = new Promise((resolve) => {
      resolveSecond = resolve;
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(makeTasksResponse([{ id: "1", title: "Initial", created_at: "", due_date: null, priority: "Medium" }]))
      .mockResolvedValueOnce(makeFilterOptionsResponse())
      .mockReturnValueOnce(secondResponse)
      .mockResolvedValueOnce(makeTasksResponse([{ id: "3", title: "Newer", created_at: "", due_date: null, priority: "Medium" }]));
    globalThis.fetch = fetchMock as any;

    render(
      <MemoryRouter>
        <TaskList />
      </MemoryRouter>
    );

    await screen.findByText("Initial");

    fireEvent.click(screen.getByText(/priority/i));
    fireEvent.click(screen.getByText(/priority/i));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    await screen.findByText("Newer");

    resolveSecond!(makeTasksResponse([{ id: "2", title: "Older", created_at: "", due_date: null, priority: "Medium" }]));
    await new Promise((r) => setTimeout(r, 0));

    expect(screen.queryByText("Older")).not.toBeInTheDocument();
    expect(screen.getByText("Newer")).toBeInTheDocument();
  });

  it("shows all 10 tasks on a single page with no additional pages (AC8)", async () => {
    const tasks = Array.from({ length: 10 }, (_, i) => ({
      id: String(i + 1),
      title: `Task ${i + 1}`,
      created_at: "",
      due_date: null,
      priority: "Medium",
    }));
    globalThis.fetch = vi.fn().mockResolvedValue(makeTasksResponse(tasks, 1, 1)) as any;

    render(
      <MemoryRouter>
        <TaskList />
      </MemoryRouter>
    );

    for (const task of tasks) {
      expect(await screen.findByText(task.title)).toBeInTheDocument();
    }
    expect(screen.getByText(/page 1 of 1/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
  });

  it("splits 11 tasks across two pages with 10 on page 1 and 1 on page 2 (AC9)", async () => {
    const page1Tasks = Array.from({ length: 10 }, (_, i) => ({
      id: String(i + 1),
      title: `Task ${i + 1}`,
      created_at: "",
      due_date: null,
      priority: "Medium",
    }));
    const page2Tasks = [{ id: "11", title: "Task 11", created_at: "", due_date: null, priority: "Medium" }];
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(makeTasksResponse(page1Tasks, 1, 2))
      .mockResolvedValueOnce(makeFilterOptionsResponse())
      .mockResolvedValueOnce(makeTasksResponse(page2Tasks, 2, 2));
    globalThis.fetch = fetchMock as any;

    render(
      <MemoryRouter>
        <TaskList />
      </MemoryRouter>
    );

    for (const task of page1Tasks) {
      expect(await screen.findByText(task.title)).toBeInTheDocument();
    }
    expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    expect(await screen.findByText("Task 11")).toBeInTheDocument();
    expect(screen.getByText(/page 2 of 2/i)).toBeInTheDocument();
    expect(screen.queryByText("Task 1")).not.toBeInTheDocument();
  });

  it("refreshes the access token and retries after a 401 (AC23)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ accessToken: "new-access" }) })
      .mockResolvedValueOnce(makeTasksResponse([{ id: "2", title: "Refreshed task", created_at: "", due_date: null, priority: "Medium" }]))
      .mockResolvedValueOnce(makeFilterOptionsResponse());
    globalThis.fetch = fetchMock as any;

    render(
      <MemoryRouter>
        <TaskList />
      </MemoryRouter>
    );

    expect(await screen.findByText("Refreshed task")).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
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
      .mockResolvedValueOnce(makeFilterOptionsResponse())
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
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[2][0]).toMatch(/sortBy=priority/);
    expect(fetchMock.mock.calls[2][0]).toMatch(/sortDir=asc/);

    fireEvent.click(screen.getByText(/priority/i));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    expect(fetchMock.mock.calls[3][0]).toMatch(/sortDir=desc/);
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

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5));
    const lastCallUrl = fetchMock.mock.calls[4][0];
    expect(lastCallUrl).toMatch(/sortBy=priority/);
    expect(lastCallUrl).toMatch(/sortDir=asc/);
  });

  it("navigates between pages and updates the page indicator, disabling controls at bounds (AC4, AC5, AC14, AC15)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(makeTasksResponse([{ id: "1", title: "Page1Task", created_at: "", due_date: null, priority: "Medium" }], 1, 2))
      .mockResolvedValueOnce(makeFilterOptionsResponse())
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
    expect(fetchMock.mock.calls[2][0]).toMatch(/page=2/);
  });

  it("toggles an incomplete task to complete (AC1)", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        makeTasksResponse([{ id: "1", title: "A's task", created_at: "", due_date: null, priority: "Medium", completed: false }])
      )
      .mockResolvedValueOnce(makeFilterOptionsResponse())
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
      .mockResolvedValueOnce(makeFilterOptionsResponse())
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
      )
      .mockResolvedValueOnce(makeFilterOptionsResponse());
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
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it("does not delete the task when Escape dismisses the dialog (AC4)", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        makeTasksResponse([{ id: "1", title: "A's task", created_at: "", due_date: null, priority: "Medium", completed: false }])
      )
      .mockResolvedValueOnce(makeFilterOptionsResponse());
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
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it("permanently deletes the task when the dialog is confirmed (AC3)", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        makeTasksResponse([{ id: "1", title: "A's task", created_at: "", due_date: null, priority: "Medium", completed: false }])
      )
      .mockResolvedValueOnce(makeFilterOptionsResponse())
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
      .mockResolvedValueOnce(makeFilterOptionsResponse())
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
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  describe("search and filtering", () => {
    it("filters the list by search text without an explicit submit (AC1, AC16)", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          makeTasksResponse([
            { id: "1", title: "Meeting", created_at: "", due_date: null, priority: "Medium" },
            { id: "2", title: "SecondTask", created_at: "", due_date: null, priority: "Medium" },
          ])
        )
        .mockResolvedValueOnce(makeFilterOptionsResponse())
        .mockResolvedValueOnce(
          makeTasksResponse([{ id: "1", title: "Meeting", created_at: "", due_date: null, priority: "Medium" }])
        );
      globalThis.fetch = fetchMock as any;

      render(
        <MemoryRouter>
          <TaskList />
        </MemoryRouter>
      );

      await screen.findByText("Meeting");
      await screen.findByText("SecondTask");

      fireEvent.change(screen.getByLabelText(/search/i), { target: { value: "meet" } });

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
      expect(fetchMock.mock.calls[2][0]).toMatch(/search=meet/);
      await waitFor(() => {
        expect(screen.getByText("Meeting")).toBeInTheDocument();
        expect(screen.queryByText("SecondTask")).not.toBeInTheDocument();
      });
    });

    it("shows the empty-state message when filters match no tasks (AC5)", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          makeTasksResponse([{ id: "1", title: "Meeting", created_at: "", due_date: null, priority: "Medium" }])
        )
        .mockResolvedValueOnce(makeFilterOptionsResponse())
        .mockResolvedValueOnce(makeTasksResponse([]));
      globalThis.fetch = fetchMock as any;

      render(
        <MemoryRouter>
          <TaskList />
        </MemoryRouter>
      );

      await screen.findByText("Meeting");
      fireEvent.change(screen.getByLabelText(/search/i), { target: { value: "nomatch" } });

      expect(await screen.findByText(/no tasks/i)).toBeInTheDocument();
    });

    it("clears all filters and restores the unfiltered list (AC6)", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          makeTasksResponse([
            { id: "1", title: "Meeting", created_at: "", due_date: null, priority: "Medium" },
            { id: "2", title: "Groceries", created_at: "", due_date: null, priority: "Medium" },
          ])
        )
        .mockResolvedValueOnce(makeFilterOptionsResponse())
        .mockResolvedValueOnce(makeTasksResponse([{ id: "1", title: "Meeting", created_at: "", due_date: null, priority: "Medium" }]))
        .mockResolvedValueOnce(
          makeTasksResponse([
            { id: "1", title: "Meeting", created_at: "", due_date: null, priority: "Medium" },
            { id: "2", title: "Groceries", created_at: "", due_date: null, priority: "Medium" },
          ])
        );
      globalThis.fetch = fetchMock as any;

      render(
        <MemoryRouter>
          <TaskList />
        </MemoryRouter>
      );

      await screen.findByText("Meeting");
      fireEvent.change(screen.getByLabelText(/search/i), { target: { value: "meet" } });
      await waitFor(() => expect(screen.queryByText("Groceries")).not.toBeInTheDocument());

      fireEvent.click(screen.getByRole("button", { name: /clear filters/i }));

      await waitFor(() => expect(screen.getByText("Groceries")).toBeInTheDocument());
      expect(screen.getByLabelText(/search/i)).toHaveValue("");
    });

    it("shows a validation error and does not apply the filter when start date is after end date (AC9, AC10)", async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        makeTasksResponse([{ id: "1", title: "Meeting", created_at: "", due_date: null, priority: "Medium" }])
      );
      globalThis.fetch = fetchMock as any;

      render(
        <MemoryRouter>
          <TaskList />
        </MemoryRouter>
      );

      await screen.findByText("Meeting");
      fireEvent.change(screen.getByLabelText(/due from/i), { target: { value: "2026-01-10" } });
      await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(1));
      const callCountBefore = fetchMock.mock.calls.length;

      fireEvent.change(screen.getByLabelText(/due to/i), { target: { value: "2026-01-05" } });

      expect(await screen.findByText(/start date.*after.*end date/i)).toBeInTheDocument();
      expect(fetchMock.mock.calls.length).toBe(callCountBefore);
    });

    it("populates category and tag dropdown options from the filter-options endpoint, including values absent from the visible tasks (AC11)", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          makeTasksResponse([{ id: "1", title: "WorkTask", created_at: "", due_date: null, priority: "Medium" }])
        )
        .mockResolvedValueOnce(makeFilterOptionsResponse(["Work", "Archived"], ["urgent", "billing"]));
      globalThis.fetch = fetchMock as any;

      render(
        <MemoryRouter>
          <TaskList />
        </MemoryRouter>
      );

      await screen.findByText("WorkTask");

      await waitFor(() => {
        expect(screen.getByRole("option", { name: "Archived" })).toBeInTheDocument();
      });
      expect(screen.getByRole("option", { name: "Work" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "urgent" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "billing" })).toBeInTheDocument();
    });

    it("shows an error when the filter-options endpoint fails", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          makeTasksResponse([{ id: "1", title: "WorkTask", created_at: "", due_date: null, priority: "Medium" }])
        )
        .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });
      globalThis.fetch = fetchMock as any;

      render(
        <MemoryRouter>
          <TaskList />
        </MemoryRouter>
      );

      await screen.findByText("WorkTask");

      expect(await screen.findByRole("alert")).toHaveTextContent(/failed to load filter options/i);
    });

    it("shows an error when the filter-options request rejects with a network error", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          makeTasksResponse([{ id: "1", title: "WorkTask", created_at: "", due_date: null, priority: "Medium" }])
        )
        .mockRejectedValueOnce(new Error("network down"));
      globalThis.fetch = fetchMock as any;

      render(
        <MemoryRouter>
          <TaskList />
        </MemoryRouter>
      );

      await screen.findByText("WorkTask");

      expect(await screen.findByRole("alert")).toHaveTextContent(/failed to load filter options/i);
    });

    it("replaces the previous category selection when a different one is chosen (AC14)", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          makeTasksResponse([
            { id: "1", title: "WorkTask", created_at: "", due_date: null, priority: "Medium" },
            { id: "2", title: "PersonalTask", created_at: "", due_date: null, priority: "Medium" },
          ])
        )
        .mockResolvedValueOnce(makeFilterOptionsResponse(["Work", "Personal"]))
        .mockResolvedValueOnce(
          makeTasksResponse([{ id: "1", title: "WorkTask", created_at: "", due_date: null, priority: "Medium" }])
        )
        .mockResolvedValueOnce(
          makeTasksResponse([{ id: "2", title: "PersonalTask", created_at: "", due_date: null, priority: "Medium" }])
        );
      globalThis.fetch = fetchMock as any;

      render(
        <MemoryRouter>
          <TaskList />
        </MemoryRouter>
      );

      await screen.findByText("WorkTask");

      fireEvent.change(screen.getByLabelText(/category/i), { target: { value: "Work" } });
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
      expect(fetchMock.mock.calls[2][0]).toMatch(/category=Work/);
      await waitFor(() => {
        expect(screen.getByText("WorkTask")).toBeInTheDocument();
        expect(screen.queryByText("PersonalTask")).not.toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/category/i), { target: { value: "Personal" } });
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
      expect(fetchMock.mock.calls[3][0]).toMatch(/category=Personal/);
      expect(fetchMock.mock.calls[3][0]).not.toMatch(/category=Work/);
      await waitFor(() => {
        expect(screen.getByText("PersonalTask")).toBeInTheDocument();
        expect(screen.queryByText("WorkTask")).not.toBeInTheDocument();
      });
    });

    it("resets pagination to page 1 while preserving sort order when a filter changes (AC17, AC18)", async () => {
      const page2Tasks = [{ id: "2", title: "Page2Task", created_at: "", due_date: null, priority: "Medium" }];
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          makeTasksResponse([{ id: "1", title: "Page1Task", created_at: "", due_date: null, priority: "Medium" }], 1, 2)
        )
        .mockResolvedValueOnce(makeFilterOptionsResponse())
        .mockResolvedValueOnce(makeTasksResponse(page2Tasks, 1, 2))
        .mockResolvedValueOnce(makeTasksResponse(page2Tasks, 2, 2))
        .mockResolvedValueOnce(makeTasksResponse([{ id: "1", title: "Page1Task", created_at: "", due_date: null, priority: "Medium" }], 1, 1));
      globalThis.fetch = fetchMock as any;

      render(
        <MemoryRouter>
          <TaskList />
        </MemoryRouter>
      );

      await screen.findByText("Page1Task");
      fireEvent.click(screen.getByRole("button", { name: /priority/i }));
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
      fireEvent.click(screen.getByRole("button", { name: /next/i }));
      await screen.findByText("Page2Task");

      fireEvent.change(screen.getByLabelText(/search/i), { target: { value: "task" } });

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5));
      const lastCallUrl = fetchMock.mock.calls[4][0];
      expect(lastCallUrl).toMatch(/page=1/);
      expect(lastCallUrl).toMatch(/sortBy=priority/);
      expect(lastCallUrl).toMatch(/sortDir=asc/);
    });

    it("resets filters to defaults on remount (AC15)", async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        makeTasksResponse([{ id: "1", title: "Meeting", created_at: "", due_date: null, priority: "Medium" }])
      );
      globalThis.fetch = fetchMock as any;

      const { unmount } = render(
        <MemoryRouter>
          <TaskList />
        </MemoryRouter>
      );

      await screen.findByText("Meeting");
      fireEvent.change(screen.getByLabelText(/search/i), { target: { value: "meet" } });
      await waitFor(() => expect(screen.getByLabelText(/search/i)).toHaveValue("meet"));

      unmount();

      render(
        <MemoryRouter>
          <TaskList />
        </MemoryRouter>
      );

      await screen.findByText("Meeting");
      expect(screen.getByLabelText(/search/i)).toHaveValue("");
    });
  });
});
