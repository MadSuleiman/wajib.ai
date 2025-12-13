"use client";

import type { ReactNode } from "react";
import { Navigation } from "@/components/dashboard/navigation";
import { DashboardViewProvider } from "@/hooks/use-dashboard-view";
import { CreationDialogsProvider } from "@/components/dashboard/creation-dialogs-context";

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <DashboardViewProvider>
      <CreationDialogsProvider>
        <div className="flex min-h-screen flex-col">
          <Navigation />
          <main>{children}</main>
        </div>
      </CreationDialogsProvider>
    </DashboardViewProvider>
  );
}
