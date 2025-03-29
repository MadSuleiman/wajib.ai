import { createServerSupabaseClient } from "@/lib/supabase-server";
import { WatchList } from "@/components/watch-list";
import { PageHeader } from "@/components/page-header";
import type { WatchItem } from "@/types";

export default async function WatchPage() {
  const supabase = await createServerSupabaseClient();
  const { data: items } = await supabase
    .from("watch_items")
    .select("*")
    .order("created_at", { ascending: false });

  // Use double assertion to satisfy TypeScript
  const typedItems = (items || []) as unknown as WatchItem[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Watch List"
        description="Track movies, shows, and content to consume"
        icon="Film"
      />
      <WatchList initialItems={typedItems} />
    </div>
  );
}
