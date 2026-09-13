"use client";

import { useCallback, useEffect } from "react";
import { Plus, Repeat2, Settings } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";

import { cn } from "@/lib/utils";
import { useDashboardView } from "@/hooks/use-dashboard-view";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { useCreationDialogs } from "@/components/dashboard/creation-dialogs-context";

export function Navigation() {
  const { view, setView, setSection } = useDashboardView();
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
    setSection("tasks");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [setView, setSection]);

  return (
    <header className="dashboard-header">
      <div className="dashboard-width flex h-20 items-center justify-between">
        <button
          type="button"
          onClick={goHome}
          className="rounded-lg outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
          aria-label="Go to dashboard"
        >
          <BrandLogo />
        </button>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="hidden gap-2 md:inline-flex"
            onClick={() => setIsCreateRoutineOpen(true)}
          >
            <Repeat2 aria-hidden="true" /> Create routine
            <Kbd aria-hidden="true">R</Kbd>
          </Button>
          <Button
            size="sm"
            variant="default"
            className="hidden gap-2 md:inline-flex"
            onClick={() => setIsCreateTaskOpen(true)}
          >
            <Plus aria-hidden="true" /> Create task
            <Kbd aria-hidden="true">T</Kbd>
          </Button>
          <button
            type="button"
            onClick={openSettings}
            className={cn(
              "flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
