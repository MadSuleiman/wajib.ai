export type TaskPriority = "low" | "medium" | "high";

export type SupabaseTableName = "list_items" | "categories";

export interface ListItemRow {
  id: string;
  created_at: string;
  title: string;
  completed: boolean;
  priority: TaskPriority;
  estimated_hours: number | null;
  user_id: string;
  category: string;
}

export interface ListItemInsert {
  id?: string;
  created_at?: string;
  title: string;
  completed?: boolean;
  priority?: TaskPriority;
  estimated_hours?: number | null;
  user_id?: string;
  category?: string;
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
