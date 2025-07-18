import type React from "react";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { Navigation } from "@/components/navigation";

// Add this loading component
function DashboardLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="h-16 border-b bg-background"></div>
      <div className="flex-1 p-4 pb-20 md:p-6 md:pb-6">
        <div className="h-full w-full animate-pulse rounded-md bg-muted/50"></div>
      </div>
    </div>
  );
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/auth");
  }

  // Get authenticated user data from the server rather than the session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Add null check for user
  if (!user) {
    redirect("/auth");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navigation user={user} />
      <main className="flex-1 p-4 pb-20 md:p-6 md:pb-6">
        <Suspense fallback={<DashboardLoading />}>{children}</Suspense>
      </main>
    </div>
  );
}
