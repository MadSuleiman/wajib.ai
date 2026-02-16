import { describe, expect, it } from "bun:test";

import {
  routineRowToListItem,
  taskRowToListItem,
  type RoutineRow,
  type TaskRow,
} from "@/types/supabase";

describe("supabase row mappers", () => {
  it("maps task rows to list items with task defaults", () => {
    const task: TaskRow = {
      id: "task-1",
      created_at: "2026-01-01T10:00:00.000Z",
      title: "Task A",
      value: "high",
      urgency: "low",
      estimated_hours: 2,
      user_id: "user-1",
      category: "task",
      completed: true,
    };

    const mapped = taskRowToListItem(task);

    expect(mapped.item_kind).toBe("task");
    expect(mapped.recurrence_type).toBe("none");
    expect(mapped.recurrence_interval).toBe(1);
    expect(mapped.completed).toBe(true);
    expect(mapped.urgency).toBe("low");
  });

  it("falls back urgency to medium when task urgency is missing", () => {
    const task = {
      id: "task-2",
      created_at: "2026-01-01T10:00:00.000Z",
      title: "Task B",
      value: "medium",
      urgency: undefined,
      estimated_hours: null,
      user_id: "user-1",
      category: "task",
      completed: false,
    } as unknown as TaskRow;

    const mapped = taskRowToListItem(task);
    expect(mapped.urgency).toBe("medium");
  });

  it("maps routine rows to list items with routine defaults", () => {
    const routine: RoutineRow = {
      id: "routine-1",
      created_at: "2026-01-01T10:00:00.000Z",
      title: "Routine A",
      value: "low",
      urgency: "high",
      estimated_hours: 1,
      user_id: "user-1",
      category: "task",
      recurrence_type: "weekly",
      recurrence_interval: 2,
    };

    const mapped = routineRowToListItem(routine);

    expect(mapped.item_kind).toBe("routine");
    expect(mapped.completed).toBe(false);
    expect(mapped.recurrence_type).toBe("weekly");
    expect(mapped.recurrence_interval).toBe(2);
    expect(mapped.urgency).toBe("high");
  });
});
