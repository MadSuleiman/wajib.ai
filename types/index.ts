import { Database, TaskPriority } from "./supabase";

// Database row types
export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type ShoppingItem =
  Database["public"]["Tables"]["shopping_items"]["Row"];
export type WatchItem = Database["public"]["Tables"]["watch_items"]["Row"];

// Database insert types
export type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
export type ShoppingItemInsert =
  Database["public"]["Tables"]["shopping_items"]["Insert"];
export type WatchItemInsert =
  Database["public"]["Tables"]["watch_items"]["Insert"];

// Database update types
export type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];
export type ShoppingItemUpdate =
  Database["public"]["Tables"]["shopping_items"]["Update"];
export type WatchItemUpdate =
  Database["public"]["Tables"]["watch_items"]["Update"];

// Re-export priority type
export type { TaskPriority };
