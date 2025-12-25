import { notFound, redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { Category, ListItem } from "@/types";
import { routineRowToListItem, taskRowToListItem } from "@/types/supabase";
import { sortItemsByPriority } from "@/components/dashboard/list-utils";
import { PopoutView } from "@/components/dashboard/popout-view";

const isValidKind = (value: string): value is "tasks" | "routines" =>
  value === "tasks" || value === "routines";

export default async function PopoutPage({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  const { kind } = await params;
  if (!isValidKind(kind)) notFound();

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

  return (
    <PopoutView
      focusKind={kind}
      initialItems={items}
      initialCategories={(categoriesData || []) as Category[]}
    />
  );
}
