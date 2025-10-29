export type TaskPriority = "low" | "medium" | "high";

export type SupabaseTableName = "tasks" | "shopping_items" | "watch_items";

export interface TaskRow {
  id: string;
  created_at: string;
  title: string;
  completed: boolean;
  priority: TaskPriority;
  estimated_hours: number | null;
  user_id: string;
}

export interface TaskInsert {
  id?: string;
  created_at?: string;
  title: string;
  completed?: boolean;
  priority?: TaskPriority;
  estimated_hours?: number | null;
  user_id?: string;
}

export type TaskUpdate = Partial<TaskRow>;

export interface ShoppingItemRow {
  id: string;
  created_at: string;
  title: string;
  completed: boolean;
  priority: TaskPriority;
  user_id: string;
}

export interface ShoppingItemInsert {
  id?: string;
  created_at?: string;
  title?: string;
  completed?: boolean;
  priority?: TaskPriority;
  user_id?: string;
}

export type ShoppingItemUpdate = Partial<ShoppingItemRow>;

export interface WatchItemRow {
  id: string;
  created_at: string;
  title: string;
  completed: boolean;
  priority: TaskPriority;
  estimated_hours: number | null;
  user_id: string;
}

export interface WatchItemInsert {
  id?: string;
  created_at?: string;
  title?: string;
  completed?: boolean;
  priority?: TaskPriority;
  estimated_hours?: number | null;
  user_id?: string;
}

export type WatchItemUpdate = Partial<WatchItemRow>;
