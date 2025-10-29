"use client";

import { useCallback } from "react";
import Image from "next/image";
import type { User } from "@supabase/supabase-js";
import { CheckSquare, Film, Settings, ShoppingCart } from "lucide-react";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  type DashboardListView,
  useDashboardView,
} from "@/hooks/use-dashboard-view";

interface NavigationProps {
  user: User;
}

export function Navigation({}: NavigationProps) {
  const isMobile = useIsMobile();
  const { view, lastListView, setView } = useDashboardView();

  const currentListView =
    view === "settings" ? lastListView : (view as DashboardListView);

  const viewRoutes: Array<{
    view: DashboardListView;
    label: string;
    icon: typeof CheckSquare;
  }> = [
    { view: "tasks", label: "Tasks", icon: CheckSquare },
    { view: "shopping", label: "Shopping", icon: ShoppingCart },
    { view: "watch", label: "Watch List", icon: Film },
  ];

  const handleSelectView = useCallback(
    (nextView: DashboardListView) => {
      setView(nextView);

      if (typeof window === "undefined") return;
      if (window.location.pathname !== "/dashboard") return;

      if (isMobile) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      requestAnimationFrame(() => {
        const section = document.getElementById(nextView);
        if (section) {
          section.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    },
    [setView, isMobile],
  );

  const openSettings = useCallback(() => {
    setView("settings");
  }, [setView]);

  return (
    <>
      <header className="sticky top-0 z-10 border-b bg-background">
        <div className="flex h-14 items-center justify-between px-4 md:px-6">
          <button
            type="button"
            onClick={() => handleSelectView("tasks")}
            className="flex items-center gap-2 font-semibold"
          >
            <Image
              src="/logos/logo.svg"
              alt="Wajib AI"
              width={24}
              height={24}
              className="dark:hidden"
            />
            <Image
              src="/logos/logo-white.svg"
              alt="Wajib AI"
              width={24}
              height={24}
              className="hidden dark:block"
            />
            <span className="hidden sm:inline">Wajib AI</span>
            <span className="sr-only">Go to tasks</span>
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

      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 z-10 border-t bg-background">
          <div className="grid h-16 grid-cols-3">
            {viewRoutes.map(({ view: routeView, label, icon: Icon }) => (
              <button
                key={routeView}
                type="button"
                onClick={() => handleSelectView(routeView)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
                  routeView === currentListView
                    ? "text-primary"
                    : "text-muted-foreground",
                )}
                aria-pressed={routeView === currentListView}
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </nav>
      )}
    </>
  );
}
