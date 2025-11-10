"use client";

import React, { useCallback, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Check,
  CheckCircle2,
  Circle,
  ChevronsUpDown,
  Filter,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useSupabase } from "@/components/supabase-provider";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  groupItems,
  sortItems,
  priorityIcons,
  priorityLabels,
  formatDateLabel,
  type ItemGroupMode,
  type SortKey,
  type SortOptionValue,
  sortConfigFromValue,
} from "@/components/list-utils";
import type { Category, ListItem, TaskPriority, RecurrenceType } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DataTable,
  type DataTableColumn,
  type DataTableSortState,
} from "@/components/ui/data-table";
import { EditableHoursField } from "@/components/editable-hours-field";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis } from "recharts";

type StatusFilter = "active" | "completed" | "all";

const groupingOptions: { label: string; value: ItemGroupMode }[] = [
  { label: "Month", value: "month" },
  { label: "Week", value: "week" },
  { label: "Day", value: "date" },
  { label: "Priority", value: "priority" },
  { label: "No grouping", value: "none" },
];

const sortOptions: { label: string; value: SortOptionValue }[] = [
  { label: "Priority (high → low)", value: "priority:desc" },
  { label: "Priority (low → high)", value: "priority:asc" },
  { label: "Newest first", value: "date:desc" },
  { label: "Oldest first", value: "date:asc" },
  { label: "Title A → Z", value: "title:asc" },
  { label: "Title Z → A", value: "title:desc" },
  { label: "Hours (high → low)", value: "hours:desc" },
  { label: "Hours (low → high)", value: "hours:asc" },
];

const statusOptions: { label: string; value: StatusFilter }[] = [
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
  { label: "All", value: "all" },
];

const columnIdBySortKey: Record<SortKey, string | undefined> = {
  priority: "priority",
  date: "added",
  title: "title",
  hours: "hours",
};

const sortKeyByColumnId: Record<string, SortKey | undefined> = {
  priority: "priority",
  title: "title",
  added: "date",
  hours: "hours",
};

const defaultSortValue: SortOptionValue = "priority:desc";

const formatAddedDescription = (createdAt: string) => {
  const absolute = formatDateLabel(createdAt);
  const relative = formatDistanceToNow(new Date(createdAt), {
    addSuffix: true,
  });
  return `${absolute} · ${relative}`;
};

type ToolbarButtonProps = React.ComponentProps<typeof Button> & {
  icon: typeof Plus;
};

const ToolbarButton = ({
  icon: Icon,
  children,
  ...props
}: ToolbarButtonProps) => (
  <Button variant="secondary" size="sm" {...props}>
    <Icon className="mr-2 h-4 w-4" />
    {children}
  </Button>
);

const recurrenceOptions: {
  label: string;
  value: RecurrenceType;
  description: string;
}[] = [
  { label: "One-time", value: "none", description: "Does not repeat" },
  { label: "Daily", value: "daily", description: "Repeats every N day(s)" },
  { label: "Weekly", value: "weekly", description: "Repeats every N week(s)" },
  {
    label: "Monthly",
    value: "monthly",
    description: "Repeats every N month(s)",
  },
  { label: "Yearly", value: "yearly", description: "Repeats every N year(s)" },
];

const recurrenceLabelMap: Record<RecurrenceType, string> =
  recurrenceOptions.reduce(
    (acc, option) => ({ ...acc, [option.value]: option.label }),
    {} as Record<RecurrenceType, string>,
  );

const splitDailyRecurringItems = <
  T extends { recurrence_type?: RecurrenceType | null },
>(
  items: T[],
) => {
  if (!items.length) {
    return { prioritized: items, daily: [] as T[], others: [] as T[] };
  }

  const daily: T[] = [];
  const others: T[] = [];

  for (const item of items) {
    if (item.recurrence_type === "daily") {
      daily.push(item);
    } else {
      others.push(item);
    }
  }

  if (daily.length === 0 || daily.length === items.length) {
    return { prioritized: items, daily, others };
  }

  return { prioritized: [...daily, ...others], daily, others };
};

export function UnifiedList() {
  const isMobile = useIsMobile();
  const supabaseContext = useSupabase();
  const {
    items,
    isLoading,
    addItem,
    toggleItemCompletion,
    updateItemPriority,
    updateItemHours,
    updateItemCategory,
    updateItemRecurrence,
    deleteItem,
  } = supabaseContext.items;
  const categories: Category[] = supabaseContext.categories;

  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemPriority, setNewItemPriority] =
    useState<TaskPriority>("medium");
  const [newItemHours, setNewItemHours] = useState("");
  const [newItemCategorySelection, setNewItemCategorySelection] =
    useState<string>(() => categories[0]?.slug ?? "task");
  const [newItemRecurrenceType, setNewItemRecurrenceType] =
    useState<RecurrenceType>("none");
  const [newItemRecurrenceInterval, setNewItemRecurrenceInterval] =
    useState<string>("1");
  const [groupMode, setGroupMode] = useState<ItemGroupMode>("month");
  const [sortValue, setSortValue] = useState<SortOptionValue>(defaultSortValue);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);

  const fallbackCategory = categories[0]?.slug ?? "task";
  const newItemCategory = useMemo(() => {
    const exists = categories.some(
      (category) => category.slug === newItemCategorySelection,
    );
    return exists ? newItemCategorySelection : fallbackCategory;
  }, [categories, fallbackCategory, newItemCategorySelection]);

  const categoryOptions = useMemo(() => {
    return [...categories]
      .sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
      )
      .map((category) => ({
        value: category.slug,
        label: category.label,
        color: category.color,
      }));
  }, [categories]);

  const categoryMap = useMemo(() => {
    return new Map(categoryOptions.map((option) => [option.value, option]));
  }, [categoryOptions]);

  const sortConfig = useMemo(() => sortConfigFromValue(sortValue), [sortValue]);

  const tableSortState = useMemo<DataTableSortState | undefined>(() => {
    const columnId = columnIdBySortKey[sortConfig.key];
    if (!columnId) return undefined;
    return { columnId, direction: sortConfig.direction };
  }, [sortConfig]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "completed"
            ? item.completed
            : !item.completed;

      const matchesCategory =
        categoryFilter === "all" ? true : item.category === categoryFilter;

      return matchesStatus && matchesCategory;
    });
  }, [items, statusFilter, categoryFilter]);

  const sortedItems = useMemo(
    () => sortItems(filteredItems, sortConfig),
    [filteredItems, sortConfig],
  );

  const {
    prioritized: prioritizedItems,
    daily: dailyRecurringItems,
    others: nonDailyItems,
  } = useMemo(() => splitDailyRecurringItems(sortedItems), [sortedItems]);

  const groupedItems = useMemo(
    () => groupItems(prioritizedItems, groupMode),
    [prioritizedItems, groupMode],
  );

  const displayGroups =
    groupMode === "none"
      ? (() => {
          const groups = [
            ...(dailyRecurringItems.length
              ? [{ label: "Daily recurring", items: dailyRecurringItems }]
              : []),
            ...(nonDailyItems.length
              ? [
                  {
                    label: dailyRecurringItems.length ? "Other tasks" : "",
                    items: nonDailyItems,
                  },
                ]
              : []),
          ];
          return groups.length
            ? groups
            : [{ label: "", items: prioritizedItems }];
        })()
      : groupedItems;

  const completedCount = useMemo(
    () => items.filter((item) => item.completed).length,
    [items],
  );
  const activeCount = items.length - completedCount;
  const recurringCount = useMemo(
    () => items.filter((item) => item.recurrence_type !== "none").length,
    [items],
  );

  const summaryText = `Showing ${prioritizedItems.length} of ${items.length} items (${activeCount} active, ${completedCount} completed)`;

  const emptyStateMessage =
    items.length === 0
      ? "Nothing here yet. Add your first item to get started."
      : "No items match the current filters.";

  const emptyStateContent = (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
      <Filter className="h-5 w-5 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{emptyStateMessage}</p>
    </div>
  );

  const categoryChartData = useMemo(() => {
    return categoryOptions
      .map((option) => ({
        name: option.label,
        count: items.filter((item) => item.category === option.value).length,
      }))
      .filter((entry) => entry.count > 0)
      .slice(0, 8);
  }, [categoryOptions, items]);

  const recurringBreakdownData = useMemo(() => {
    return recurrenceOptions
      .filter((option) => option.value !== "none")
      .map((option) => ({
        cadence: option.label,
        count: items.filter((item) => item.recurrence_type === option.value)
          .length,
      }))
      .filter((entry) => entry.count > 0);
  }, [items]);

  const chartConfig = {
    count: {
      label: "Tasks",
      color: "var(--chart-1)",
    },
    value: {
      label: "Tasks",
      color: "var(--chart-2)",
    },
  } as const;

  const handleAddItem = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      const parsedInterval = Number.parseInt(newItemRecurrenceInterval, 10);
      const normalizedInterval = Number.isNaN(parsedInterval)
        ? 1
        : Math.max(1, parsedInterval);

      const success = await addItem({
        title: newItemTitle,
        priority: newItemPriority,
        hours: newItemHours,
        category: newItemCategory,
        recurrenceType: newItemRecurrenceType,
        recurrenceInterval: normalizedInterval,
      });

      if (success) {
        setNewItemTitle("");
        setNewItemPriority("medium");
        setNewItemHours("");
        setNewItemCategorySelection(fallbackCategory);
        setNewItemRecurrenceType("none");
        setNewItemRecurrenceInterval("1");
      }
    },
    [
      addItem,
      fallbackCategory,
      newItemCategory,
      newItemHours,
      newItemRecurrenceInterval,
      newItemRecurrenceType,
      newItemPriority,
      newItemTitle,
    ],
  );

  const handleTableSortChange = useCallback((nextSort: DataTableSortState) => {
    const sortKey = sortKeyByColumnId[nextSort.columnId];
    if (!sortKey) return;
    setSortValue(`${sortKey}:${nextSort.direction}` as SortOptionValue);
  }, []);

  const columns = useMemo<DataTableColumn<ListItem>[]>(() => {
    return [
      {
        id: "title",
        header: "Item",
        sortable: true,
        cell: (item) => (
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => toggleItemCompletion(item)}
              className="mt-1 flex h-5 w-5 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2"
              aria-pressed={item.completed}
            >
              {item.completed ? (
                <CheckCircle2 className="h-4 w-4 text-primary" />
              ) : (
                <Circle className="h-4 w-4" />
              )}
            </button>
            <div className="flex flex-col gap-1">
              <span
                className={cn(
                  "font-medium leading-tight",
                  item.completed && "text-muted-foreground line-through",
                )}
              >
                {item.title}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatAddedDescription(item.created_at)}
              </span>
            </div>
          </div>
        ),
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
              {(Object.keys(priorityLabels) as TaskPriority[]).map(
                (priority) => (
                  <SelectItem key={priority} value={priority}>
                    <div className="flex items-center gap-2">
                      {priorityIcons[priority]}
                      <span>{priorityLabels[priority]}</span>
                    </div>
                  </SelectItem>
                ),
              )}
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
            showIcon={false}
            inputClassName="h-8 w-24"
          />
        ),
      },
      {
        id: "added",
        header: "Added",
        sortable: true,
        cell: (item) => (
          <span className="text-sm text-muted-foreground">
            {formatDateLabel(item.created_at)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
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
    toggleItemCompletion,
    updateItemCategory,
    updateItemHours,
    updateItemPriority,
    updateItemRecurrence,
  ]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Capture an item</CardTitle>
          <CardDescription>
            Track everything in one place and label items with a category that
            makes sense to you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddItem} className="space-y-3 lg:space-y-2">
            <div className="space-y-2">
              <Label htmlFor="item-title">Title</Label>
              <Input
                id="item-title"
                value={newItemTitle}
                onChange={(event) => setNewItemTitle(event.target.value)}
                placeholder="Ex. Renew passport, pick up groceries, watch Dune 2"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 md:gap-2">
              <div className="space-y-2">
                <Label htmlFor="item-category">Category</Label>
                <Popover
                  open={categoryPopoverOpen}
                  onOpenChange={setCategoryPopoverOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      id="item-category"
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={categoryPopoverOpen}
                      className="w-full justify-between"
                      disabled={!categoryOptions.length}
                    >
                      {categoryMap.get(newItemCategory)?.label ||
                        "Select category"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[240px] p-0">
                    <Command>
                      <CommandInput
                        placeholder="Search category..."
                        className="h-9"
                      />
                      <CommandList>
                        <CommandEmpty>No category found.</CommandEmpty>
                        <CommandGroup>
                          {categoryOptions.map((option) => (
                            <CommandItem
                              key={option.value}
                              value={option.value}
                              onSelect={(currentValue) => {
                                setNewItemCategorySelection(currentValue);
                                setCategoryPopoverOpen(false);
                              }}
                            >
                              {option.label}
                              <Check
                                className={cn(
                                  "ml-auto h-4 w-4",
                                  newItemCategory === option.value
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={newItemPriority}
                  onValueChange={(value: TaskPriority) =>
                    setNewItemPriority(value)
                  }
                >
                  <SelectTrigger className="w-full capitalize">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(priorityLabels) as TaskPriority[]).map(
                      (priority) => (
                        <SelectItem key={priority} value={priority}>
                          <div className="flex items-center gap-2">
                            {priorityIcons[priority]}
                            <span>{priorityLabels[priority]}</span>
                          </div>
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:gap-2">
              <div className="space-y-2">
                <Label>Recurrence</Label>
                <Select
                  value={newItemRecurrenceType}
                  onValueChange={(value: RecurrenceType) =>
                    setNewItemRecurrenceType(value)
                  }
                >
                  <SelectTrigger className="w-full capitalize">
                    <SelectValue placeholder="Does not repeat" />
                  </SelectTrigger>
                  <SelectContent>
                    {recurrenceOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {
                    recurrenceOptions.find(
                      (option) => option.value === newItemRecurrenceType,
                    )?.description
                  }
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-recurrence-interval">Every</Label>
                <Input
                  id="item-recurrence-interval"
                  type="number"
                  min={1}
                  value={newItemRecurrenceInterval}
                  onChange={(event) =>
                    setNewItemRecurrenceInterval(event.target.value)
                  }
                  disabled={newItemRecurrenceType === "none"}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:gap-2">
              <div className="space-y-2">
                <Label htmlFor="item-hours">Estimated hours</Label>
                <Input
                  id="item-hours"
                  inputMode="decimal"
                  value={newItemHours}
                  onChange={(event) => setNewItemHours(event.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="submit"
                  disabled={!newItemTitle.trim() || isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Add
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>{summaryText}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-semibold">{activeCount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-semibold">{completedCount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Categories</p>
              <p className="text-2xl font-semibold">{categoryOptions.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Recurring</p>
              <p className="text-2xl font-semibold">{recurringCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border bg-card/50 backdrop-blur w-full">
          <CardHeader>
            <CardTitle>Filters &amp; grouping</CardTitle>
            <CardDescription>
              Focus on just the items you care about.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(value: StatusFilter) => setStatusFilter(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={categoryFilter}
                onValueChange={(value) => setCategoryFilter(value)}
              >
                <SelectTrigger className="capitalize">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categoryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Grouping</Label>
              <Select
                value={groupMode}
                onValueChange={(value: ItemGroupMode) => setGroupMode(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {groupingOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Sort</Label>
              <Select
                value={sortValue}
                onValueChange={(value: SortOptionValue) => setSortValue(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2">
            <ToolbarButton
              type="button"
              icon={Filter}
              onClick={() => {
                setStatusFilter("active");
                setCategoryFilter("all");
                setGroupMode("month");
                setSortValue(defaultSortValue);
              }}
            >
              Reset filters
            </ToolbarButton>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Category distribution</CardTitle>
            <CardDescription>
              How your tasks spread across focus areas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categoryChartData.length ? (
              <ChartContainer config={chartConfig} className="w-full">
                <BarChart data={categoryChartData}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={6} />
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="text-sm text-muted-foreground">
                Start adding items to see category insights.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recurring cadence</CardTitle>
            <CardDescription>
              Track how many routines you are maintaining.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {recurringBreakdownData.length ? (
              <ChartContainer config={chartConfig} className="w-full">
                <LineChart data={recurringBreakdownData}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="cadence"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="var(--color-count)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <p className="text-sm text-muted-foreground">
                Mark tasks as recurring to see cadence analytics.
              </p>
            )}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs uppercase text-muted-foreground">
                  Active
                </p>
                <p className="text-lg font-semibold">{activeCount}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">
                  Completed
                </p>
                <p className="text-lg font-semibold">{completedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {isMobile && (
          <p className="text-sm text-muted-foreground">{summaryText}</p>
        )}
        {isMobile ? (
          prioritizedItems.length ? (
            <div className="space-y-5">
              {displayGroups
                .filter((group) => group.items.length > 0)
                .map((group, groupIndex) => (
                  <div key={`${group.label || "group"}-${groupIndex}`}>
                    {group.label && (
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {group.label}
                      </p>
                    )}
                    <div className="space-y-3">
                      {group.items.map((item) => {
                        const categoryInfo = categoryMap.get(item.category);
                        const categoryLabel =
                          categoryInfo?.label ?? item.category;

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
                                    item.completed &&
                                      "text-muted-foreground line-through",
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
                                aria-pressed={item.completed}
                              >
                                {item.completed ? (
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
                                  ? formatDateLabel(
                                      item.recurrence_next_occurrence,
                                    )
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
                                    <SelectItem
                                      key={option.value}
                                      value={option.value}
                                    >
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
          ) : (
            <div className="rounded-lg border bg-card/40">
              {emptyStateContent}
            </div>
          )
        ) : (
          <DataTable
            columns={columns}
            data={prioritizedItems}
            groups={displayGroups.map((group) => ({
              label: group.label,
              items: group.items,
            }))}
            emptyState={emptyStateContent}
            sortState={tableSortState}
            onSortChange={handleTableSortChange}
          />
        )}
      </div>
    </div>
  );
}
