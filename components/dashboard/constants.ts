import type {
  ItemGroupMode,
  SortKey,
  SortOptionValue,
} from "@/components/dashboard/list-utils";
import type { RecurrenceType } from "@/types";

import type { StatusFilter } from "./types";

export const groupingOptions: ReadonlyArray<{
  label: string;
  value: ItemGroupMode;
}> = [
  { label: "Month", value: "month" },
  { label: "Week", value: "week" },
  { label: "Day", value: "date" },
  { label: "Value", value: "priority" },
  { label: "No grouping", value: "none" },
];

export const sortOptions: ReadonlyArray<{
  label: string;
  value: SortOptionValue;
}> = [
  { label: "Value (high → low)", value: "priority:desc" },
  { label: "Value (low → high)", value: "priority:asc" },
  { label: "Urgency (high → low)", value: "urgency:desc" },
  { label: "Urgency (low → high)", value: "urgency:asc" },
  { label: "Newest first", value: "date:desc" },
  { label: "Oldest first", value: "date:asc" },
  { label: "Title A → Z", value: "title:asc" },
  { label: "Title Z → A", value: "title:desc" },
  { label: "Hours (high → low)", value: "hours:desc" },
  { label: "Hours (low → high)", value: "hours:asc" },
];

export const statusOptions: ReadonlyArray<{
  label: string;
  value: StatusFilter;
}> = [
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
  { label: "All", value: "all" },
];

export const defaultSortValue: SortOptionValue = "priority:desc";

export const columnIdBySortKey: Record<SortKey, string | undefined> = {
  priority: "priority",
  urgency: "urgency",
  date: "added",
  title: "title",
  hours: "hours",
};

export const sortKeyByColumnId: Record<string, SortKey | undefined> = {
  priority: "priority",
  title: "title",
  urgency: "urgency",
  added: "date",
  hours: "hours",
};

export const recurrenceOptions: ReadonlyArray<{
  label: string;
  value: RecurrenceType;
  description: string;
}> = [
  { label: "One-time", value: "none", description: "Does not repeat" },
  { label: "Daily", value: "daily", description: "Repeats every N day(s)" },
  { label: "Weekly", value: "weekly", description: "Repeats every N week(s)" },
  {
    label: "Monthly",
    value: "monthly",
    description: "Repeats every N month(s)",
  },
  { label: "Yearly", value: "yearly", description: "Repeats every N year(s)" },
];

export const recurrenceLabelMap: Record<RecurrenceType, string> =
  recurrenceOptions.reduce(
    (acc, option) => ({ ...acc, [option.value]: option.label }),
    {} as Record<RecurrenceType, string>,
  );
