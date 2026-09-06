import { describe, it, expect } from "vitest";
import { validateTaskForm } from "../src/taskValidators";
import { MAX_DESCRIPTION_LENGTH } from "../src/taskConstants";

function baseValues(overrides: Partial<Parameters<typeof validateTaskForm>[0]> = {}) {
  return {
    title: "Task",
    description: "",
    due_date: "",
    priority: "",
    tags: [] as string[],
    category: "",
    ...overrides,
  };
}

describe("validateTaskForm description length", () => {
  it("validates the trimmed description length, matching backend behavior", () => {
    const description = "a".repeat(MAX_DESCRIPTION_LENGTH) + "   ";
    expect(validateTaskForm(baseValues({ description }))).toBeNull();
  });

  it("rejects a description whose trimmed length exceeds the limit", () => {
    const description = "a".repeat(MAX_DESCRIPTION_LENGTH + 1);
    expect(validateTaskForm(baseValues({ description }))).toMatch(/description/i);
  });
});
