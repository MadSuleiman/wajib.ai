import { createServerSupabaseClient } from "@/lib/supabase-server";
import { TaskList } from "@/components/task-list";
import { PageHeader } from "@/components/page-header";
import type { Task } from "@/types";

export default async function TasksPage() {
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { TaskList } from "@/components/task-list";
import { PageHeader } from "@/components/page-header";
import type { Task } from "@/types";
import { sortItemsByPriority } from "@/components/list-utils";

export default async function TasksPage() {
  const supabase = await createServerSupabaseClient();
  const { data: tasksData } = await supabase
    .from("tasks")
    .select("*");
    // Initial ordering by created_at to ensure consistent secondary sort if priorities are equal
    // The primary sorting by priority will be done client-side after fetch or ideally server-side if possible.
    // For now, fetching all and sorting in code:
    // .order("created_at", { ascending: false });

  const unsortedTasks = (tasksData || []) as unknown as Task[];
  const sortedTasks = sortItemsByPriority(unsortedTasks);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description="Manage your daily tasks and to-dos"
        icon="CheckSquare"
      />
      <TaskList initialTasks={sortedTasks} />
    </div>
  );
}
