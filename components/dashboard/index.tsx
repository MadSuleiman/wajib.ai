"use client";

import { useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";

import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { SupabaseProvider } from "@/components/dashboard/supabase-provider";
import type { Category, ListItem } from "@/types";
import {
  useDashboardView,
  type DashboardView,
} from "@/hooks/use-dashboard-view";
import { DailyHighlightPreferenceProvider } from "@/hooks/use-daily-highlight-preference";

const DashboardSettingsDialog = dynamic(() =>
  import("@/components/dashboard/dashboard-settings-dialog").then(
    (mod) => mod.DashboardSettingsDialog,
  ),
);
const SyncStatusBanner = dynamic(
  () =>
    import("@/components/dashboard/sync-status-banner").then(
      (mod) => mod.SyncStatusBanner,
    ),
  {
    ssr: false,
    loading: () => null,
  },
);

export default function Dashboard({
  userId,
  initialItems,
  initialCategories,
  initialView,
  initialDailyHighlightEnabled,
  initialLastSyncAt,
}: {
  userId: string;
  initialItems: ListItem[];
  initialCategories: Category[];
  initialView: DashboardView;
  initialDailyHighlightEnabled: boolean;
  initialLastSyncAt: string;
}) {
  const { view, setView } = useDashboardView();
  const isSettingsOpen = view === "settings";

  useEffect(() => {
    setView(initialView);
  }, [initialView, setView]);

  useEffect(() => {
    const prev = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "smooth";
    return () => {
      document.documentElement.style.scrollBehavior = prev;
    };
  }, []);

  const container = {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  };

  const closeSettings = useCallback(() => {
    if (isSettingsOpen) {
      setView("list");
    }
  }, [isSettingsOpen, setView]);

  return (
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
        <div className="w-full px-4 py-4 md:px-8">
          <div className="mx-auto max-w-full">
            <SyncStatusBanner />
          </div>
          <motion.section
            className="mx-auto max-w-full"
            variants={container}
            initial="hidden"
            animate="show"
          >
            <DashboardContent />
          </motion.section>
        </div>

        {isSettingsOpen ? (
          <DashboardSettingsDialog
            open={isSettingsOpen}
            onOpenChange={(open) => !open && closeSettings()}
          />
        ) : null}
      </SupabaseProvider>
    </DailyHighlightPreferenceProvider>
  );
}
