import { redirect } from "next/navigation";

import { sortItemsByPriority } from "@/components/dashboard/list-utils";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { Category, ListItem } from "@/types";
import { routineRowToListItem, taskRowToListItem } from "@/types/supabase";

const DEFAULT_DAILY_HIGHLIGHT_ENABLED = true;

export type DashboardBootstrapData = {
  userId: string;
  items: ListItem[];
  categories: Category[];
  dailyHighlightEnabled: boolean;
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
      supabase.from("tasks").select("*"),
      supabase.from("routines").select("*"),
      supabase.from("categories").select("*"),
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

  return {
    userId: user.id,
    items,
    categories: (categoriesResult.data ?? []) as Category[],
    dailyHighlightEnabled:
      preferencesResult.data?.daily_highlight_enabled ??
      DEFAULT_DAILY_HIGHLIGHT_ENABLED,
  };
}
