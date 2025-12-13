import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { Category, ListItem } from "@/types";
import { routineRowToListItem, taskRowToListItem } from "@/types/supabase";
import { sortItemsByPriority } from "@/components/list-utils";
import Dashboard from "@/components/dashboard";
import type { DashboardView } from "@/hooks/use-dashboard-view";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const rawView = sp?.view;
  const viewParam = Array.isArray(rawView) ? rawView[0] : rawView;
  const supabase = await createServerSupabaseClient();

  const [{ data: taskData }, { data: routineData }, { data: categoriesData }] =
    await Promise.all([
      supabase.from("tasks").select("*"),
      supabase.from("routines").select("*"),
      supabase.from("categories").select("*"),
    ]);

  const items = sortItemsByPriority([
    ...((taskData || []).map((task) => taskRowToListItem(task)) as ListItem[]),
    ...((routineData || []).map((routine) =>
      routineRowToListItem(routine),
    ) as ListItem[]),
  ]);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/auth");
  }

  const initialView: DashboardView =
    viewParam === "settings" ? "settings" : "list";

  return (
    <Dashboard
      initialItems={items}
      initialCategories={(categoriesData || []) as Category[]}
      initialView={initialView}
    />
  );
}
