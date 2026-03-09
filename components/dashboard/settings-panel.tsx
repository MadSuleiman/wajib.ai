"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Loader2, SettingsIcon } from "lucide-react";

import { createClientSupabaseClient } from "@/lib/supabase-client";
import { useSupabase } from "@/components/dashboard/supabase-provider";
import type { ListItem } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useDailyHighlightPreference } from "@/hooks/use-daily-highlight-preference";
import { useInstallPrompt } from "@/hooks/use-install-prompt";

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
  const [loading, setLoading] = useState(false);
  const [exportKind, setExportKind] = useState<"tasks" | "routines" | null>(
    null,
  );
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClientSupabaseClient();
  const { theme, setTheme } = useTheme();
  const { items } = useSupabase();
  const { isEnabled: isDailyHighlightEnabled, setIsEnabled } =
    useDailyHighlightPreference();
  const { isInstalled, canPromptInstall, promptToInstall, isIos } =
    useInstallPrompt();

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

  const tasksCsv = useMemo(() => {
    const rows = items.items.filter((item) => item.item_kind === "task");
    return buildCsv<ListItem>(rows, taskExportHeaders);
  }, [items.items]);

  const routinesCsv = useMemo(() => {
    const rows = items.items.filter((item) => item.item_kind === "routine");
    return buildCsv<ListItem>(rows, routineExportHeaders);
  }, [items.items]);

  const handleDownload = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
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
              <Label htmlFor="theme-select">Theme</Label>
              <Select
                value={theme ?? "system"}
                onValueChange={(value) => setTheme(value)}
              >
                <SelectTrigger id="theme-select" className="w-[160px]">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily highlight</CardTitle>
            <CardDescription>
              Show a task and routine spotlight at the top of your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label htmlFor="daily-highlight-toggle">
                Enable daily highlight
              </Label>
              <Switch
                id="daily-highlight-toggle"
                checked={isDailyHighlightEnabled}
                onCheckedChange={setIsEnabled}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Install app</CardTitle>
            <CardDescription>
              Save Wajib to your home screen for a cleaner full-screen experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isInstalled ? (
              <p className="text-sm text-muted-foreground">
                Wajib is already installed and running in standalone mode on this
                device.
              </p>
            ) : canPromptInstall ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Install the app to get the standalone layout, cached shell, and
                  faster relaunch behavior.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void promptToInstall()}
                >
                  Install Wajib
                </Button>
              </>
            ) : isIos ? (
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  On iPhone or iPad, open the browser share sheet and choose
                  <span className="font-medium text-foreground">
                    {" "}
                    Add to Home Screen
                  </span>
                  .
                </p>
                <p>
                  Launching from the home screen gives you the standalone PWA
                  experience and the best offline behavior.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Your browser has not exposed an install prompt yet. Revisit the
                dashboard after a little use and the install option should appear
                if the browser supports it.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data export</CardTitle>
            <CardDescription>
              Download or copy CSV snapshots of your items
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    setExportKind((current) =>
                      current === "tasks" ? null : "tasks",
                    )
                  }
                >
                  Export tasks
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => handleDownload(tasksCsv, "tasks.csv")}
                  disabled={!tasksCsv}
                >
                  Download CSV
                </Button>
              </div>
              {exportKind === "tasks" ? (
                <textarea
                  readOnly
                  value={tasksCsv}
                  className="min-h-[160px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              ) : null}
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    setExportKind((current) =>
                      current === "routines" ? null : "routines",
                    )
                  }
                >
                  Export routines
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => handleDownload(routinesCsv, "routines.csv")}
                  disabled={!routinesCsv}
                >
                  Download CSV
                </Button>
              </div>
              {exportKind === "routines" ? (
                <textarea
                  readOnly
                  value={routinesCsv}
                  className="min-h-[160px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              ) : null}
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

function buildCsv<T extends object>(
  rows: T[],
  headers: readonly (keyof T & string)[],
) {
  const headerLine = headers.join(",");
  const lines = rows.map((row) =>
    headers.map((header) => escapeCsv(row[header])).join(","),
  );
  return [headerLine, ...lines].join("\n");
}

function escapeCsv(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

const taskExportHeaders = [
  "title",
  "value",
  "urgency",
  "estimated_hours",
  "category",
  "completed",
  "created_at",
] as const;

const routineExportHeaders = [
  "title",
  "value",
  "urgency",
  "estimated_hours",
  "category",
  "recurrence_type",
  "recurrence_interval",
  "created_at",
] as const;
