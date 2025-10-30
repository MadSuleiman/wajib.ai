"use client";

import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { Navigation } from "@/components/navigation";
import { DashboardViewProvider } from "@/hooks/use-dashboard-view";

export function DashboardShell({
  user,
  children,
}: {
  user: User;
  children: ReactNode;
}) {
  return (
    <DashboardViewProvider>
      <div className="flex min-h-screen flex-col">
        <Navigation user={user} />
        <main>{children}</main>
      </div>
    </DashboardViewProvider>
  );
}
