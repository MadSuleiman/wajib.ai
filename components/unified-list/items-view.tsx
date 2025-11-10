import { useMemo, type ReactNode } from "react";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, Circle, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  priorityIcons,
  priorityLabels,
  formatDateLabel,
} from "@/components/list-utils";
import type { ListItem, RecurrenceType, TaskPriority } from "@/types";
import {
  DataTable,
  type DataTableColumn,
  type DataTableSortState,
} from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { EditableHoursField } from "@/components/editable-hours-field";
import { recurrenceLabelMap, recurrenceOptions } from "./constants";
import type { CategoryOption, DerivedStatus, ItemGroup } from "./types";

const formatAddedDescription = (createdAt: string) => {
  const absolute = formatDateLabel(createdAt);
  const relative = formatDistanceToNow(new Date(createdAt), {
    addSuffix: true,
  });
  return `${absolute} · ${relative}`;
};

type ItemsViewProps = {
  isMobile: boolean;
  summaryText: string;
  prioritizedItems: ListItem[];
  displayGroups: ItemGroup[];
  categoryMap: Map<string, CategoryOption>;
  categoryOptions: CategoryOption[];
  derivedStatuses: Map<string, DerivedStatus>;
  updateItemCategory: (itemId: string, category: string) => Promise<boolean>;
  updateItemRecurrence: (
    itemId: string,
    recurrence: { type: RecurrenceType; interval: number },
  ) => Promise<boolean>;
  updateItemPriority: (
    itemId: string,
    priority: TaskPriority,
  ) => Promise<boolean>;
  updateItemHours: (itemId: string, hours: string) => Promise<boolean>;
  toggleItemCompletion: (item: ListItem) => Promise<boolean>;
  deleteItem: (itemId: string) => Promise<boolean>;
  emptyStateContent: ReactNode;
  tableSortState?: DataTableSortState;
  onTableSortChange: (nextSort: DataTableSortState) => void;
};

export function ItemsView({
  isMobile,
  summaryText,
  prioritizedItems,
  displayGroups,
  categoryMap,
  categoryOptions,
  derivedStatuses,
  updateItemCategory,
  updateItemRecurrence,
  updateItemPriority,
  updateItemHours,
  toggleItemCompletion,
  deleteItem,
  emptyStateContent,
  tableSortState,
  onTableSortChange,
}: ItemsViewProps) {
  return (
    <div className="space-y-4">
      {isMobile && (
        <p className="text-sm text-muted-foreground">{summaryText}</p>
      )}
      {isMobile ? (
        prioritizedItems.length ? (
          <MobileList
            groups={displayGroups}
            categoryMap={categoryMap}
            derivedStatuses={derivedStatuses}
            toggleItemCompletion={toggleItemCompletion}
            updateItemRecurrence={updateItemRecurrence}
            updateItemHours={updateItemHours}
            deleteItem={deleteItem}
          />
        ) : (
          <div className="rounded-lg border bg-card/40">
            {emptyStateContent}
          </div>
        )
      ) : (
        <DesktopTable
          items={prioritizedItems}
          groups={displayGroups}
          categoryOptions={categoryOptions}
          derivedStatuses={derivedStatuses}
          updateItemCategory={updateItemCategory}
          updateItemRecurrence={updateItemRecurrence}
          updateItemPriority={updateItemPriority}
          updateItemHours={updateItemHours}
          toggleItemCompletion={toggleItemCompletion}
          deleteItem={deleteItem}
          emptyState={emptyStateContent}
          sortState={tableSortState}
          onSortChange={onTableSortChange}
        />
      )}
    </div>
  );
}

type DesktopTableProps = {
  items: ListItem[];
  groups: ItemGroup[];
  categoryOptions: CategoryOption[];
  derivedStatuses: Map<string, DerivedStatus>;
  updateItemCategory: (itemId: string, category: string) => Promise<boolean>;
  updateItemRecurrence: (
    itemId: string,
    recurrence: { type: RecurrenceType; interval: number },
  ) => Promise<boolean>;
  updateItemPriority: (
    itemId: string,
    priority: TaskPriority,
  ) => Promise<boolean>;
  updateItemHours: (itemId: string, hours: string) => Promise<boolean>;
  toggleItemCompletion: (item: ListItem) => Promise<boolean>;
  deleteItem: (itemId: string) => Promise<boolean>;
  emptyState: React.ReactNode;
  sortState?: DataTableSortState;
  onSortChange: (nextSort: DataTableSortState) => void;
};

function DesktopTable({
  items,
  groups,
  categoryOptions,
  derivedStatuses,
  updateItemCategory,
  updateItemRecurrence,
  updateItemPriority,
  updateItemHours,
  toggleItemCompletion,
  deleteItem,
  emptyState,
  sortState,
  onSortChange,
}: DesktopTableProps) {
  const columns = useMemo<DataTableColumn<ListItem>[]>(() => {
    return [
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
                <span
                  className={cn(
                    "font-medium leading-tight",
                    isCompleted && "text-muted-foreground line-through",
                  )}
                >
                  {item.title}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatAddedDescription(item.created_at)}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        id: "category",
        header: "Category",
        cell: (item) => (
          <Select
            value={item.category}
            onValueChange={(value) => updateItemCategory(item.id, value)}
          >
            <SelectTrigger className="w-[150px] capitalize">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ),
      },
      {
        id: "recurrence",
        header: "Recurrence",
        cell: (item) => (
          <div className="flex flex-col gap-1">
            <Select
              value={item.recurrence_type}
              onValueChange={(value) =>
                updateItemRecurrence(item.id, {
                  type: value as RecurrenceType,
                  interval: item.recurrence_interval || 1,
                })
              }
            >
              <SelectTrigger className="h-8 w-[140px] capitalize">
                <SelectValue placeholder="Recurrence" />
              </SelectTrigger>
              <SelectContent>
                {recurrenceOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              key={`${item.id}-${item.recurrence_interval}-${item.recurrence_type}`}
              type="number"
              min={1}
              defaultValue={item.recurrence_interval || 1}
              disabled={item.recurrence_type === "none"}
              className="h-8 w-[100px]"
              onBlur={(event) => {
                const nextValue = Number.parseInt(event.target.value, 10);
                if (
                  Number.isNaN(nextValue) ||
                  nextValue < 1 ||
                  nextValue === item.recurrence_interval
                ) {
                  return;
                }
                void updateItemRecurrence(item.id, {
                  type: item.recurrence_type,
                  interval: nextValue,
                });
              }}
            />
            {item.recurrence_type !== "none" && (
              <p className="text-xs text-muted-foreground">
                Next:{" "}
                {item.recurrence_next_occurrence
                  ? formatDateLabel(item.recurrence_next_occurrence)
                  : "Not scheduled"}
              </p>
            )}
          </div>
        ),
      },
      {
        id: "priority",
        header: "Priority",
        sortable: true,
        cell: (item) => (
          <Select
            value={item.priority}
            onValueChange={(value: TaskPriority) =>
              updateItemPriority(item.id, value)
            }
          >
            <SelectTrigger className="w-[150px] capitalize">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(priorityLabels) as TaskPriority[]).map((option) => (
                <SelectItem key={option} value={option}>
                  <div className="flex items-center gap-2">
                    {priorityIcons[option]}
                    <span>{priorityLabels[option]}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ),
      },
      {
        id: "hours",
        header: "Hours",
        sortable: true,
        cell: (item) => (
          <EditableHoursField
            itemId={item.id}
            initialValue={item.estimated_hours ?? null}
            onSave={updateItemHours}
          />
        ),
      },
      {
        id: "added",
        header: "Added",
        sortable: true,
        cell: (item) => (
          <span className="text-sm text-muted-foreground">
            {formatAddedDescription(item.created_at)}
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
    ];
  }, [
    categoryOptions,
    deleteItem,
    derivedStatuses,
    toggleItemCompletion,
    updateItemCategory,
    updateItemHours,
    updateItemPriority,
    updateItemRecurrence,
  ]);

  return (
    <DataTable
      columns={columns}
      data={items}
      groups={groups}
      emptyState={emptyState}
      sortState={sortState}
      onSortChange={onSortChange}
    />
  );
}

type MobileListProps = {
  groups: ItemGroup[];
  categoryMap: Map<string, CategoryOption>;
  derivedStatuses: Map<string, DerivedStatus>;
  toggleItemCompletion: (item: ListItem) => Promise<boolean>;
  updateItemRecurrence: (
    itemId: string,
    recurrence: { type: RecurrenceType; interval: number },
  ) => Promise<boolean>;
  updateItemHours: (itemId: string, hours: string) => Promise<boolean>;
  deleteItem: (itemId: string) => Promise<boolean>;
};

function MobileList({
  groups,
  categoryMap,
  derivedStatuses,
  toggleItemCompletion,
  updateItemRecurrence,
  updateItemHours,
  deleteItem,
}: MobileListProps) {
  return (
    <div className="space-y-5">
      {groups
        .filter((group) => group.items.length > 0)
        .map((group, index) => (
          <div key={`${group.label || "group"}-${index}`}>
            {group.label && (
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.label}
              </p>
            )}
            <div className="space-y-3">
              {group.items.map((item) => {
                const categoryInfo = categoryMap.get(item.category);
                const categoryLabel = categoryInfo?.label ?? item.category;
                const isCompleted =
                  (derivedStatuses.get(item.id) ?? "active") === "completed";

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border bg-card/50 p-4 shadow-sm backdrop-blur"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p
                          className={cn(
                            "text-base font-semibold leading-tight",
                            isCompleted && "text-muted-foreground line-through",
                          )}
                        >
                          {item.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatAddedDescription(item.created_at)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleItemCompletion(item)}
                        className="flex h-8 w-8 items-center justify-center rounded-full border text-muted-foreground transition hover:border-primary hover:text-primary"
                        aria-pressed={isCompleted}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        ) : (
                          <Circle className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      <Badge
                        variant="secondary"
                        className="flex items-center gap-1 text-[0.7rem]"
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{
                            backgroundColor:
                              categoryInfo?.color ?? "currentColor",
                          }}
                        />
                        {categoryLabel}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="flex items-center gap-1 text-[0.7rem]"
                      >
                        {priorityIcons[item.priority]}
                        {priorityLabels[item.priority]}
                      </Badge>
                      <span className="text-muted-foreground">
                        {item.estimated_hours
                          ? `${item.estimated_hours}h`
                          : "No estimate"}
                      </span>
                    </div>
                    {item.recurrence_type !== "none" && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {recurrenceLabelMap[item.recurrence_type]} every{" "}
                        {item.recurrence_interval} • Next{" "}
                        {item.recurrence_next_occurrence
                          ? formatDateLabel(item.recurrence_next_occurrence)
                          : "not scheduled"}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-3">
                      <Select
                        value={item.recurrence_type}
                        onValueChange={(value) =>
                          updateItemRecurrence(item.id, {
                            type: value as RecurrenceType,
                            interval: item.recurrence_interval || 1,
                          })
                        }
                      >
                        <SelectTrigger className="h-8 flex-1 capitalize">
                          <SelectValue placeholder="Recurrence" />
                        </SelectTrigger>
                        <SelectContent>
                          {recurrenceOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {item.recurrence_type !== "none" && (
                        <Input
                          type="number"
                          min={1}
                          defaultValue={item.recurrence_interval || 1}
                          className="h-8 w-16"
                          onBlur={(event) => {
                            const nextValue = Number.parseInt(
                              event.target.value,
                              10,
                            );
                            if (
                              Number.isNaN(nextValue) ||
                              nextValue < 1 ||
                              nextValue === item.recurrence_interval
                            ) {
                              return;
                            }
                            void updateItemRecurrence(item.id, {
                              type: item.recurrence_type,
                              interval: nextValue,
                            });
                          }}
                        />
                      )}
                      <EditableHoursField
                        itemId={item.id}
                        initialValue={item.estimated_hours ?? null}
                        onSave={updateItemHours}
                        showIcon={false}
                        inputClassName="h-8 w-20"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteItem(item.id)}
                        className="ml-auto text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete item</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
    </div>
  );
}
