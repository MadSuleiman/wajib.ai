import { notFound } from "next/navigation";

import { PopoutView } from "@/components/dashboard/popout-view";
import { loadDashboardBootstrapData } from "@/lib/dashboard-bootstrap";

const isValidKind = (value: string): value is "tasks" | "routines" =>
  value === "tasks" || value === "routines";

export default async function PopoutPage({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  const { kind } = await params;
  if (!isValidKind(kind)) notFound();
  const { userId, items, categories, dailyHighlightEnabled } =
    await loadDashboardBootstrapData();

  return (
    <PopoutView
      focusKind={kind}
      userId={userId}
      initialItems={items}
      initialCategories={categories}
      initialDailyHighlightEnabled={dailyHighlightEnabled}
    />
  );
}
