import { createServerSupabaseClient } from "@/lib/supabase-server";
import { ShoppingList } from "@/components/shopping-list";
import { PageHeader } from "@/components/page-header";
import type { ShoppingItem } from "@/types";
import { sortItemsByPriority } from "@/components/list-utils";

export default async function ShoppingPage() {
  const supabase = await createServerSupabaseClient();
  const { data: itemsData } = await supabase.from("shopping_items").select("*");
  // .order("created_at", { ascending: false });

  const unsortedItems = (itemsData || []) as unknown as ShoppingItem[];
  const sortedItems = sortItemsByPriority(unsortedItems);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shopping"
        description="Keep track of your shopping lists"
        icon="ShoppingCart"
      />
      <ShoppingList initialItems={sortedItems} />
    </div>
  );
}
