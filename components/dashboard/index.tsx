"use client";

import { useCallback, useEffect } from "react";
import { motion } from "framer-motion";

import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { SettingsPanel } from "@/components/dashboard/settings-panel";
import { SupabaseProvider } from "@/components/dashboard/supabase-provider";
import type { Category, ListItem } from "@/types";
import {
  useDashboardView,
  type DashboardView,
} from "@/hooks/use-dashboard-view";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Dashboard({
  initialItems,
  initialCategories,
  initialView,
}: {
  initialItems: ListItem[];
  initialCategories: Category[];
  initialView: DashboardView;
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
    <SupabaseProvider
      initialItems={initialItems}
      initialCategories={initialCategories}
    >
      <div className="w-full px-4 py-4 md:px-8">
        <motion.section
          className="mx-auto max-w-full"
          variants={container}
          initial="hidden"
          animate="show"
        >
          <DashboardContent />
        </motion.section>
      </div>

      <Dialog
        open={isSettingsOpen}
        onOpenChange={(open) => !open && closeSettings()}
      >
        <DialogContent className="max-h-[90vh] w-full max-w-[min(90vw,900px)] overflow-hidden border-none p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>
          <div className="flex h-full max-h-[90vh] flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6">
              <SettingsPanel />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </SupabaseProvider>
  );
}
