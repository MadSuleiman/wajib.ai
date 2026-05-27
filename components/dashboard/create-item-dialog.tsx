"use client";

import { NewItemCard } from "@/components/dashboard/new-item-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CategoryOption } from "@/components/dashboard/types";
import type { RecurrenceType, TaskPriority, TaskUrgency } from "@/types";

type CreateItemInput = {
  title: string;
  priority: TaskPriority;
  urgency: TaskUrgency;
  hours: string;
  category: string;
  recurrenceType: RecurrenceType;
  recurrenceInterval: number;
};

type CreateItemDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant: "task" | "routine";
  onAddItem: (input: CreateItemInput) => Promise<boolean>;
  onBulkAddItem?: (input: CreateItemInput) => Promise<boolean>;
  isSubmitting: boolean;
  categoryOptions: CategoryOption[];
  defaultCategory: string;
};

export function CreateItemDialog({
  open,
  onOpenChange,
  variant,
  onAddItem,
  onBulkAddItem,
  isSubmitting,
  categoryOptions,
  defaultCategory,
}: CreateItemDialogProps) {
  const isRoutine = variant === "routine";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isRoutine ? "Create routine" : "Create task"}
          </DialogTitle>
          <DialogDescription>
            {isRoutine
              ? "Add a recurring cadence and mark completions over time."
              : "Capture an item and add details before saving."}
          </DialogDescription>
        </DialogHeader>
        <NewItemCard
          variant={variant}
          onAddItem={onAddItem}
          onBulkAddItem={onBulkAddItem}
          isSubmitting={isSubmitting}
          categoryOptions={categoryOptions}
          defaultCategory={defaultCategory}
        />
      </DialogContent>
    </Dialog>
  );
}
