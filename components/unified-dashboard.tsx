"use client";

import { useCallback, useEffect } from "react";
import { motion } from "framer-motion";

import { SupabaseProvider } from "@/components/supabase-provider";
import { SettingsPanel } from "@/components/settings-panel";
import { UnifiedList } from "@/components/unified-list";
import type { Category, ListItem } from "@/types";
import { useIsMobile } from "@/hooks/use-mobile";
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
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

export default function UnifiedDashboard({
  initialItems,
  initialCategories,
  initialView,
}: {
  initialItems: ListItem[];
  initialCategories: Category[];
  initialView: DashboardView;
}) {
  const isMobile = useIsMobile();
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
          <UnifiedList />
        </motion.section>
      </div>

      <Dialog
        open={!isMobile && isSettingsOpen}
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

      <Drawer
        direction="bottom"
        open={isMobile && isSettingsOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeSettings();
          }
        }}
      >
        <DrawerContent className="max-h-[85vh] overflow-hidden">
          <DrawerHeader className="sr-only">
            <DrawerTitle>Settings</DrawerTitle>
          </DrawerHeader>
          <div className="flex h-full max-h-[85vh] flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 pb-6 pt-2">
              <SettingsPanel />
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </SupabaseProvider>
  );
}
