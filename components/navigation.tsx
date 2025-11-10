"use client";

import { useCallback } from "react";
import { Settings } from "lucide-react";

import { cn } from "@/lib/utils";
import { useDashboardView } from "@/hooks/use-dashboard-view";

export function Navigation() {
  const { view, setView } = useDashboardView();

  const openSettings = useCallback(() => {
    setView("settings");
  }, [setView]);

  const goHome = useCallback(() => {
    setView("list");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [setView]);

  return (
    <header className="sticky top-0 z-10 border-b bg-transparent backdrop-blur-6xl">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        <button
          type="button"
          onClick={goHome}
          className="flex items-center gap-2 font-semibold"
        >
          <span className="inline">wajib</span>
          <span className="sr-only">Go to dashboard</span>
        </button>
        <button
          type="button"
          onClick={openSettings}
          className={cn(
            "flex items-center justify-center rounded-full p-2 text-muted-foreground transition-colors hover:text-primary",
            view === "settings" && "text-primary",
          )}
          aria-pressed={view === "settings"}
        >
          <Settings className="h-5 w-5" />
          <span className="sr-only">Open settings</span>
        </button>
      </div>
    </header>
  );
}
