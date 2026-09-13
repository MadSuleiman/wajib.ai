"use client";

import { SupabaseProvider } from "@/components/dashboard/supabase-provider";
import { CreationDialogsProvider } from "@/components/dashboard/creation-dialogs-context";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import type { Category, ListItem } from "@/types";
import { DailyHighlightPreferenceProvider } from "@/hooks/use-daily-highlight-preference";
import { BrandLogo } from "@/components/brand/brand-logo";
import Link from "next/link";
import { DashboardViewProvider } from "@/hooks/use-dashboard-view";

export function PopoutView({
  userId,
  initialItems,
  initialCategories,
  focusKind,
  initialDailyHighlightEnabled,
  initialLastSyncAt,
}: {
  userId: string;
  initialItems: ListItem[];
  initialCategories: Category[];
  focusKind: "tasks" | "routines";
  initialDailyHighlightEnabled: boolean;
  initialLastSyncAt: string;
}) {
  return (
    <DashboardViewProvider>
      <DailyHighlightPreferenceProvider
        userId={userId}
        initialEnabled={initialDailyHighlightEnabled}
      >
        <SupabaseProvider
          initialUserId={userId}
          initialItems={initialItems}
          initialCategories={initialCategories}
          initialLastSyncAt={initialLastSyncAt}
        >
          <CreationDialogsProvider>
            <div className="min-h-screen px-4 py-4 md:px-6">
              <Link
                href="/"
                className="mb-6 inline-flex rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Go to dashboard"
              >
                <BrandLogo />
              </Link>
              <DashboardContent focusKind={focusKind} isPopout />
            </div>
          </CreationDialogsProvider>
        </SupabaseProvider>
      </DailyHighlightPreferenceProvider>
    </DashboardViewProvider>
  );
}
