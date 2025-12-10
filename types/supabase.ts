export type TaskPriority = "low" | "medium" | "high";
export type RecurrenceType = "none" | "daily" | "weekly" | "monthly" | "yearly";
export type ItemKind = "task" | "routine";

export type SupabaseTableName =
  | "tasks"
  | "routines"
  | "categories"
  | "recurrence_logs";

interface BaseItemRow {
  id: string;
  created_at: string;
  title: string;
  priority: TaskPriority;
  estimated_hours: number | null;
  user_id: string;
  category: string;
}

export interface TaskRow extends BaseItemRow {
  completed: boolean;
}

export interface RoutineRow extends BaseItemRow {
  recurrence_type: RecurrenceType;
  recurrence_interval: number;
  recurrence_next_occurrence: string | null;
  recurrence_last_completed: string | null;
  active: boolean;
}

export type TaskInsert = Partial<Omit<TaskRow, "id" | "created_at">> & {
  title: string;
};

export type RoutineInsert = Partial<
  Omit<RoutineRow, "id" | "created_at" | "active">
> & {
  title: string;
  recurrence_type: RecurrenceType;
  recurrence_interval: number;
};

export type TaskUpdate = Partial<TaskRow>;
export type RoutineUpdate = Partial<RoutineRow>;

// Unified shape the UI expects (mirrors legacy list_items fields).
export interface ListItem {
  id: string;
  created_at: string;
  title: string;
  completed: boolean;
  item_kind: ItemKind;
  priority: TaskPriority;
  estimated_hours: number | null;
  user_id: string;
  category: string;
  recurrence_type: RecurrenceType;
  recurrence_interval: number;
  recurrence_next_occurrence: string | null;
  recurrence_last_completed: string | null;
  active?: boolean;
}

export interface CategoryRow {
  slug: string;
  label: string;
  description: string | null;
  color: string | null;
}

export interface CategoryInsert {
  slug: string;
  label: string;
  description?: string | null;
  color?: string | null;
}

export type CategoryUpdate = Partial<CategoryRow>;

export interface RecurrenceLogRow {
  id: string;
  routine_id: string;
  user_id: string;
  completed_at: string;
}

export const taskRowToListItem = (task: TaskRow): ListItem => ({
  ...task,
  item_kind: "task",
  recurrence_type: "none",
  recurrence_interval: 1,
  recurrence_next_occurrence: null,
  recurrence_last_completed: null,
});

export const routineRowToListItem = (routine: RoutineRow): ListItem => ({
  ...routine,
  item_kind: "routine",
  completed: false,
});
