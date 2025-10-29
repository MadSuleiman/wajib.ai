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
        <main className="flex-1 p-4 pb-20 md:p-6 md:pb-6">{children}</main>
      </div>
    </DashboardViewProvider>
  );
}
