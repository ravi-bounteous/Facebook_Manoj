import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import * as taskApi from "../api/taskApi";
import { CATEGORIES, PRIORITIES } from "../taskConstants";
import { validateTaskForm } from "../taskValidators";

export function TaskForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (!isEdit || !id) return;

    let cancelled = false;

    async function loadTask() {
      try {
        const task = await taskApi.getTask(id!);
        if (cancelled) return;
        setTitle(task.title);
        setDescription(task.description || "");
        setDueDate(task.due_date ? task.due_date.slice(0, 10) : "");
        setPriority(task.priority || "");
        setTagsInput((task.tags || []).join(", "));
        setCategory(task.category || "");
      } catch (err) {
        if (cancelled) return;
        if (err instanceof taskApi.ApiError && err.status === 404) {
          setError("Task not found");
          navigate("/tasks");
          return;
        }
        if (err instanceof taskApi.ApiError && err.status === 403) {
          setError("You do not have permission to edit this task");
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load task");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadTask();

    return () => {
      cancelled = true;
    };
  }, [id, isEdit, navigate]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const tags = tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    const validationError = validateTaskForm({
      title,
      description,
      due_date: dueDate,
      priority,
      tags,
      category,
    });

    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      due_date: dueDate || undefined,
      priority: priority || undefined,
      tags,
      category: category || undefined,
    };

    try {
      if (isEdit && id) {
        await taskApi.updateTask(id, payload);
      } else {
        await taskApi.createTask(payload);
      }
      navigate("/tasks");
    } catch (err) {
      if (err instanceof taskApi.ApiError && err.status === 404) {
        setError("Task not found");
        navigate("/tasks");
        return;
      }
      if (err instanceof taskApi.ApiError && err.status === 403) {
        setError("You do not have permission to edit this task");
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to save task");
    }
  }

  if (loading) {
    return <p>Loading...</p>;
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h1>{isEdit ? "Edit Task" : "New Task"}</h1>

      <label htmlFor="task-title">Title</label>
      <input
        id="task-title"
        type="text"
        required
        aria-required="true"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <label htmlFor="task-description">Description</label>
      <textarea id="task-description" value={description} onChange={(e) => setDescription(e.target.value)} />

      <label htmlFor="task-due-date">Due date</label>
      <input id="task-due-date" type="text" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />

      <label htmlFor="task-priority">Priority</label>
      <select id="task-priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
        <option value="">Default (medium)</option>
        {PRIORITIES.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>

      <label htmlFor="task-tags">Tags (comma-separated, up to 5)</label>
      <input id="task-tags" type="text" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} />

      <label htmlFor="task-category">Category</label>
      <select id="task-category" value={category} onChange={(e) => setCategory(e.target.value)}>
        <option value="">No category</option>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      {error && <p role="alert">{error}</p>}

      <button type="submit">Save</button>
    </form>
  );
}
