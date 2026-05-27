"use client";

import { SettingsPanel } from "@/components/dashboard/settings-panel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DashboardSettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DashboardSettingsDialog({
  open,
  onOpenChange,
}: DashboardSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full max-w-[min(90vw,900px)] overflow-hidden border-none p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <div className="flex h-full max-h-[90vh] flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            <SettingsPanel />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
