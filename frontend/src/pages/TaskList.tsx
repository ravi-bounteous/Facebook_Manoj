import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "../api/authApi";
import { LogoutButton } from "../components/LogoutButton";

interface Task {
  id: string;
  title: string;
  description?: string | null;
  created_at: string;
  completed: boolean;
  due_date: string | null;
  priority: string;
  category?: string | null;
  tags?: string[] | null;
}

type SortColumn = "due_date" | "priority" | "created_at";
type SortDirection = "asc" | "desc";

const COLUMNS: { id: SortColumn; label: string }[] = [
  { id: "due_date", label: "Due Date" },
  { id: "priority", label: "Priority" },
  { id: "created_at", label: "Created" },
];

const PRIORITY_OPTIONS = ["Low", "Medium", "High"];

function buildQueryString(params: {
  sortBy: SortColumn;
  sortDir: SortDirection;
  page: number;
  search: string;
  status: string;
  priorities: string[];
  tags: string[];
  category: string;
  dueFrom: string;
  dueTo: string;
}): string {
  const query = new URLSearchParams();
  query.set("sortBy", params.sortBy);
  query.set("sortDir", params.sortDir);
  query.set("page", String(params.page));

  const trimmedSearch = params.search.trim();
  if (trimmedSearch) query.set("search", trimmedSearch);
  if (params.status) query.set("status", params.status);
  for (const priority of params.priorities) query.append("priority", priority);
  for (const tag of params.tags) query.append("tag", tag);
  if (params.category) query.set("category", params.category);
  if (params.dueFrom) query.set("dueFrom", params.dueFrom);
  if (params.dueTo) query.set("dueTo", params.dueTo);

  return query.toString();
}

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortColumn>("due_date");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState("");
  const [priorities, setPriorities] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [dueFrom, setDueFrom] = useState("");
  const [dueTo, setDueTo] = useState("");
  const [dateRangeError, setDateRangeError] = useState<string | null>(null);
  const [knownCategories, setKnownCategories] = useState<string[]>([]);
  const [knownTags, setKnownTags] = useState<string[]>([]);
  const [filterOptionsError, setFilterOptionsError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);
  const latestRequestIdRef = useRef(0);
  const filterOptionsFetchedRef = useRef(false);

  const dateRangeInvalid = !!dueFrom && !!dueTo && dueFrom > dueTo;

  const loadTasks = useCallback(
    async (options: { preserveError?: boolean } = {}) => {
      if (dateRangeInvalid) return;
      const requestId = ++latestRequestIdRef.current;
      setLoading(true);
      try {
        const query = buildQueryString({ sortBy, sortDir, page, search, status, priorities, tags, category, dueFrom, dueTo });
        const res = await apiFetch(`/tasks?${query}`);
        if (requestId !== latestRequestIdRef.current) return;
        if (!res.ok) {
          throw new Error("Failed to load tasks");
        }
        const data = await res.json();
        if (requestId !== latestRequestIdRef.current) return;
        setTasks(data.tasks);
        setTotalPages(data.totalPages);
        setKnownCategories((prev) =>
          Array.from(new Set([...prev, ...data.tasks.map((t: Task) => t.category).filter((c: unknown): c is string => !!c)]))
        );
        setKnownTags((prev) =>
          Array.from(new Set([...prev, ...data.tasks.flatMap((t: Task) => t.tags ?? [])]))
        );
        if (!options.preserveError) {
          setError(null);
        }
      } catch {
        if (requestId !== latestRequestIdRef.current) return;
        setError("Failed to load tasks");
      } finally {
        if (requestId === latestRequestIdRef.current) {
          setLoading(false);
          setInitialLoad(false);
        }
      }
    },
    [sortBy, sortDir, page, search, status, priorities, tags, category, dueFrom, dueTo, dateRangeInvalid]
  );

  useEffect(() => {
    if (dueFrom && dueTo && dueFrom > dueTo) {
      setDateRangeError("Start date must not be after end date.");
      return;
    }
    setDateRangeError(null);
  }, [dueFrom, dueTo]);

  useEffect(() => {
    if (dateRangeInvalid) return;
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadTasks]);

  useEffect(() => {
    if (initialLoad || filterOptionsFetchedRef.current) return;
    filterOptionsFetchedRef.current = true;
    apiFetch("/tasks/filter-options")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load filter options");
        return res.json();
      })
      .then((data) => {
        setKnownCategories((prev) => Array.from(new Set([...prev, ...(data.categories ?? [])])));
        setKnownTags((prev) => Array.from(new Set([...prev, ...(data.tags ?? [])])));
      })
      .catch(() => {
        setFilterOptionsError("Failed to load filter options. Category and tag lists may be incomplete.");
      });
  }, [initialLoad]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setPage(1);
      setSearch(searchInput);
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  function handleFilterChange() {
    setPage(1);
  }

  function handleSearchChange(value: string) {
    setSearchInput(value);
  }

  function handleStatusChange(value: string) {
    handleFilterChange();
    setStatus(value);
  }

  function handlePriorityToggle(value: string, checked: boolean) {
    handleFilterChange();
    setPriorities((prev) => (checked ? [...prev, value] : prev.filter((p) => p !== value)));
  }

  function handleTagsChange(selected: string[]) {
    handleFilterChange();
    setTags(selected);
  }

  function handleCategoryChange(value: string) {
    handleFilterChange();
    setCategory(value);
  }

  function handleDueFromChange(value: string) {
    handleFilterChange();
    setDueFrom(value);
  }

  function handleDueToChange(value: string) {
    handleFilterChange();
    setDueTo(value);
  }

  function handleClearFilters() {
    handleFilterChange();
    setSearchInput("");
    setSearch("");
    setStatus("");
    setPriorities([]);
    setTags([]);
    setCategory("");
    setDueFrom("");
    setDueTo("");
  }

  async function handleToggle(taskId: string) {
    try {
      const res = await apiFetch(`/tasks/${taskId}`, { method: "PATCH" });
      if (!res.ok) {
        if (res.status === 404) {
          setError("This task no longer exists. Refreshing your task list.");
          await loadTasks({ preserveError: true });
          return;
        }
        setError("Failed to update task");
        return;
      }
      const data = await res.json();
      setTasks((prev) => prev.map((task) => (task.id === taskId ? data.task : task)));
      setError(null);
    } catch {
      setError("Network error. Please try again.");
    }
  }

  function openDeleteConfirmation(taskId: string) {
    lastFocusedElementRef.current = document.activeElement as HTMLElement | null;
    setPendingDeleteId(taskId);
  }

  function closeDeleteConfirmation() {
    setPendingDeleteId(null);
    lastFocusedElementRef.current?.focus();
    lastFocusedElementRef.current = null;
  }

  async function handleConfirmDelete(taskId: string) {
    setPendingDeleteId(null);
    lastFocusedElementRef.current?.focus();
    lastFocusedElementRef.current = null;
    try {
      const res = await apiFetch(`/tasks/${taskId}`, { method: "DELETE" });
      if (!res.ok) {
        if (res.status === 404) {
          setError("This task no longer exists. Refreshing your task list.");
          await loadTasks({ preserveError: true });
          return;
        }
        setError("Failed to delete task");
        return;
      }
      setTasks((prev) => prev.filter((task) => task.id !== taskId));
      setError(null);
    } catch {
      setError("Network error. Please try again.");
    }
  }

  const pendingDeleteTask = tasks.find((task) => task.id === pendingDeleteId) ?? null;

  useEffect(() => {
    if (!pendingDeleteTask) return;

    confirmButtonRef.current?.focus();
    rootRef.current?.setAttribute("inert", "");

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeDeleteConfirmation();
        return;
      }
      if (e.key === "Tab") {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      rootRef.current?.removeAttribute("inert");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingDeleteTask]);

  function handleHeaderClick(columnId: SortColumn) {
    setSortDir((currentDir) => {
      if (sortBy === columnId) {
        return currentDir === "asc" ? "desc" : "asc";
      }
      return "asc";
    });
    setSortBy(columnId);
    setPage(1);
  }

  return (
    <div>
      <div ref={rootRef}>
        <h1>Task List</h1>
        <div>
          <label>
            Search
            <input type="text" value={searchInput} onChange={(e) => handleSearchChange(e.target.value)} />
          </label>
          <label>
            Status
            <select value={status} onChange={(e) => handleStatusChange(e.target.value)}>
              <option value="">All</option>
              <option value="completed">Completed</option>
              <option value="incomplete">Incomplete</option>
            </select>
          </label>
          <fieldset>
            <legend>Importance</legend>
            {PRIORITY_OPTIONS.map((option) => (
              <label key={option}>
                <input
                  type="checkbox"
                  checked={priorities.includes(option)}
                  onChange={(e) => handlePriorityToggle(option, e.target.checked)}
                />
                {option}
              </label>
            ))}
          </fieldset>
          <label>
            Tag
            <select
              multiple
              value={tags}
              onChange={(e) => handleTagsChange(Array.from(e.target.selectedOptions).map((o) => o.value))}
            >
              {knownTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </label>
          <label>
            Category
            <select value={category} onChange={(e) => handleCategoryChange(e.target.value)}>
              <option value="">All</option>
              {knownCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </label>
          <label>
            Due from
            <input type="date" value={dueFrom} onChange={(e) => handleDueFromChange(e.target.value)} />
          </label>
          <label>
            Due to
            <input type="date" value={dueTo} onChange={(e) => handleDueToChange(e.target.value)} />
          </label>
          <button type="button" onClick={handleClearFilters}>
            Clear filters
          </button>
          {dateRangeError && <p role="alert">{dateRangeError}</p>}
          {filterOptionsError && <p role="alert">{filterOptionsError}</p>}
        </div>
        {initialLoad && loading && <p>Loading...</p>}
        {error && <p role="alert">{error}</p>}
        {!initialLoad && !error && (
          <>
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  {COLUMNS.map((column) => (
                    <th key={column.id}>
                      <button type="button" onClick={() => handleHeaderClick(column.id)}>
                        {column.label}
                        {sortBy === column.id ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                      </button>
                    </th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id}>
                    <td>
                      <label>
                        <input
                          type="checkbox"
                          checked={task.completed}
                          aria-label={task.title}
                          onChange={() => handleToggle(task.id)}
                        />
                        {task.title}
                      </label>
                    </td>
                    <td>{task.due_date ?? ""}</td>
                    <td>{task.priority}</td>
                    <td>{task.created_at}</td>
                    <td>
                      <button
                        type="button"
                        aria-label={`Delete ${task.title}`}
                        onClick={() => openDeleteConfirmation(task.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {tasks.length === 0 && <p>No tasks to display.</p>}
            <div>
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </div>
          </>
        )}
        <LogoutButton />
      </div>
      {pendingDeleteTask && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Confirm delete ${pendingDeleteTask.title}`}
          style={{ position: "fixed", inset: 0, zIndex: 1 }}
        >
          <div
            className="dialog-overlay"
            onClick={closeDeleteConfirmation}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
            }}
          />
          <div style={{ position: "relative", zIndex: 1 }}>
            <p>Delete "{pendingDeleteTask.title}"? This cannot be undone.</p>
            <button ref={confirmButtonRef} type="button" onClick={() => handleConfirmDelete(pendingDeleteTask.id)}>
              Confirm
            </button>
            <button type="button" onClick={closeDeleteConfirmation}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
