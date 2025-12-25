"use client";

import { CalendarPlus, CheckCircle2, Sparkles } from "lucide-react";

import type { ListItem } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CategoryOption, DerivedStatus } from "./types";

const getStatusLabel = (status: DerivedStatus) =>
  status === "completed" ? "Completed" : "Active";

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
      <div className="rounded-xl border border-dashed border-muted-foreground/40 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">{label}</p>
        <p className="mt-2">No active {label.toLowerCase()} to highlight.</p>
      </div>
    );
  }

  const status = derivedStatuses.get(item.id) ?? "active";
  const category = categoryMap.get(item.category);

  return (
    <div className="rounded-xl border bg-background/60 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 text-base font-semibold leading-tight">
            {item.title}
          </p>
        </div>
        <Badge variant={status === "completed" ? "secondary" : "outline"}>
          {getStatusLabel(status)}
        </Badge>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <Badge
          variant="secondary"
          className="flex items-center gap-1 text-[0.7rem] capitalize"
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{
              backgroundColor: category?.color ?? "var(--muted-foreground)",
            }}
          />
          {category?.label ?? item.category}
        </Badge>
        <Badge variant="outline" className="text-[0.7rem]">
          {item.item_kind === "routine" ? "Routine" : "Task"}
        </Badge>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onOpenItem(item)}
        >
          View details
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onScheduleItem(item)}
        >
          <CalendarPlus className="mr-2 h-4 w-4" />
          Schedule 30 min
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => onToggleComplete(item)}
          variant={status === "completed" ? "secondary" : "default"}
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          {status === "completed" ? "Mark active" : "Mark complete"}
        </Button>
      </div>
    </div>
  );
}

type DailyHighlightCardProps = {
  task: ListItem | null;
  routine: ListItem | null;
  derivedStatuses: Map<string, DerivedStatus>;
  categoryMap: Map<string, CategoryOption>;
  onOpenItem: (item: ListItem) => void;
  onToggleComplete: (item: ListItem) => void;
  onScheduleItem: (item: ListItem) => void;
};

export function DailyHighlightCard({
  task,
  routine,
  derivedStatuses,
  categoryMap,
  onOpenItem,
  onToggleComplete,
  onScheduleItem,
}: DailyHighlightCardProps) {
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Daily highlight
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <HighlightItem
          label="Task spotlight"
          item={task}
          derivedStatuses={derivedStatuses}
          categoryMap={categoryMap}
          onOpenItem={onOpenItem}
          onToggleComplete={onToggleComplete}
          onScheduleItem={onScheduleItem}
        />
        <HighlightItem
          label="Routine spotlight"
          item={routine}
          derivedStatuses={derivedStatuses}
          categoryMap={categoryMap}
          onOpenItem={onOpenItem}
          onToggleComplete={onToggleComplete}
          onScheduleItem={onScheduleItem}
        />
      </CardContent>
    </Card>
  );
}
