"use client";

import { useMemo, useRef } from "react";
import { addMinutes, endOfDay, format } from "date-fns";

import type { ListItem } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DURATION_MINUTES = 30;
const ROUNDING_MINUTES = 5;

const roundToMinutes = (date: Date, minutes: number) => {
  const intervalMs = minutes * 60 * 1000;
  return new Date(Math.ceil(date.getTime() / intervalMs) * intervalMs);
};

const getSuggestedStart = (now: Date) => {
  const latestStart = addMinutes(endOfDay(now), -DURATION_MINUTES);
  const earliestStart = now;

  if (latestStart.getTime() <= earliestStart.getTime()) {
    return roundToMinutes(earliestStart, ROUNDING_MINUTES);
  }

  const randomMs =
    earliestStart.getTime() +
    Math.random() * (latestStart.getTime() - earliestStart.getTime());
  const rounded = roundToMinutes(new Date(randomMs), ROUNDING_MINUTES);
  return rounded.getTime() > latestStart.getTime() ? latestStart : rounded;
};

const parseTimeInput = (value: string, baseDate: Date) => {
  const match = value.trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const result = new Date(baseDate);
  result.setHours(hours, minutes, 0, 0);
  return result;
};

type ScheduleBlockDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  item: ListItem | null;
  onSchedule: (item: ListItem, startTime: Date) => void;
};

export function ScheduleBlockDialog({
  isOpen,
  onOpenChange,
  item,
  onSchedule,
}: ScheduleBlockDialogProps) {
  const timeInputRef = useRef<HTMLInputElement | null>(null);
  const suggestedStart = useMemo(() => {
    if (!isOpen || !item) return null;
    return getSuggestedStart(new Date());
  }, [isOpen, item]);

  const handleSchedule = () => {
    if (!item || !suggestedStart) return;
    const rawValue = timeInputRef.current?.value ?? "";
    const parsed = parseTimeInput(rawValue, suggestedStart);
    const startTime = parsed ?? suggestedStart;
    onSchedule(item, startTime);
    onOpenChange(false);
  };

  if (!item) return null;

  const description = suggestedStart
    ? `Suggested time: ${format(suggestedStart, "h:mm a")}. Edit if you want a different time.`
    : "Pick a time for today.";

  const content = (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Block 30 minutes today for &ldquo;{item.title}&rdquo;.
        </p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="schedule-time">Time (optional)</Label>
        <Input
          id="schedule-time"
          type="time"
          ref={timeInputRef}
          defaultValue={
            suggestedStart ? format(suggestedStart, "HH:mm") : undefined
          }
        />
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button type="button" onClick={handleSchedule}>
          Schedule 30 min block
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule block</DialogTitle>
          <DialogDescription>
            Add a 30-minute block to your calendar for today.
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
