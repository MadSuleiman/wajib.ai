"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import {
  CheckSquare,
  Film,
  LogOut,
  Menu,
  Settings,
  ShoppingCart,
  Loader2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { createClientSupabaseClient } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useMobile } from "@/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavigationProps {
  user: User;
}

interface ErrorWithMessage {
  message: string;
}

function getErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    return (error as ErrorWithMessage).message;
  }
  return String(error);
}

export function Navigation({ user }: NavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useMobile();
  const [open, setOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const routes = [
    {
      href: "/dashboard/tasks",
      label: "Tasks",
      icon: CheckSquare,
      active: pathname === "/dashboard/tasks",
    },
    {
      href: "/dashboard/shopping",
      label: "Shopping",
      icon: ShoppingCart,
      active: pathname === "/dashboard/shopping",
    },
    {
      href: "/dashboard/watch",
      label: "Watch List",
      icon: Film,
      active: pathname === "/dashboard/watch",
    },
    {
      href: "/dashboard/settings",
      label: "Settings",
      icon: Settings,
      active: pathname === "/dashboard/settings",
    },
  ];

  // Close mobile menu when route changes
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user.email) return "U";
    return user.email.charAt(0).toUpperCase();
  };

  const handleSignOut = async () => {
    try {
      setIsLoggingOut(true);
      const supabase = createClientSupabaseClient();
      await supabase.auth.signOut();
      toast.success("Signed out successfully");
      router.push("/auth");
      router.refresh();
    } catch (error: unknown) {
      toast.error("Error signing out", {
        description:
          getErrorMessage(error) || "Failed to sign out. Please try again.",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      {/* Desktop Navigation (Top) */}
      {!isMobile && (
        <header className="sticky top-0 z-10 border-b bg-background">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center gap-6">
              <Link
                href="/dashboard/tasks"
                className="flex items-center gap-2 font-semibold"
              >
                <Image
                  src="/logos/logo.svg"
                  alt="Wajib AI"
                  width={28}
                  height={28}
                  className="dark:hidden"
                />
                <Image
                  src="/logos/logo-white.svg"
                  alt="Wajib AI"
                  width={28}
                  height={28}
                  className="hidden dark:block"
                />
                <span>Wajib AI</span>
              </Link>
              <nav className="flex items-center gap-4">
                {routes.map((route) => (
                  <Link
                    key={route.href}
                    href={route.href}
                    className={cn(
                      "flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary",
                      route.active ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    <route.icon className="h-4 w-4" />
                    {route.label}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full"
                  >
                    <Avatar>
                      <AvatarFallback>{getUserInitials()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        Account
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    disabled={isLoggingOut}
                    className="text-destructive focus:text-destructive"
                  >
                    {isLoggingOut ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        <span>Signing out...</span>
                      </>
                    ) : (
                      <>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </>
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
      )}

      {/* Mobile Navigation (Bottom) */}
      {isMobile && (
        <>
          <header className="sticky top-0 z-10 border-b bg-background">
            <div className="flex h-14 items-center justify-between px-4">
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 sm:max-w-xs">
                  <div className="flex h-full flex-col">
                    <div className="flex items-center justify-between border-b py-4">
                      <div className="flex items-center gap-2 font-semibold">
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
                        <span>Wajib AI</span>
                      </div>
                    </div>
                    <div className="border-b py-4">
                      <div className="flex items-center gap-3 px-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback>{getUserInitials()}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">Account</span>
                          <span className="text-xs text-muted-foreground">
                            {user.email}
                          </span>
                        </div>
                      </div>
                    </div>
                    <nav className="flex-1 overflow-auto py-4">
                      <div className="flex flex-col gap-1">
                        {routes.map((route) => (
                          <Link
                            key={route.href}
                            href={route.href}
                            className={cn(
                              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                              route.active
                                ? "bg-accent text-accent-foreground"
                                : "text-muted-foreground",
                            )}
                          >
                            <route.icon className="h-4 w-4" />
                            {route.label}
                          </Link>
                        ))}
                      </div>
                    </nav>
                    <div className="border-t py-4">
                      <Button
                        variant="ghost"
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                        onClick={handleSignOut}
                        disabled={isLoggingOut}
                      >
                        {isLoggingOut ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Signing out...</span>
                          </>
                        ) : (
                          <>
                            <LogOut className="h-4 w-4" />
                            <span>Sign Out</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
              <div className="flex items-center gap-2 font-semibold">
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
                <span>
                  {routes.find((route) => route.active)?.label || "Wajib AI"}
                </span>
              </div>
              <Avatar className="h-8 w-8">
                <AvatarFallback>{getUserInitials()}</AvatarFallback>
              </Avatar>
            </div>
          </header>

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
        </>
      )}
    </>
  );
}
