import { redirect } from "next/navigation";

import { sortItemsByPriority } from "@/components/dashboard/list-utils";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { Category, ListItem } from "@/types";
import { routineRowToListItem, taskRowToListItem } from "@/types/supabase";

const DEFAULT_DAILY_HIGHLIGHT_ENABLED = true;
const TASK_COLUMNS =
  "id, created_at, title, completed, value, urgency, estimated_hours, user_id, category";
const ROUTINE_COLUMNS =
  "id, created_at, title, value, urgency, estimated_hours, user_id, category, recurrence_type, recurrence_interval";
const CATEGORY_COLUMNS = "slug, label, description, color";

export type DashboardBootstrapData = {
  userId: string;
  items: ListItem[];
  categories: Category[];
  dailyHighlightEnabled: boolean;
  lastSyncAt: string;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return String(error);
};

export async function loadDashboardBootstrapData(): Promise<DashboardBootstrapData> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/auth");
  }

  const [tasksResult, routinesResult, categoriesResult, preferencesResult] =
    await Promise.all([
      supabase.from("tasks").select(TASK_COLUMNS).eq("user_id", user.id),
      supabase.from("routines").select(ROUTINE_COLUMNS).eq("user_id", user.id),
      supabase.from("categories").select(CATEGORY_COLUMNS),
      supabase
        .from("user_preferences")
        .select("daily_highlight_enabled")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

  if (tasksResult.error) {
    throw new Error(
      `Failed to load tasks: ${getErrorMessage(tasksResult.error)}`,
    );
  }

  if (routinesResult.error) {
    throw new Error(
      `Failed to load routines: ${getErrorMessage(routinesResult.error)}`,
    );
  }

  if (categoriesResult.error) {
    throw new Error(
      `Failed to load categories: ${getErrorMessage(categoriesResult.error)}`,
    );
  }

  if (preferencesResult.error && preferencesResult.error.code !== "PGRST116") {
    console.error("Failed to load user preferences", preferencesResult.error);
  }

  const items = sortItemsByPriority([
    ...(tasksResult.data ?? []).map((task) => taskRowToListItem(task)),
    ...(routinesResult.data ?? []).map((routine) =>
      routineRowToListItem(routine),
    ),
  ]);
  const lastSyncAt = new Date().toISOString();

  return {
    userId: user.id,
    items,
    categories: (categoriesResult.data ?? []) as Category[],
    dailyHighlightEnabled:
      preferencesResult.data?.daily_highlight_enabled ??
      DEFAULT_DAILY_HIGHLIGHT_ENABLED,
    lastSyncAt,
  };
}
