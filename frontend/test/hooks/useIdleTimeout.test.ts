import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useIdleTimeout } from "../../src/hooks/useIdleTimeout";

describe("useIdleTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("invokes onIdle after the configured idle period elapses with no activity (AC14)", () => {
    const onIdle = vi.fn();
    renderHook(() => useIdleTimeout(1000, onIdle));

    vi.advanceTimersByTime(1000);

    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it("does not call onIdle if activity occurs before the timeout elapses (AC14)", () => {
    const onIdle = vi.fn();
    renderHook(() => useIdleTimeout(1000, onIdle));

    vi.advanceTimersByTime(600);
    window.dispatchEvent(new Event("keydown"));
    vi.advanceTimersByTime(600);

    expect(onIdle).not.toHaveBeenCalled();

    vi.advanceTimersByTime(400);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });
});
