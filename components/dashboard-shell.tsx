"use client";

import type { ReactNode } from "react";
import { Navigation } from "@/components/navigation";
import { DashboardViewProvider } from "@/hooks/use-dashboard-view";

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <DashboardViewProvider>
      <div className="flex min-h-screen flex-col">
        <Navigation />
        <main>{children}</main>
      </div>
    </DashboardViewProvider>
  );
}
