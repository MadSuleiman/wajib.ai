import type React from "react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { Navigation } from "@/components/navigation";

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

  return (
    <div className="flex min-h-screen flex-col">
      <Navigation user={session.user} />
      <main className="flex-1 p-4 pb-20 md:p-6 md:pb-6">{children}</main>
    </div>
  );
}
