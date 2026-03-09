"use client";

import { RefreshCw, SignalHigh, WifiOff } from "lucide-react";

import { useSupabase } from "@/components/dashboard/supabase-provider";
import { Button } from "@/components/ui/button";

export function SyncStatusBanner() {
  const { sync } = useSupabase();

  if (
    sync.isOnline &&
    !sync.isSlowConnection &&
    sync.pendingChangesCount === 0 &&
    !sync.isSyncing &&
    !sync.lastSyncError
  ) {
    return null;
  }

  const icon = !sync.isOnline ? (
    <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
  ) : sync.isSyncing ? (
    <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
  ) : (
    <SignalHigh className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
  );

  const message = (() => {
    if (!sync.isOnline && sync.pendingChangesCount > 0) {
      return `${sync.pendingChangesCount} change${sync.pendingChangesCount === 1 ? "" : "s"} queued offline. You can keep browsing cached data while we wait for a connection.`;
    }
    if (!sync.isOnline) {
      return "Offline read mode. Cached pages are available, but fresh data and live sync are paused.";
    }
    if (sync.isSyncing) {
      return `Syncing ${sync.pendingChangesCount} queued change${sync.pendingChangesCount === 1 ? "" : "s"}...`;
    }
    if (sync.lastSyncError && sync.pendingChangesCount > 0) {
      return `Sync paused: ${sync.lastSyncError}`;
    }
    if (sync.pendingChangesCount > 0) {
      return `${sync.pendingChangesCount} queued change${sync.pendingChangesCount === 1 ? "" : "s"} waiting to sync.`;
    }
    return "Connection is slow. Saves and refreshes may take longer than usual.";
  })();

  return (
    <div className="mb-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm backdrop-blur">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-2 text-amber-950 dark:text-amber-100">
          {icon}
          <p>{message}</p>
        </div>
        {sync.isOnline && sync.pendingChangesCount > 0 ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void sync.flushPendingChanges()}
            disabled={sync.isSyncing}
            className="border-amber-500/30 bg-background/70"
          >
            {sync.isSyncing ? "Syncing..." : "Retry sync"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
