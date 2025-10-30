"use client";

import { useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { TaskList } from "@/components/task-list";
import { ShoppingList } from "@/components/shopping-list";
import { WatchList } from "@/components/watch-list";
import { SettingsPanel } from "@/components/settings-panel";
import type { Task, ShoppingItem, WatchItem } from "@/types";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  type DashboardListView,
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
import { SupabaseProvider } from "@/components/supabase-provider";

export default function UnifiedDashboard({
  initialTasks,
  initialShoppingItems,
  initialWatchItems,
  initialView,
}: {
  initialTasks: Task[];
  initialShoppingItems: ShoppingItem[];
  initialWatchItems: WatchItem[];
  initialView: DashboardView;
}) {
  const isMobile = useIsMobile();
  const { view, lastListView, setView } = useDashboardView();
  const isSettingsOpen = view === "settings";
  const listView = isSettingsOpen ? lastListView : (view as DashboardListView);

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
      setView(lastListView);
    }
  }, [isSettingsOpen, lastListView, setView]);

  return (
    <SupabaseProvider
      initialTasks={initialTasks}
      initialShoppingItems={initialShoppingItems}
      initialWatchItems={initialWatchItems}
    >
      <div className="w-full space-y-6">
        {isMobile ? (
          <div className="mt-2">
            <motion.div variants={container} initial="hidden" animate="show">
              {listView === "tasks" && <TaskList />}
              {listView === "shopping" && <ShoppingList />}
              {listView === "watch" && <WatchList />}
            </motion.div>
          </div>
        ) : (
          <div className="grid w-full min-w-0 grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 p-6">
            <motion.section
              id="tasks"
              className="min-w-0 scroll-mt-24"
              variants={container}
              initial="hidden"
              animate="show"
            >
              <h2 className="mb-2 text-lg font-semibold">Tasks</h2>
              <TaskList />
            </motion.section>
            <motion.section
              id="shopping"
              className="min-w-0 scroll-mt-24"
              variants={container}
              initial="hidden"
              animate="show"
            >
              <h2 className="mb-2 text-lg font-semibold">Shopping</h2>
              <ShoppingList />
            </motion.section>
            <motion.section
              id="watch"
              className="min-w-0 scroll-mt-24"
              variants={container}
              initial="hidden"
              animate="show"
            >
              <h2 className="mb-2 text-lg font-semibold">Watch</h2>
              <WatchList />
            </motion.section>
          </div>
        )}
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
