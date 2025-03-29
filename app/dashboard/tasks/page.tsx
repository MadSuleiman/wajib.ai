import { createServerSupabaseClient } from "@/lib/supabase-server";
import { TaskList } from "@/components/task-list";
import { PageHeader } from "@/components/page-header";
import type { Task } from "@/types";

export default async function TasksPage() {
  const supabase = await createServerSupabaseClient();
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });

  // Use double assertion to satisfy TypeScript
  const typedTasks = (tasks || []) as unknown as Task[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description="Manage your daily tasks and to-dos"
        icon="CheckSquare"
      />
      <TaskList initialTasks={typedTasks} />
    </div>
  );
}
