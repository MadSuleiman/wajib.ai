"use client";

import { SupabaseProvider } from "@/components/dashboard/supabase-provider";
import { CreationDialogsProvider } from "@/components/dashboard/creation-dialogs-context";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import type { Category, ListItem } from "@/types";
import { DailyHighlightPreferenceProvider } from "@/hooks/use-daily-highlight-preference";

export function PopoutView({
  userId,
  initialItems,
  initialCategories,
  focusKind,
  initialDailyHighlightEnabled,
}: {
  userId: string;
  initialItems: ListItem[];
  initialCategories: Category[];
  focusKind: "tasks" | "routines";
  initialDailyHighlightEnabled: boolean;
}) {
  return (
    <DailyHighlightPreferenceProvider
      userId={userId}
      initialEnabled={initialDailyHighlightEnabled}
    >
      <SupabaseProvider
        initialUserId={userId}
        initialItems={initialItems}
        initialCategories={initialCategories}
      >
        <CreationDialogsProvider>
          <div className="min-h-screen px-4 py-4 md:px-6">
            <DashboardContent focusKind={focusKind} isPopout />
          </div>
        </CreationDialogsProvider>
      </SupabaseProvider>
    </DailyHighlightPreferenceProvider>
  );
}
