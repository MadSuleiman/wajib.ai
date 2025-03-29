import { createServerSupabaseClient } from "@/lib/supabase-server";
import { ShoppingList } from "@/components/shopping-list";
import { PageHeader } from "@/components/page-header";
import type { ShoppingItem } from "@/types";

export default async function ShoppingPage() {
  const supabase = await createServerSupabaseClient();
  const { data: items } = await supabase
    .from("shopping_items")
    .select("*")
    .order("created_at", { ascending: false });

  // Use double assertion to satisfy TypeScript
  const typedItems = (items || []) as unknown as ShoppingItem[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shopping"
        description="Keep track of your shopping lists"
        icon="ShoppingCart"
      />
      <ShoppingList initialItems={typedItems} />
    </div>
  );
}
