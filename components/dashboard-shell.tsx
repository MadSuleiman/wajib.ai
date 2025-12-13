"use client";

import type { ReactNode } from "react";
import { Navigation } from "@/components/navigation";
import { DashboardViewProvider } from "@/hooks/use-dashboard-view";
import { UnifiedListControlsProvider } from "@/components/unified-list/controls-context";

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <DashboardViewProvider>
      <UnifiedListControlsProvider>
        <div className="flex min-h-screen flex-col">
          <Navigation />
          <main>{children}</main>
        </div>
      </UnifiedListControlsProvider>
    </DashboardViewProvider>
  );
}
