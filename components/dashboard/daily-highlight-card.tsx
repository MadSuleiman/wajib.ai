"use client";

import { ArrowUpRight, CalendarPlus, Check, Circle } from "lucide-react";
import { OliveBranch } from "@/components/brand/olive-branch";

import type { ListItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CategoryOption, DerivedStatus } from "./types";

type HighlightItemProps = {
  label: string;
  item: ListItem | null;
  derivedStatuses: Map<string, DerivedStatus>;
  categoryMap: Map<string, CategoryOption>;
  onOpenItem: (item: ListItem) => void;
  onToggleComplete: (item: ListItem) => void;
  onScheduleItem: (item: ListItem) => void;
};

function HighlightItem({
  label,
  item,
  derivedStatuses,
  categoryMap,
  onOpenItem,
  onToggleComplete,
  onScheduleItem,
}: HighlightItemProps) {
  if (!item) {
    return (
      <div className="rounded-xl border border-primary/15 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">{label}</p>
        <p className="mt-2">No active {label.toLowerCase()} to highlight.</p>
      </div>
    );
  }

  const status = derivedStatuses.get(item.id) ?? "active";
  const category = categoryMap.get(item.category);

  return (
    <div className="rounded-xl bg-background/65 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 break-words text-xl font-medium leading-tight text-primary">
            {item.title}
          </p>
        </div>
        <Button
          type="button"
          size="icon-lg"
          className="rounded-full"
          onClick={() => onToggleComplete(item)}
          aria-label={`${status === "completed" ? "Mark active" : "Mark complete"}: ${item.title}`}
          aria-pressed={status === "completed"}
          variant={status === "completed" ? "default" : "outline"}
        >
          {status === "completed" ? (
            <Check aria-hidden="true" />
          ) : (
            <Circle aria-hidden="true" />
          )}
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="flex items-center gap-1.5 capitalize text-muted-foreground">
          <span
            className="h-2 w-2 rounded-full"
            style={{
              backgroundColor: category?.color ?? "var(--muted-foreground)",
            }}
          />
          {category?.label ?? item.category}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => onOpenItem(item)}
        >
          Details <ArrowUpRight aria-hidden="true" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          aria-label="Schedule 30 min"
          onClick={() => onScheduleItem(item)}
        >
          <CalendarPlus className="mr-2 h-4 w-4" />
          Schedule
        </Button>
      </div>
    </div>
  );
}

type DailyHighlightCardProps = {
  focusKind?: "task" | "routine";
  task: ListItem | null;
  routine: ListItem | null;
  derivedStatuses: Map<string, DerivedStatus>;
  categoryMap: Map<string, CategoryOption>;
  onOpenItem: (item: ListItem) => void;
  onToggleComplete: (item: ListItem) => void;
  onScheduleItem: (item: ListItem) => void;
};

export function DailyHighlightCard({
  focusKind,
  task,
  routine,
  derivedStatuses,
  categoryMap,
  onOpenItem,
  onToggleComplete,
  onScheduleItem,
}: DailyHighlightCardProps) {
  return (
    <Card className="relative gap-3 overflow-hidden border-transparent bg-brand-highlight py-4 sm:gap-6 sm:py-6">
      <OliveBranch className="pointer-events-none absolute right-5 top-3 h-24 w-16 text-primary/25" />
      <CardHeader className="relative px-4 pr-24 sm:px-6 sm:pr-24">
        <CardTitle className="text-lg font-medium text-primary">
          Daily highlight
        </CardTitle>
        <p className="hidden text-sm text-muted-foreground sm:block">
          Start with what matters.
        </p>
      </CardHeader>
      <CardContent
        className={`relative grid gap-3 px-4 sm:px-6${focusKind ? "" : " sm:grid-cols-2"}`}
      >
        {focusKind !== "routine" ? (
          <HighlightItem
            label="Task spotlight"
            item={task}
            derivedStatuses={derivedStatuses}
            categoryMap={categoryMap}
            onOpenItem={onOpenItem}
            onToggleComplete={onToggleComplete}
            onScheduleItem={onScheduleItem}
          />
        ) : null}
        {focusKind !== "task" ? (
          <HighlightItem
            label="Routine spotlight"
            item={routine}
            derivedStatuses={derivedStatuses}
            categoryMap={categoryMap}
            onOpenItem={onOpenItem}
            onToggleComplete={onToggleComplete}
            onScheduleItem={onScheduleItem}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
