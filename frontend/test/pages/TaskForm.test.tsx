import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TaskForm } from "../../src/pages/TaskForm";
import * as taskApi from "../../src/api/taskApi";

function renderCreate() {
  return render(
    <MemoryRouter initialEntries={["/tasks/new"]}>
      <Routes>
        <Route path="/tasks/new" element={<TaskForm />} />
        <Route path="/tasks/:id/edit" element={<TaskForm />} />
        <Route path="/tasks" element={<div>Task List</div>} />
      </Routes>
    </MemoryRouter>
  );
}

function renderEdit(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/tasks/${id}/edit`]}>
      <Routes>
        <Route path="/tasks/new" element={<TaskForm />} />
        <Route path="/tasks/:id/edit" element={<TaskForm />} />
        <Route path="/tasks" element={<div>Task List</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("TaskForm create mode", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("submits with only a title (AC1, AC2)", async () => {
    const createSpy = vi.spyOn(taskApi, "createTask").mockResolvedValue({} as any);

    renderCreate();
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Buy milk" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({ title: "Buy milk" })));
    expect(await screen.findByText(/task list/i)).toBeInTheDocument();
  });

  it("shows a validation error for a blank title and does not call the API (AC3, AC4)", async () => {
    const createSpy = vi.spyOn(taskApi, "createTask").mockResolvedValue({} as any);

    renderCreate();
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(createSpy).not.toHaveBeenCalled();

    const titleInput = screen.getByLabelText(/title/i) as HTMLInputElement;
    expect(titleInput).toHaveAttribute("required");
    expect(titleInput).toHaveAttribute("aria-required", "true");
  });

  it("shows a validation error for a whitespace-only title (AC28, AC29)", async () => {
    const createSpy = vi.spyOn(taskApi, "createTask").mockResolvedValue({} as any);

    renderCreate();
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("rejects more than 5 tags and accepts exactly 5 tags (AC5, AC6, AC12)", async () => {
    const createSpy = vi.spyOn(taskApi, "createTask").mockResolvedValue({} as any);

    renderCreate();
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Task" } });
    fireEvent.change(screen.getByLabelText(/tags/i), { target: { value: "a,b,c,d,e,f" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(createSpy).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/tags/i), { target: { value: "a,b,c,d,e" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({ tags: ["a", "b", "c", "d", "e"] })));
  });

  it("rejects an invalid due date and accepts today's date (AC8, AC9, AC14)", async () => {
    const createSpy = vi.spyOn(taskApi, "createTask").mockResolvedValue({} as any);

    renderCreate();
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Task" } });
    fireEvent.change(screen.getByLabelText(/due date/i), { target: { value: "2026-13-40" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(createSpy).not.toHaveBeenCalled();

    const today = new Date().toISOString().slice(0, 10);
    fireEvent.change(screen.getByLabelText(/due date/i), { target: { value: today } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({ due_date: today })));
  });

  it("submits with no category selected (AC21)", async () => {
    const createSpy = vi.spyOn(taskApi, "createTask").mockResolvedValue({} as any);

    renderCreate();
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Task" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({ category: undefined })));
  });
});

describe("TaskForm edit mode", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("pre-populates the form and saves changes (AC10, AC11)", async () => {
    vi.spyOn(taskApi, "getTask").mockResolvedValue({
      id: "task-1",
      title: "Original",
      description: null,
      due_date: null,
      priority: "medium",
      tags: [],
      category: null,
      created_at: "",
      updated_at: "",
    });
    const updateSpy = vi.spyOn(taskApi, "updateTask").mockResolvedValue({} as any);

    renderEdit("task-1");

    expect(await screen.findByDisplayValue("Original")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/^title/i), { target: { value: "Updated" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => expect(updateSpy).toHaveBeenCalledWith("task-1", expect.objectContaining({ title: "Updated" })));
    expect(await screen.findByText(/task list/i)).toBeInTheDocument();
  });

  it("shows a permission error on 403 and does not navigate (AC17, AC18)", async () => {
    vi.spyOn(taskApi, "getTask").mockRejectedValue(new taskApi.ApiError(403, "You do not have permission to edit this task"));

    renderEdit("task-1");

    expect(await screen.findByRole("alert")).toHaveTextContent(/permission/i);
  });

  it("shows a not-found error on 404 and redirects to the task list (AC19, AC20)", async () => {
    vi.spyOn(taskApi, "getTask").mockRejectedValue(new taskApi.ApiError(404, "Task not found"));

    renderEdit("task-1");

    expect(await screen.findByText(/task list/i)).toBeInTheDocument();
  });
});
