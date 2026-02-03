"use client";

import { useCallback, useEffect } from "react";
import { Settings } from "lucide-react";

import { cn } from "@/lib/utils";
import { useDashboardView } from "@/hooks/use-dashboard-view";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { useCreationDialogs } from "@/components/dashboard/creation-dialogs-context";

export function Navigation() {
  const { view, setView } = useDashboardView();
  const { setIsCreateTaskOpen, setIsCreateRoutineOpen } = useCreationDialogs();

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      if (target.isContentEditable) return true;
      return Boolean(
        target.closest("input, textarea, select, [contenteditable]"),
      );
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isEditableTarget(event.target)) return;

      const key = event.key.toLowerCase();
      if (key === "t") {
        event.preventDefault();
        setIsCreateTaskOpen(true);
      } else if (key === "r") {
        event.preventDefault();
        setIsCreateRoutineOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [setIsCreateRoutineOpen, setIsCreateTaskOpen]);

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
    <header className="sticky top-0 z-10 border-b bg-transparent backdrop-blur-sm">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        <button
          type="button"
          onClick={goHome}
          className="flex items-center gap-2 font-semibold"
        >
          <span className="inline">wajib</span>
          <span className="sr-only">Go to dashboard</span>
        </button>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => setIsCreateRoutineOpen(true)}
          >
            Create routine
            <Kbd aria-hidden="true">R</Kbd>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => setIsCreateTaskOpen(true)}
          >
            Create task
            <Kbd aria-hidden="true">T</Kbd>
          </Button>
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
      </div>
    </header>
  );
}
