"use client";

import React, { useState } from "react";
import { Clock, Loader2, Save } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type EditableHoursFieldProps = {
  itemId: string;
  initialValue: number | null;
  onSave: (itemId: string, value: string) => Promise<boolean>;
  className?: string;
  inputClassName?: string;
  showIcon?: boolean;
  srLabel?: string;
};

const formatHoursValue = (value: number | null) =>
  value === null || value === undefined ? "" : `${value}`;

type EditableHoursFieldInnerProps = EditableHoursFieldProps & {
  normalizedInitial: string;
};

function EditableHoursFieldInner({
  itemId,
  normalizedInitial,
  onSave,
  className,
  inputClassName,
  showIcon = true,
  srLabel = "Save value",
}: EditableHoursFieldInnerProps) {
  const [hours, setHours] = useState<string>(() => normalizedInitial);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isValid =
    hours.trim() === "" || !Number.isNaN(Number.parseFloat(hours));

  const handleSave = async () => {
    if (!isDirty || !isValid || isSaving) return;
    setIsSaving(true);
    const success = await onSave(itemId, hours);
    if (success) {
      setIsDirty(false);
    }
    setIsSaving(false);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showIcon ? (
        <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      ) : null}
      <Input
        type="number"
        min="0.1"
        step="0.1"
        inputMode="decimal"
        value={hours}
        onChange={(event) => {
          const nextValue = event.target.value;
          setHours(nextValue);
          setIsDirty(nextValue !== normalizedInitial);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && isDirty && isValid && !isSaving) {
            event.preventDefault();
            void handleSave();
          }
        }}
        className={cn("h-8 w-24", inputClassName)}
      />
      {isDirty ? (
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="h-8 w-8"
          onClick={handleSave}
          disabled={!isValid || isSaving}
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="h-4 w-4" aria-hidden="true" />
          )}
          <span className="sr-only">{srLabel}</span>
        </Button>
      ) : null}
    </div>
  );
}

export function EditableHoursField(props: EditableHoursFieldProps) {
  const normalizedInitial = formatHoursValue(props.initialValue);
  const resetKey = `${props.itemId}-${normalizedInitial}`;

  return (
    <EditableHoursFieldInner
      key={resetKey}
      {...props}
      normalizedInitial={normalizedInitial}
    />
  );
}
