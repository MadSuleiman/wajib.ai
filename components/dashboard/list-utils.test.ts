import { describe, expect, it } from "bun:test";

import {
  groupItems,
  sortConfigFromValue,
  sortItems,
  sortItemsByPriority,
  type BaseItem,
} from "@/components/dashboard/list-utils";
import type { TaskPriority, TaskUrgency } from "@/types";

type Item = BaseItem & {
  priority: TaskPriority;
  urgency: TaskUrgency;
  estimated_hours?: number | null;
};

const makeItem = (
  id: string,
  createdAt: string,
  priority: TaskPriority,
  urgency: TaskUrgency,
  title: string,
  estimatedHours?: number | null,
): Item => ({
  id,
  created_at: createdAt,
  priority,
  urgency,
  title,
  completed: false,
  estimated_hours: estimatedHours,
});

describe("list utils", () => {
  it("sorts by priority then newest created_at", () => {
    const items: Item[] = [
      makeItem("a", "2026-01-01T09:00:00.000Z", "medium", "medium", "B"),
      makeItem("b", "2026-01-01T11:00:00.000Z", "high", "low", "A"),
      makeItem("c", "2026-01-01T10:00:00.000Z", "high", "high", "C"),
      makeItem("d", "2026-01-01T12:00:00.000Z", "low", "medium", "D"),
    ];

    const sorted = sortItemsByPriority(items);
    expect(sorted.map((item) => item.id)).toEqual(["b", "c", "a", "d"]);
  });

  it("sorts by title ascending and descending", () => {
    const items: Item[] = [
      makeItem("a", "2026-01-01T09:00:00.000Z", "medium", "medium", "Zed"),
      makeItem("b", "2026-01-01T09:00:00.000Z", "medium", "medium", "alpha"),
      makeItem("c", "2026-01-01T09:00:00.000Z", "medium", "medium", "Beta"),
    ];

    const asc = sortItems(items, { key: "title", direction: "asc" });
    const desc = sortItems(items, { key: "title", direction: "desc" });

    expect(asc.map((item) => item.id)).toEqual(["b", "c", "a"]);
    expect(desc.map((item) => item.id)).toEqual(["a", "c", "b"]);
  });

  it("sorts by hours with created_at tie-breaker", () => {
    const items: Item[] = [
      makeItem("a", "2026-01-01T10:00:00.000Z", "medium", "medium", "A", 2),
      makeItem("b", "2026-01-01T08:00:00.000Z", "medium", "medium", "B", 1),
      makeItem("c", "2026-01-01T12:00:00.000Z", "medium", "medium", "C", 1),
    ];

    const asc = sortItems(items, { key: "hours", direction: "asc" });
    const desc = sortItems(items, { key: "hours", direction: "desc" });

    expect(asc.map((item) => item.id)).toEqual(["b", "c", "a"]);
    expect(desc.map((item) => item.id)).toEqual(["a", "c", "b"]);
  });

  it("groups by priority labels", () => {
    const items: Item[] = [
      makeItem("a", "2026-01-01T09:00:00.000Z", "medium", "medium", "A"),
      makeItem("b", "2026-01-01T11:00:00.000Z", "high", "low", "B"),
      makeItem("c", "2026-01-01T12:00:00.000Z", "low", "high", "C"),
      makeItem("d", "2026-01-01T13:00:00.000Z", "high", "high", "D"),
    ];

    const grouped = groupItems(items, "priority");
    expect(grouped.map((group) => group.label)).toEqual([
      "High priority",
      "Medium priority",
      "Low priority",
    ]);
    expect(grouped[0].items.map((item) => item.id)).toEqual(["b", "d"]);
  });

  it("groups by date in descending day order", () => {
    const items: Item[] = [
      makeItem("a", "2026-01-01T09:00:00.000Z", "medium", "medium", "A"),
      makeItem("b", "2026-01-02T11:00:00.000Z", "high", "low", "B"),
      makeItem("c", "2026-01-02T12:00:00.000Z", "low", "high", "C"),
    ];

    const grouped = groupItems(items, "date");
    expect(grouped.length).toBe(2);
    expect(grouped[0].items.map((item) => item.id)).toEqual(["b", "c"]);
    expect(grouped[1].items.map((item) => item.id)).toEqual(["a"]);
  });

  it("maps sort option string to sort config", () => {
    expect(sortConfigFromValue("priority:desc")).toEqual({
      key: "priority",
      direction: "desc",
    });
    expect(sortConfigFromValue("title:asc")).toEqual({
      key: "title",
      direction: "asc",
    });
  });
});
