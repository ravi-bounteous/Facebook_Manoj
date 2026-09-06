import { ValidationError } from "./errors";
import { CATEGORIES, MAX_DESCRIPTION_LENGTH, MAX_TAGS, MAX_TITLE_LENGTH, PRIORITIES } from "./taskConstants";

export interface TaskInput {
  title: string;
  description?: string | null;
  due_date?: string | null;
  priority?: string | null;
  tags?: string[] | null;
  category?: string | null;
}

export interface ValidatedTask {
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string;
  tags: string[];
  category: string | null;
}

function isValidCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [, yearStr, monthStr, dayStr] = match;
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function validateTaskInput(input: TaskInput): ValidatedTask {
  if (typeof input.title !== "string") {
    throw new ValidationError("Title must be a string");
  }
  const title = input.title.trim();
  if (!title) {
    throw new ValidationError("Title is required");
  }
  if (title.length > MAX_TITLE_LENGTH) {
    throw new ValidationError(`Title must be at most ${MAX_TITLE_LENGTH} characters`);
  }

  if (input.description != null && typeof input.description !== "string") {
    throw new ValidationError("Description must be a string");
  }
  const description = input.description?.trim() ?? "";
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    throw new ValidationError(`Description must be at most ${MAX_DESCRIPTION_LENGTH} characters`);
  }

  let due_date: string | null = null;
  if (input.due_date) {
    if (!isValidCalendarDate(input.due_date)) {
      throw new ValidationError("Due date must be a valid calendar date in YYYY-MM-DD format");
    }
    due_date = input.due_date;
  }

  let priority = "medium";
  if (input.priority) {
    if (!PRIORITIES.includes(input.priority as (typeof PRIORITIES)[number])) {
      throw new ValidationError("Priority must be one of: " + PRIORITIES.join(", "));
    }
    priority = input.priority;
  }

  const rawTags = input.tags ?? [];
  if (!Array.isArray(rawTags) || !rawTags.every((tag) => typeof tag === "string")) {
    throw new ValidationError("Tags must be an array of strings");
  }
  if (rawTags.length > MAX_TAGS) {
    throw new ValidationError(`A task can have at most ${MAX_TAGS} tags`);
  }
  const tags = Array.from(new Set(rawTags));

  let category: string | null = null;
  if (input.category) {
    if (!CATEGORIES.includes(input.category as (typeof CATEGORIES)[number])) {
      throw new ValidationError("Category must be one of: " + CATEGORIES.join(", "));
    }
    category = input.category;
  }

  return {
    title,
    description: description || null,
    due_date,
    priority,
    tags,
    category,
  };
}
