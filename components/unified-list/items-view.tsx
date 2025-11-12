import { useCallback, useMemo, useState, type ReactNode } from "react";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, Circle, Pencil, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { priorityIcons, priorityLabels } from "@/components/list-utils";
import type { ListItem, TaskPriority } from "@/types";
import {
  DataTable,
  type DataTableColumn,
  type DataTableSortState,
} from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { recurrenceLabelMap } from "./constants";
import type { CategoryOption, DerivedStatus, ItemGroup } from "./types";
import {
  formatLocalDateTime,
  formatTimeZoneDisplay,
  getLocalTimeZone,
} from "@/lib/timezone";
import { TaskEditor } from "./task-editor";

const formatAddedDescription = (createdAt: string, timeZone: string) => {
  const absolute = formatLocalDateTime(createdAt, timeZone);
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
  updateItemDetails: (
    itemId: string,
    updates: {
      title?: string;
      priority?: TaskPriority;
      hours?: string | null;
      category?: string;
      recurrence?: { type: ListItem["recurrence_type"]; interval: number };
    },
  ) => Promise<boolean>;
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
  updateItemDetails,
  toggleItemCompletion,
  deleteItem,
  emptyStateContent,
  tableSortState,
  onTableSortChange,
}: ItemsViewProps) {
  const userTimeZone = useMemo(() => getLocalTimeZone(), []);
  const timeZoneDisplay = useMemo(
    () => formatTimeZoneDisplay(userTimeZone),
    [userTimeZone],
  );
  const formatAdded = useCallback(
    (value: string) => formatAddedDescription(value, userTimeZone),
    [userTimeZone],
  );
  const formatNextOccurrence = useCallback(
    (value: string | null) =>
      value ? formatLocalDateTime(value, userTimeZone) : "Not scheduled",
    [userTimeZone],
  );

  const [editorTask, setEditorTask] = useState<ListItem | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const handleOpenEditor = useCallback((item: ListItem) => {
    setEditorTask(item);
    setIsEditorOpen(true);
  }, []);

  const handleEditorOpenChange = useCallback((open: boolean) => {
    setIsEditorOpen(open);
    if (!open) {
      setEditorTask(null);
    }
  }, []);

  return (
    <div className="space-y-4">
      {isMobile && (
        <p className="text-sm text-muted-foreground">{summaryText}</p>
      )}
      <p className="text-xs text-muted-foreground">
        Times shown in {timeZoneDisplay}
      </p>
      {isMobile ? (
        prioritizedItems.length ? (
          <MobileList
            groups={displayGroups}
            categoryMap={categoryMap}
            derivedStatuses={derivedStatuses}
            toggleItemCompletion={toggleItemCompletion}
            deleteItem={deleteItem}
            formatAdded={formatAdded}
            formatNextOccurrence={formatNextOccurrence}
            onEditTask={handleOpenEditor}
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
          categoryMap={categoryMap}
          derivedStatuses={derivedStatuses}
          toggleItemCompletion={toggleItemCompletion}
          deleteItem={deleteItem}
          emptyState={emptyStateContent}
          sortState={tableSortState}
          onSortChange={onTableSortChange}
          formatAdded={formatAdded}
          formatNextOccurrence={formatNextOccurrence}
          onEditTask={handleOpenEditor}
        />
      )}

      <TaskEditor
        isOpen={isEditorOpen}
        onOpenChange={handleEditorOpenChange}
        item={editorTask}
        categoryOptions={categoryOptions}
        onSave={updateItemDetails}
        isMobile={isMobile}
      />
    </div>
  );
}

type DesktopTableProps = {
  items: ListItem[];
  groups: ItemGroup[];
  categoryMap: Map<string, CategoryOption>;
  derivedStatuses: Map<string, DerivedStatus>;
  toggleItemCompletion: (item: ListItem) => Promise<boolean>;
  deleteItem: (itemId: string) => Promise<boolean>;
  emptyState: React.ReactNode;
  sortState?: DataTableSortState;
  onSortChange: (nextSort: DataTableSortState) => void;
  formatAdded: (value: string) => string;
  formatNextOccurrence: (value: string | null) => string;
  onEditTask: (item: ListItem) => void;
};

function DesktopTable({
  items,
  groups,
  categoryMap,
  derivedStatuses,
  toggleItemCompletion,
  deleteItem,
  emptyState,
  sortState,
  onSortChange,
  formatAdded,
  formatNextOccurrence,
  onEditTask,
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
                  {formatAdded(item.created_at)}
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
      {
        id: "recurrence",
        header: "Recurrence",
        cell: (item) => (
          <div className="flex flex-col text-sm">
            <span className="font-medium">
              {item.recurrence_type === "none"
                ? "One-time"
                : `${recurrenceLabelMap[item.recurrence_type]} · every ${item.recurrence_interval}`}
            </span>
            <span className="text-xs text-muted-foreground">
              {item.recurrence_type === "none"
                ? "Doesn't repeat"
                : `Next: ${formatNextOccurrence(item.recurrence_next_occurrence)}`}
            </span>
          </div>
        ),
      },
      {
        id: "priority",
        header: "Priority",
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
        id: "hours",
        header: "Hours",
        sortable: true,
        cell: (item) => (
          <span className="text-sm font-medium">
            {typeof item.estimated_hours === "number"
              ? `${item.estimated_hours}h`
              : "—"}
          </span>
        ),
      },
      {
        id: "added",
        header: "Added",
        sortable: true,
        cell: (item) => (
          <span className="text-sm text-muted-foreground">
            {formatAdded(item.created_at)}
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
    categoryMap,
    deleteItem,
    derivedStatuses,
    formatAdded,
    formatNextOccurrence,
    onEditTask,
    toggleItemCompletion,
  ]);
  return (
    <DataTable
      columns={columns}
      data={items}
      groups={groups}
      emptyState={emptyState}
      sortState={sortState}
      onSortChange={onSortChange}
      rowWrapper={(row, item, rowKey) => {
        const isCompleted =
          (derivedStatuses.get(item.id) ?? "active") === "completed";
        return (
          <ContextMenu key={rowKey}>
            <ContextMenuTrigger asChild>{row}</ContextMenuTrigger>
            <ContextMenuContent className="w-48">
              <ContextMenuItem
                onSelect={() => {
                  void toggleItemCompletion(item);
                }}
              >
                {isCompleted ? "Mark as active" : "Mark as complete"}
              </ContextMenuItem>
              <ContextMenuItem
                onSelect={() => {
                  onEditTask(item);
                }}
              >
                Edit task
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => {
                  void deleteItem(item.id);
                }}
              >
                Delete task
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        );
      }}
    />
  );
}

type MobileListProps = {
  groups: ItemGroup[];
  categoryMap: Map<string, CategoryOption>;
  derivedStatuses: Map<string, DerivedStatus>;
  toggleItemCompletion: (item: ListItem) => Promise<boolean>;
  deleteItem: (itemId: string) => Promise<boolean>;
  formatAdded: (value: string) => string;
  formatNextOccurrence: (value: string | null) => string;
  onEditTask: (item: ListItem) => void;
};

function MobileList({
  groups,
  categoryMap,
  derivedStatuses,
  toggleItemCompletion,
  deleteItem,
  formatAdded,
  formatNextOccurrence,
  onEditTask,
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
                          {formatAdded(item.created_at)}
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
                        {formatNextOccurrence(item.recurrence_next_occurrence)}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onEditTask(item)}
                        className="flex items-center gap-2"
                      >
                        <Pencil className="h-4 w-4" /> Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteItem(item.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="mr-1 h-4 w-4" /> Delete
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
