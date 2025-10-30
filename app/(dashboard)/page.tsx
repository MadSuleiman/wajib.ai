import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { Task, ShoppingItem, WatchItem } from "@/types";
import { sortItemsByPriority } from "@/components/list-utils";
import UnifiedDashboard from "@/components/unified-dashboard";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const rawView = sp?.view;
  const viewParam = Array.isArray(rawView) ? rawView[0] : rawView;
  const supabase = await createServerSupabaseClient();

  const [{ data: tasksData }, { data: shoppingData }, { data: watchData }] =
    await Promise.all([
      supabase.from("tasks").select("*"),
      supabase.from("shopping_items").select("*"),
      supabase.from("watch_items").select("*"),
    ]);

  const tasks = sortItemsByPriority((tasksData || []) as Task[]);
  const shoppingItems = sortItemsByPriority(
    (shoppingData || []) as ShoppingItem[],
  );
  const watchItems = sortItemsByPriority((watchData || []) as WatchItem[]);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/auth");
  }

  return (
    <UnifiedDashboard
      initialTasks={tasks}
      initialShoppingItems={shoppingItems}
      initialWatchItems={watchItems}
      initialView={
        (viewParam as "tasks" | "shopping" | "watch" | "settings") || "tasks"
      }
    />
  );
}
