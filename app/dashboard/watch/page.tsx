import { createServerSupabaseClient } from "@/lib/supabase-server";
import { WatchList } from "@/components/watch-list";
import { PageHeader } from "@/components/page-header";
import type { WatchItem } from "@/types";

export default async function WatchPage() {
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { WatchList } from "@/components/watch-list";
import { PageHeader } from "@/components/page-header";
import type { WatchItem } from "@/types";
import { sortItemsByPriority } from "@/components/list-utils";

export default async function WatchPage() {
  const supabase = await createServerSupabaseClient();
  const { data: itemsData } = await supabase
    .from("watch_items")
    .select("*");
  // .order("created_at", { ascending: false });

  const unsortedItems = (itemsData || []) as unknown as WatchItem[];
  const sortedItems = sortItemsByPriority(unsortedItems);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Watch List"
        description="Track movies, shows, and content to consume"
        icon="Film"
      />
      <WatchList initialItems={sortedItems} />
    </div>
  );
}
