import {
  AlarmClock,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Clock3,
  Flame,
} from "lucide-react";
import {
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";

import type { TaskPriority, TaskUrgency } from "@/types";

export interface BaseItem {
  id: string;
  title: string;
  completed: boolean;
  created_at: string;
}

export const priorityIcons = {
  low: <ArrowDown className="h-4 w-4 text-blue-500" />,
  medium: <ArrowRight className="h-4 w-4 text-yellow-500" />,
  high: <ArrowUp className="h-4 w-4 text-red-500" />,
};

export const priorityLabels = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const priorityOrder: Record<TaskPriority, number> = {
  high: 1,
  medium: 2,
  low: 3,
};

export const urgencyIcons = {
  low: <Clock3 className="h-4 w-4 text-emerald-500" />,
  medium: <AlarmClock className="h-4 w-4 text-amber-500" />,
  high: <Flame className="h-4 w-4 text-rose-500" />,
};

export const urgencyLabels: Record<TaskUrgency, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const urgencyOrder: Record<TaskUrgency, number> = {
  high: 1,
  medium: 2,
  low: 3,
};

export const sortItemsByPriority = <
  T extends { priority: TaskPriority; created_at: string },
>(
  items: T[],
): T[] => {
  return [...items].sort((a, b) => {
    const priorityComparison =
      priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityComparison !== 0) {
      return priorityComparison;
    }
    // If priorities are the same, sort by creation date (newest first)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
};

export type ItemGroupMode = "date" | "week" | "month" | "priority" | "none";

export type SortKey = "priority" | "urgency" | "date" | "title" | "hours";
export type SortDirection = "asc" | "desc";

export interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

export interface GroupedItems<T> {
  label: string;
  items: T[];
}

export const sortItems = <
  T extends BaseItem & {
    priority: TaskPriority;
    urgency: TaskUrgency;
    title: string;
  },
>(
  items: T[],
  config: SortConfig,
): T[] => {
  const { key, direction } = config;
  const multiplier = direction === "asc" ? 1 : -1;

  switch (key) {
    case "title":
      return [...items].sort(
        (a, b) =>
          multiplier *
          a.title.localeCompare(b.title, undefined, {
            sensitivity: "base",
          }),
      );
    case "date":
      return [...items].sort(
        (a, b) =>
          multiplier *
          (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
      );
    case "hours":
      return [...items].sort((aItem, bItem) => {
        const aHours =
          "estimated_hours" in aItem &&
          typeof aItem.estimated_hours === "number"
            ? aItem.estimated_hours
            : 0;
        const bHours =
          "estimated_hours" in bItem &&
          typeof bItem.estimated_hours === "number"
            ? bItem.estimated_hours
            : 0;

        if (aHours === bHours) {
          return (
            multiplier *
            (new Date(aItem.created_at).getTime() -
              new Date(bItem.created_at).getTime())
          );
        }
        return multiplier * (aHours - bHours);
      });
    case "urgency":
      if (direction === "asc") {
        return [...items].sort(
          (a, b) =>
            urgencyOrder[b.urgency] - urgencyOrder[a.urgency] ||
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );
      }
      return [...items].sort(
        (a, b) =>
          urgencyOrder[a.urgency] - urgencyOrder[b.urgency] ||
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    case "priority":
    default:
      if (direction === "asc") {
        return [...items].sort(
          (a, b) =>
            priorityOrder[b.priority] - priorityOrder[a.priority] ||
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );
      }
      return sortItemsByPriority(items);
  }
};

export const groupItems = <T extends BaseItem & { priority: TaskPriority }>(
  items: T[],
  mode: ItemGroupMode,
): GroupedItems<T>[] => {
  if (mode === "none") {
    return items.length ? [{ label: "All items", items }] : [];
  }

  if (mode === "priority") {
    return (Object.keys(priorityOrder) as TaskPriority[])
      .sort((a, b) => priorityOrder[a] - priorityOrder[b])
      .map((priority) => ({
        label: `${priorityLabels[priority]} priority`,
        items: items.filter((item) => item.priority === priority),
      }))
      .filter((group) => group.items.length > 0);
  }

  type TimedGroup = {
    label: string;
    items: T[];
    sortValue: number;
  };

  const groups = new Map<string, TimedGroup>();
  const weekOptions = { weekStartsOn: 1 as const };

  for (const item of items) {
    const date = new Date(item.created_at);

    let key: string;
    let label: string;
    let sortValue: number;

    switch (mode) {
      case "month": {
        const monthStart = startOfMonth(date);
        key = format(monthStart, "yyyy-MM");
        label = formatMonthLabel(monthStart);
        sortValue = monthStart.getTime();
        break;
      }
      case "week": {
        const weekStart = startOfWeek(date, weekOptions);
        key = format(weekStart, "yyyy-MM-dd");
        label = formatWeekLabel(weekStart);
        sortValue = weekStart.getTime();
        break;
      }
      case "date":
      default: {
        const dayStart = startOfDay(date);
        key = format(dayStart, "yyyy-MM-dd");
        label = formatDateLabel(dayStart);
        sortValue = dayStart.getTime();
        break;
      }
    }

    if (!groups.has(key)) {
      groups.set(key, {
        label,
        items: [],
        sortValue,
      });
    }

    groups.get(key)!.items.push(item);
  }

  return Array.from(groups.values())
    .sort((a, b) => b.sortValue - a.sortValue)
    .map(({ label, items: groupedItems }) => ({
      label,
      items: groupedItems,
    }));
};

export const formatDateLabel = (dateInput: string | Date) => {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  return format(date, "PPP");
};

export const formatMonthLabel = (dateInput: string | Date) => {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  return format(date, "LLLL yyyy");
};

export const formatWeekLabel = (dateInput: string | Date) => {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  return `Week of ${format(weekStart, "MMM d, yyyy")}`;
};

export const formatWeekRange = (dateInput: string | Date) => {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
  return `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`;
};

export type SortOptionValue = `${SortKey}:${SortDirection}`;

export const sortConfigFromValue = (value: SortOptionValue): SortConfig => {
  const [key, direction] = value.split(":") as [SortKey, SortDirection];
  return { key, direction };
};
