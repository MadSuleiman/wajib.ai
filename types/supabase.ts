export type TaskPriority = "low" | "medium" | "high";
export type TaskUrgency = "low" | "medium" | "high";
export type RecurrenceType = "none" | "daily" | "weekly" | "monthly" | "yearly";
export type ItemKind = "task" | "routine";

export type SupabaseTableName =
  | "tasks"
  | "routines"
  | "categories"
  | "routine_logs"
  | "user_preferences";

interface BaseItemRow {
  id: string;
  created_at: string;
  title: string;
  value: TaskPriority;
  urgency: TaskUrgency;
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
}

export type TaskInsert = Partial<Omit<TaskRow, "id" | "created_at">> & {
  title: string;
};

export type RoutineInsert = Partial<Omit<RoutineRow, "id" | "created_at">> & {
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
  value: TaskPriority;
  priority: TaskPriority;
  urgency: TaskUrgency;
  estimated_hours: number | null;
  user_id: string;
  category: string;
  recurrence_type: RecurrenceType;
  recurrence_interval: number;
  sync_status?: "synced" | "pending";
  local_only?: boolean;
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

export interface RoutineLogRow {
  id: string;
  routine_id: string;
  user_id: string;
  completed_day: string;
  completed_at: string;
}

export interface UserPreferencesRow {
  user_id: string;
  daily_highlight_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export type UserPreferencesInsert = Partial<
  Omit<UserPreferencesRow, "created_at" | "updated_at">
> & {
  user_id: string;
};

export type UserPreferencesUpdate = Partial<UserPreferencesRow>;

type RowWithLegacyPriority = {
  value?: TaskPriority | null;
  priority?: TaskPriority | null;
};

const resolveItemValue = (row: RowWithLegacyPriority): TaskPriority =>
  row.value ?? row.priority ?? "medium";

export const taskRowToListItem = (task: TaskRow): ListItem => {
  const value = resolveItemValue(task as TaskRow & RowWithLegacyPriority);
  return {
    ...task,
    value,
    priority: value,
    urgency: task.urgency ?? "medium",
    item_kind: "task",
    recurrence_type: "none",
    recurrence_interval: 1,
    sync_status: "synced",
    local_only: false,
  };
};

export const routineRowToListItem = (routine: RoutineRow): ListItem => {
  const value = resolveItemValue(routine as RoutineRow & RowWithLegacyPriority);
  return {
    ...routine,
    value,
    priority: value,
    urgency: routine.urgency ?? "medium",
    item_kind: "routine",
    completed: false,
    sync_status: "synced",
    local_only: false,
  };
};
