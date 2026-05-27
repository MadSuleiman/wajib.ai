"use client";

import React, { useMemo, type ReactNode } from "react";
import {
  CalendarPlus,
  CheckCircle2,
  Circle,
  Pencil,
  Trash2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  priorityIcons,
  priorityLabels,
  urgencyIcons,
  urgencyLabels,
} from "@/components/dashboard/list-utils";
import type { ListItem } from "@/types";
import {
  DataTable,
  type DataTableColumn,
  type DataTableSortState,
} from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { recurrenceLabelMap } from "./constants";
import type { CategoryOption, DerivedStatus, ItemGroup } from "./types";
import { itemAnchorId } from "./item-anchor";

export type DesktopItemsTableProps = {
  variant: "task" | "routine";
  items: ListItem[];
  groups: ItemGroup[];
  categoryMap: Map<string, CategoryOption>;
  derivedStatuses: Map<string, DerivedStatus>;
  toggleItemCompletion: (item: ListItem) => Promise<boolean>;
  deleteItem: (itemId: string) => Promise<boolean>;
  onScheduleItem: (item: ListItem) => void;
  emptyState: ReactNode;
  sortState?: DataTableSortState;
  onSortChange: (nextSort: DataTableSortState) => void;
  formatAdded: (value: string) => string;
  onEditTask: (item: ListItem) => void;
  getRoutineTiming: (item: ListItem) => {
    label: "Due in" | "Resets in";
    value: string;
    statusText: string;
  } | null;
};

export const DesktopItemsTable = React.memo(function DesktopItemsTable({
  variant,
  items,
  groups,
  categoryMap,
  derivedStatuses,
  toggleItemCompletion,
  deleteItem,
  onScheduleItem,
  emptyState,
  sortState,
  onSortChange,
  formatAdded,
  onEditTask,
  getRoutineTiming,
}: DesktopItemsTableProps) {
  const addedDescriptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) {
      map.set(item.id, formatAdded(item.created_at));
    }
    return map;
  }, [formatAdded, items]);

  const columns = useMemo<DataTableColumn<ListItem>[]>(() => {
    const columnsLocal: DataTableColumn<ListItem>[] = [
      {
        id: "title",
        header: "Item",
        sortable: true,
        cell: (item) => {
          const isCompleted =
            (derivedStatuses.get(item.id) ?? "active") === "completed";
          return (
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => toggleItemCompletion(item)}
                disabled={item.item_kind === "routine" && item.local_only}
                className="mt-1 flex h-5 w-5 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2"
                aria-pressed={isCompleted}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
              </button>
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "font-medium leading-tight",
                      isCompleted && "text-muted-foreground line-through",
                    )}
                  >
                    {item.title}
                  </span>
                  {item.sync_status === "pending" ? (
                    <Badge variant="outline" className="text-[0.65rem]">
                      Pending sync
                    </Badge>
                  ) : null}
                </div>
                <span className="text-xs text-muted-foreground">
                  {addedDescriptions.get(item.id) ??
                    formatAdded(item.created_at)}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        id: "category",
        header: "Category",
        cell: (item) => {
          const categoryInfo = categoryMap.get(item.category);
          return (
            <div className="flex items-center gap-2 text-sm capitalize">
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor:
                    categoryInfo?.color ?? "var(--muted-foreground)",
                }}
              />
              <span>{categoryInfo?.label ?? item.category}</span>
            </div>
          );
        },
      },
    ];

    if (variant === "routine") {
      columnsLocal.push({
        id: "recurrence",
        header: "Recurrence",
        cell: (item) => {
          const timing = getRoutineTiming(item);
          return (
            <div className="flex flex-col text-sm">
              <span className="font-medium">
                {item.recurrence_type === "none"
                  ? "One-time"
                  : `${recurrenceLabelMap[item.recurrence_type]} - every ${item.recurrence_interval}`}
              </span>
              <span className="text-xs text-muted-foreground">
                {item.recurrence_type === "none"
                  ? "Doesn't repeat"
                  : (timing?.statusText ?? "Scheduled")}
              </span>
              {timing ? (
                <span className="text-xs text-muted-foreground">
                  {timing.label}: {timing.value}
                </span>
              ) : null}
            </div>
          );
        },
      });
    }

    columnsLocal.push(
      {
        id: "priority",
        header: "Value",
        sortable: true,
        cell: (item) => (
          <Badge
            variant="secondary"
            className="flex items-center gap-2 capitalize"
          >
            {priorityIcons[item.priority]}
            {priorityLabels[item.priority]}
          </Badge>
        ),
      },
      {
        id: "urgency",
        header: "Urgency",
        sortable: true,
        cell: (item) => (
          <Badge
            variant="outline"
            className="flex items-center gap-2 capitalize"
          >
            {urgencyIcons[item.urgency]}
            {urgencyLabels[item.urgency]}
          </Badge>
        ),
      },
      {
        id: "hours",
        header: "Hours",
        sortable: true,
        cell: (item) => (
          <span className="text-sm font-medium">
            {typeof item.estimated_hours === "number"
              ? `${item.estimated_hours}h`
              : "-"}
          </span>
        ),
      },
      {
        id: "added",
        header: "Added",
        sortable: true,
        cell: (item) => (
          <span className="text-sm text-muted-foreground">
            {addedDescriptions.get(item.id) ?? formatAdded(item.created_at)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: (item) => (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onEditTask(item)}
              className="text-muted-foreground hover:text-primary"
            >
              <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onScheduleItem(item)}
              className="text-muted-foreground hover:text-primary"
            >
              <CalendarPlus className="mr-2 h-3.5 w-3.5" /> Schedule
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => deleteItem(item.id)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete item</span>
            </Button>
          </div>
        ),
      },
    );

    return columnsLocal;
  }, [
    variant,
    categoryMap,
    deleteItem,
    derivedStatuses,
    addedDescriptions,
    formatAdded,
    getRoutineTiming,
    onEditTask,
    onScheduleItem,
    toggleItemCompletion,
  ]);

  return (
    <DataTable
      columns={columns}
      data={items}
      groups={groups}
      getRowId={(item) => itemAnchorId(item.id)}
      emptyState={emptyState}
      sortState={sortState}
      onSortChange={onSortChange}
    />
  );
});
DesktopItemsTable.displayName = "DesktopItemsTable";
