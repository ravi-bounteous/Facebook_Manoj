import { CATEGORIES, MAX_DESCRIPTION_LENGTH, MAX_TAGS, MAX_TITLE_LENGTH, PRIORITIES } from "./taskConstants";

export interface TaskFormValues {
  title: string;
  description: string;
  due_date: string;
  priority: string;
  tags: string[];
  category: string;
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

export function validateTaskForm(values: TaskFormValues): string | null {
  if (!values.title.trim()) {
    return "Title is required";
  }
  if (values.title.trim().length > MAX_TITLE_LENGTH) {
    return `Title must be at most ${MAX_TITLE_LENGTH} characters`;
  }
  if (values.description.trim().length > MAX_DESCRIPTION_LENGTH) {
    return `Description must be at most ${MAX_DESCRIPTION_LENGTH} characters`;
  }
  if (values.due_date && !isValidCalendarDate(values.due_date)) {
    return "Due date must be a valid calendar date in YYYY-MM-DD format";
  }
  if (values.priority && !PRIORITIES.includes(values.priority as (typeof PRIORITIES)[number])) {
    return "Priority must be low, medium, or high";
  }
  if (values.tags.length > MAX_TAGS) {
    return `You can add at most ${MAX_TAGS} tags`;
  }
  if (values.category && !CATEGORIES.includes(values.category as (typeof CATEGORIES)[number])) {
    return "Category must be one of the predefined values";
  }
  return null;
}
