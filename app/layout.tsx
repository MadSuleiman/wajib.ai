import type React from "react";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { Suspense } from "react";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ZoomPrevention } from "@/components/anti-zoom";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { DashboardShell } from "@/components/dashboard-shell";

const inter = Inter({ subsets: ["latin"], variable: "--font-arabicStyle" });

export const metadata: Metadata = {
  title: "wajib",
  description: "An app for assorting your tasks",
  icons: {
    icon: [
      {
        media: "(prefers-color-scheme: light)",
        url: "/logos/logo.png",
        href: "/logos/logo.png",
      },
      {
        media: "(prefers-color-scheme: dark)",
        url: "/logos/logo-white.png",
        href: "/logos/logo-white.png",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ZoomPrevention />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Suspense
            fallback={<div className="min-h-screen bg-background"></div>}
          >
            <DashboardShell user={user}>{children}</DashboardShell>
          </Suspense>
          <Toaster position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
