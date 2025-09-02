"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { TaskList } from "@/components/task-list";
import { ShoppingList } from "@/components/shopping-list";
import { WatchList } from "@/components/watch-list";
import type { Task, ShoppingItem, WatchItem } from "@/types";
import { useMobile } from "@/hooks/use-mobile";

type View = "tasks" | "shopping" | "watch";

export default function UnifiedDashboard({
  initialTasks,
  initialShoppingItems,
  initialWatchItems,
  initialView,
}: {
  initialTasks: Task[];
  initialShoppingItems: ShoppingItem[];
  initialWatchItems: WatchItem[];
  initialView: View;
}) {
  const isMobile = useMobile();
  const router = useRouter();
  const params = useSearchParams();
  const view = (params?.get("view") as View | null) || initialView || "tasks";

  // Ensure a view is present in the URL for SPA behavior (especially on mobile)
  useEffect(() => {
    const current = params?.get("view") as View | null;
    if (!current) {
      const qp = new URLSearchParams(params?.toString());
      qp.set("view", initialView || "tasks");
      router.replace(`/dashboard?${qp.toString()}`);
    }
  }, [params, router, initialView]);

  // Smooth-scroll enable (document-level)
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

  return (
    <div className="w-full space-y-6">
      <PageHeader title="Your Lists" icon="CheckSquare" />

      {isMobile ? (
        <div className="mt-2">
          <motion.div variants={container} initial="hidden" animate="show">
            {view === "tasks" && <TaskList initialTasks={initialTasks} />}
            {view === "shopping" && (
              <ShoppingList initialItems={initialShoppingItems} />
            )}
            {view === "watch" && <WatchList initialItems={initialWatchItems} />}
          </motion.div>
        </div>
      ) : (
        <div className="grid w-full min-w-0 grid-cols-1 gap-6 md:grid-cols-3">
          <motion.section
            id="tasks"
            className="min-w-0 scroll-mt-24"
            variants={container}
            initial="hidden"
            animate="show"
          >
            <h2 className="mb-2 text-lg font-semibold">Tasks</h2>
            <TaskList initialTasks={initialTasks} />
          </motion.section>
          <motion.section
            id="shopping"
            className="min-w-0 scroll-mt-24"
            variants={container}
            initial="hidden"
            animate="show"
          >
            <h2 className="mb-2 text-lg font-semibold">Shopping</h2>
            <ShoppingList initialItems={initialShoppingItems} />
          </motion.section>
          <motion.section
            id="watch"
            className="min-w-0 scroll-mt-24"
            variants={container}
            initial="hidden"
            animate="show"
          >
            <h2 className="mb-2 text-lg font-semibold">Watch</h2>
            <WatchList initialItems={initialWatchItems} />
          </motion.section>
        </div>
      )}
    </div>
  );
}
