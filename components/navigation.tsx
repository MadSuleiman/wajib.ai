"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { CheckSquare, Film, Settings, ShoppingCart } from "lucide-react";

import { cn } from "@/lib/utils";
import { useMobile } from "@/hooks/use-mobile";

interface NavigationProps {
  user: User;
}

export function Navigation({}: NavigationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMobile = useMobile();

  const view =
    (searchParams?.get("view") as "tasks" | "shopping" | "watch" | null) ||
    "tasks";

  const routes = [
    {
      href: "/dashboard?view=tasks",
      label: "Tasks",
      icon: CheckSquare,
      active: pathname === "/dashboard" && view === "tasks",
    },
    {
      href: "/dashboard?view=shopping",
      label: "Shopping",
      icon: ShoppingCart,
      active: pathname === "/dashboard" && view === "shopping",
    },
    {
      href: "/dashboard?view=watch",
      label: "Watch List",
      icon: Film,
      active: pathname === "/dashboard" && view === "watch",
    },
    {
      href: "/dashboard/settings",
      label: "Settings",
      icon: Settings,
      active: pathname === "/dashboard/settings",
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-10 border-b bg-background">
        <div className="flex h-14 items-center justify-between px-4 md:px-6">
          <Link
            href="/dashboard"
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
          </Link>
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            <Settings className="h-5 w-5" />
            <span className="hidden sm:inline">Settings</span>
          </Link>
        </div>
      </header>

      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 z-10 border-t bg-background">
          <div className="grid h-16 grid-cols-4">
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
                  route.active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <route.icon className="h-5 w-5" />
                <span>{route.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      )}
    </>
  );
}
