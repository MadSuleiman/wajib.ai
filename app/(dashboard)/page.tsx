import Dashboard from "@/components/dashboard";
import type { DashboardView } from "@/hooks/use-dashboard-view";
import { loadDashboardBootstrapData } from "@/lib/dashboard-bootstrap";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const rawView = sp?.view;
  const viewParam = Array.isArray(rawView) ? rawView[0] : rawView;
  const { userId, items, categories, dailyHighlightEnabled } =
    await loadDashboardBootstrapData();

  const initialView: DashboardView =
    viewParam === "settings" ? "settings" : "list";

  return (
    <Dashboard
      userId={userId}
      initialItems={items}
      initialCategories={categories}
      initialView={initialView}
      initialDailyHighlightEnabled={dailyHighlightEnabled}
    />
  );
}
