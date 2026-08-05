import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  Category,
  ItemKind,
  RecurrenceType,
  RoutineLogRow,
  TaskPriority,
  TaskUrgency,
} from "@/types";
import { WajibOperationError } from "./errors";
import type { CreateItemInput, ItemFilterInput, ItemUpdates } from "./schemas";

export type SafeItem = {
  id: string;
  kind: ItemKind;
  created_at: string;
  title: string;
  value: TaskPriority;
  urgency: TaskUrgency;
  estimated_hours: number | null;
  category: string;
  completed?: boolean;
  recurrence_type?: RecurrenceType;
  recurrence_interval?: number;
};

type ItemRow = Omit<SafeItem, "kind"> & { user_id: string };

export type ListQuery = ItemFilterInput & {
  limit: number;
  offset: number;
  order: "asc" | "desc";
};

export interface WajibDataAccess {
  listItems(kind: ItemKind, input: ListQuery): Promise<SafeItem[]>;
  getItem(kind: ItemKind, id: string): Promise<SafeItem | null>;
  listCategories(): Promise<Category[]>;
  listRoutineCompletions(input: {
    routineId: string;
    startDate?: string;
    endDate?: string;
    limit: number;
  }): Promise<
    Array<
      Pick<
        RoutineLogRow,
        "id" | "routine_id" | "completed_day" | "completed_at"
      >
    >
  >;
  getPreferences(): Promise<{ daily_highlight_enabled: boolean }>;
  createItem(input: CreateItemInput): Promise<SafeItem>;
  updateItem(
    kind: ItemKind,
    id: string,
    updates: ItemUpdates,
  ): Promise<SafeItem>;
  setTaskCompletion(id: string, completed: boolean): Promise<SafeItem>;
  setRoutineCompletion(
    routineId: string,
    day: string,
    completed: boolean,
  ): Promise<void>;
  updatePreferences(enabled: boolean): Promise<void>;
  deleteItems(kind: ItemKind, ids: string[]): Promise<string[]>;
}

const TASK_COLUMNS =
  "id, created_at, title, completed, value, urgency, estimated_hours, user_id, category";
const ROUTINE_COLUMNS =
  "id, created_at, title, value, urgency, estimated_hours, user_id, category, recurrence_type, recurrence_interval";

const escapeLike = (value: string) => value.replace(/[\\%_]/g, "\\$&");

const toSafeItem = (kind: ItemKind, row: ItemRow): SafeItem => ({
  id: row.id,
  kind,
  created_at: row.created_at,
  title: row.title,
  value: row.value,
  urgency: row.urgency,
  estimated_hours: row.estimated_hours,
  category: row.category,
  ...(kind === "task" ? { completed: Boolean(row.completed) } : {}),
  ...(kind === "routine"
    ? {
        recurrence_type: row.recurrence_type,
        recurrence_interval: row.recurrence_interval,
      }
    : {}),
});

export class SupabaseWajibDataAccess implements WajibDataAccess {
  constructor(
    private readonly client: SupabaseClient,
    private readonly actorId: string,
  ) {}

  async listItems(kind: ItemKind, input: ListQuery) {
    const table = kind === "task" ? "tasks" : "routines";
    let query = this.client
      .from(table)
      .select(kind === "task" ? TASK_COLUMNS : ROUTINE_COLUMNS)
      .eq("user_id", this.actorId);
    if (input.query)
      query = query.ilike("title", `%${escapeLike(input.query)}%`);
    if (input.category) query = query.eq("category", input.category);
    if (input.value) query = query.eq("value", input.value);
    if (input.urgency) query = query.eq("urgency", input.urgency);
    if (typeof input.completed === "boolean") {
      if (kind !== "task") {
        throw new WajibOperationError(
          "INVALID_ARGUMENT",
          "The completed filter applies only to tasks.",
        );
      }
      query = query.eq("completed", input.completed);
    }
    if (input.recurrence_type) {
      if (kind !== "routine") {
        throw new WajibOperationError(
          "INVALID_ARGUMENT",
          "The recurrence_type filter applies only to routines.",
        );
      }
      query = query.eq("recurrence_type", input.recurrence_type);
    }
    const { data, error } = await query
      .order("created_at", { ascending: input.order === "asc" })
      .range(input.offset, input.offset + input.limit - 1);
    if (error) throw error;
    return (data ?? []).map((row) =>
      toSafeItem(kind, row as unknown as ItemRow),
    );
  }

  async getItem(kind: ItemKind, id: string) {
    const table = kind === "task" ? "tasks" : "routines";
    const { data, error } = await this.client
      .from(table)
      .select(kind === "task" ? TASK_COLUMNS : ROUTINE_COLUMNS)
      .eq("user_id", this.actorId)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? toSafeItem(kind, data as unknown as ItemRow) : null;
  }

  async listCategories() {
    const { data, error } = await this.client
      .from("categories")
      .select("slug, label, description, color")
      .order("label", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Category[];
  }

  async listRoutineCompletions(input: {
    routineId: string;
    startDate?: string;
    endDate?: string;
    limit: number;
  }) {
    let query = this.client
      .from("routine_logs")
      .select("id, routine_id, completed_day, completed_at")
      .eq("user_id", this.actorId)
      .eq("routine_id", input.routineId);
    if (input.startDate) query = query.gte("completed_day", input.startDate);
    if (input.endDate) query = query.lte("completed_day", input.endDate);
    const { data, error } = await query
      .order("completed_day", { ascending: false })
      .limit(input.limit);
    if (error) throw error;
    return (data ?? []) as Array<
      Pick<
        RoutineLogRow,
        "id" | "routine_id" | "completed_day" | "completed_at"
      >
    >;
  }

  async getPreferences() {
    const { data, error } = await this.client
      .from("user_preferences")
      .select("daily_highlight_enabled")
      .eq("user_id", this.actorId)
      .maybeSingle();
    if (error && error.code !== "PGRST116") throw error;
    return { daily_highlight_enabled: data?.daily_highlight_enabled ?? true };
  }

  async createItem(input: CreateItemInput) {
    const table = input.kind === "task" ? "tasks" : "routines";
    const row =
      input.kind === "task"
        ? {
            title: input.title,
            completed: input.completed,
            value: input.value,
            urgency: input.urgency,
            estimated_hours: input.estimated_hours,
            category: input.category,
            user_id: this.actorId,
          }
        : {
            title: input.title,
            value: input.value,
            urgency: input.urgency,
            estimated_hours: input.estimated_hours,
            category: input.category,
            user_id: this.actorId,
            recurrence_type: input.recurrence_type,
            recurrence_interval: input.recurrence_interval,
          };
    const { data, error } = await this.client
      .from(table)
      .insert(row as never)
      .select(input.kind === "task" ? TASK_COLUMNS : ROUTINE_COLUMNS)
      .single();
    if (error) throw error;
    return toSafeItem(input.kind, data as unknown as ItemRow);
  }

  async updateItem(kind: ItemKind, id: string, updates: ItemUpdates) {
    const table = kind === "task" ? "tasks" : "routines";
    const { data, error } = await this.client
      .from(table)
      .update(updates as never)
      .eq("user_id", this.actorId)
      .eq("id", id)
      .select(kind === "task" ? TASK_COLUMNS : ROUTINE_COLUMNS)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new WajibOperationError("NOT_FOUND");
    return toSafeItem(kind, data as unknown as ItemRow);
  }

  async setTaskCompletion(id: string, completed: boolean) {
    return this.updateItem("task", id, { completed } as ItemUpdates);
  }

  async setRoutineCompletion(
    routineId: string,
    day: string,
    completed: boolean,
  ) {
    if (completed) {
      const { error } = await this.client.from("routine_logs").upsert(
        {
          routine_id: routineId,
          user_id: this.actorId,
          completed_day: day,
          completed_at: new Date().toISOString(),
        } as never,
        { onConflict: "routine_id,user_id,completed_day" },
      );
      if (error) throw error;
      return;
    }
    const { error } = await this.client
      .from("routine_logs")
      .delete()
      .eq("user_id", this.actorId)
      .eq("routine_id", routineId)
      .eq("completed_day", day);
    if (error) throw error;
  }

  async updatePreferences(enabled: boolean) {
    const { error } = await this.client.from("user_preferences").upsert(
      {
        user_id: this.actorId,
        daily_highlight_enabled: enabled,
      } as never,
      { onConflict: "user_id" },
    );
    if (error) throw error;
  }

  async deleteItems(kind: ItemKind, ids: string[]) {
    const table = kind === "task" ? "tasks" : "routines";
    const { data, error } = await this.client
      .from(table)
      .delete()
      .eq("user_id", this.actorId)
      .in("id", ids)
      .select("id");
    if (error) throw error;
    return (data ?? []).map((row) => String(row.id));
  }
}
