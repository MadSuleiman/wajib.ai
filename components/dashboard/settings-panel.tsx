"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, SettingsIcon } from "lucide-react";

import { createClientSupabaseClient } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface ErrorWithMessage {
  message: string;
}

function getErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    return (error as ErrorWithMessage).message;
  }
  return String(error);
}

export function SettingsPanel() {
  const [darkMode, setDarkMode] = useState(
    typeof window !== "undefined" &&
      document.documentElement.classList.contains("dark"),
  );
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClientSupabaseClient();

  useEffect(() => {
    async function getUserEmail() {
      const { data } = await supabase.auth.getUser();
      setUserEmail(data.user?.email || null);
    }
    getUserEmail();
  }, [supabase.auth]);

  const handleSignOut = async () => {
    setLoading(true);

    try {
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
      setLoading(false);
    }
  };

  const toggleTheme = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);

    if (newDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    localStorage.setItem("theme", newDarkMode ? "dark" : "light");
  };

  return (
    <div className="space-y-6">
      <h3 className="flex items-center space-x-2 text-2xl font-bold gap-2">
        <SettingsIcon />
        Settings
      </h3>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Customize how the application looks and feels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label htmlFor="dark-mode">Dark Mode</Label>
              <Switch
                id="dark-mode"
                checked={darkMode}
                onCheckedChange={toggleTheme}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Manage your account settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-medium">Email</h3>
              <p className="text-sm text-muted-foreground">
                {userEmail || "Loading..."}
              </p>
            </div>

            <Separator />

            <div className="space-y-1">
              <h3 className="text-sm font-medium">Session</h3>
              <p className="text-sm text-muted-foreground">
                Manage your active sessions and sign out from all devices
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-start gap-2">
            <Button
              variant="destructive"
              onClick={handleSignOut}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing out...
                </>
              ) : (
                "Sign Out"
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
