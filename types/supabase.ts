export type TaskPriority = "low" | "medium" | "high";
export type RecurrenceType = "none" | "daily" | "weekly" | "monthly" | "yearly";
export type ItemKind = "task" | "routine";

export type SupabaseTableName = "list_items" | "categories" | "recurrence_logs";

export interface ListItemRow {
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
}

export interface ListItemInsert {
  id?: string;
  created_at?: string;
  title: string;
  completed?: boolean;
  item_kind?: ItemKind;
  priority?: TaskPriority;
  estimated_hours?: number | null;
  user_id?: string;
  category?: string;
  recurrence_type?: RecurrenceType;
  recurrence_interval?: number;
  recurrence_next_occurrence?: string | null;
  recurrence_last_completed?: string | null;
}

export type ListItemUpdate = Partial<ListItemRow>;

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
  list_item_id: string;
  user_id: string;
  completed_at: string;
}
