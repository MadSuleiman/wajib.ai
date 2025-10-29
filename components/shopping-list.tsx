"use client";

import React, { useCallback, useMemo, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Filter,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import {
  DataTable,
  type DataTableColumn,
  type DataTableSortState,
} from "@/components/ui/data-table";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import type { ShoppingItem, TaskPriority } from "@/types";
import { useSupabase } from "@/components/supabase-provider";

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
  hours: undefined,
};

const sortKeyByColumnId: Record<string, SortKey | undefined> = {
  priority: "priority",
  title: "title",
  added: "date",
};

const defaultSortValue: SortOptionValue = "priority:desc";

const formatAddedDescription = (createdAt: string) => {
  const absolute = formatDateLabel(createdAt);
  const relative = formatDistanceToNow(new Date(createdAt), {
    addSuffix: true,
  });
  return `${absolute} · ${relative}`;
};

export function ShoppingList() {
  const isMobile = useIsMobile();
  const {
    items,
    isLoading,
    addItem,
    toggleItemCompletion,
    updateItemPriority,
    deleteItem,
  } = useSupabase().shopping;

  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemPriority, setNewItemPriority] =
    useState<TaskPriority>("medium");
  const [groupMode, setGroupMode] = useState<ItemGroupMode>("month");
  const [sortValue, setSortValue] = useState<SortOptionValue>(defaultSortValue);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const sortConfig = useMemo(() => sortConfigFromValue(sortValue), [sortValue]);

  const tableSortState = useMemo<DataTableSortState | undefined>(() => {
    const columnId = columnIdBySortKey[sortConfig.key];
    if (!columnId) return undefined;
    return { columnId, direction: sortConfig.direction };
  }, [sortConfig]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await addItem(newItemTitle, newItemPriority);
    if (success) {
      setNewItemTitle("");
      setNewItemPriority("medium");
      setCreateOpen(false);
    }
  };

  const filteredItems = useMemo(() => {
    switch (statusFilter) {
      case "completed":
        return items.filter((item) => item.completed);
      case "all":
        return items;
      case "active":
      default:
        return items.filter((item) => !item.completed);
    }
  }, [items, statusFilter]);

  const sortedItems = useMemo(
    () => sortItems(filteredItems, sortConfig),
    [filteredItems, sortConfig],
  );

  const groupedItems = useMemo(
    () => groupItems(sortedItems, groupMode),
    [sortedItems, groupMode],
  );

  const displayGroups =
    groupMode === "none" ? [{ label: "", items: sortedItems }] : groupedItems;

  const completedCount = useMemo(
    () => items.filter((item) => item.completed).length,
    [items],
  );

  const summaryText = `Showing ${sortedItems.length} of ${items.length} items (${completedCount} completed)`;

  const emptyStateMessage =
    items.length === 0
      ? "No items yet. Add your first one above."
      : "No items match your current filters.";

  const handleTableSortChange = useCallback((state: DataTableSortState) => {
    const sortKey = sortKeyByColumnId[state.columnId];
    if (!sortKey) return;
    setSortValue(`${sortKey}:${state.direction}` as SortOptionValue);
  }, []);

  const itemColumns = useMemo<DataTableColumn<ShoppingItem>[]>(() => {
    return [
      {
        id: "status",
        header: "Status",
        cell: (item) => (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => toggleItemCompletion(item.id, item.completed)}
          >
            {item.completed ? (
              <CheckCircle2 className="h-5 w-5 text-primary" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground" />
            )}
            <span className="sr-only">
              {item.completed ? "Mark as incomplete" : "Mark as complete"}
            </span>
          </Button>
        ),
        cellClassName: "w-[60px]",
      },
      {
        id: "title",
        header: "Item",
        sortable: true,
        cell: (item) => (
          <p
            className={cn(
              "font-medium",
              item.completed && "text-muted-foreground line-through",
            )}
          >
            {item.title}
          </p>
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
            <SelectTrigger className="h-8 min-w-[140px]">
              <SelectValue>
                <div className="flex items-center gap-2">
                  {priorityIcons[item.priority]}
                  <span>{priorityLabels[item.priority]}</span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">
                <div className="flex items-center gap-2">
                  {priorityIcons.low}
                  <span>Low</span>
                </div>
              </SelectItem>
              <SelectItem value="medium">
                <div className="flex items-center gap-2">
                  {priorityIcons.medium}
                  <span>Medium</span>
                </div>
              </SelectItem>
              <SelectItem value="high">
                <div className="flex items-center gap-2">
                  {priorityIcons.high}
                  <span>High</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        ),
        cellClassName: "w-[180px]",
      },
      {
        id: "added",
        header: "Added",
        sortable: true,
        cell: (item) => (
          <div className="text-xs text-muted-foreground">
            <div>{formatDateLabel(item.created_at)}</div>
            <div>
              {formatDistanceToNow(new Date(item.created_at), {
                addSuffix: true,
              })}
            </div>
          </div>
        ),
        cellClassName: "min-w-[160px]",
      },
      {
        id: "actions",
        header: "",
        cell: (item) => (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => deleteItem(item.id)}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete item</span>
          </Button>
        ),
        cellClassName: "w-[60px] text-right",
      },
    ];
  }, [deleteItem, toggleItemCompletion, updateItemPriority]);

  const renderShoppingCard = (item: ShoppingItem) => (
    <Card key={item.id} className="h-full">
      <CardHeader className="px-5 pb-3">
        <CardTitle
          className={cn(
            "text-base font-semibold",
            item.completed && "text-muted-foreground line-through",
          )}
        >
          {item.title}
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          {formatAddedDescription(item.created_at)}
        </CardDescription>
        <CardAction>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => toggleItemCompletion(item.id, item.completed)}
          >
            {item.completed ? (
              <CheckCircle2 className="h-5 w-5 text-primary" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground" />
            )}
            <span className="sr-only">
              {item.completed ? "Mark as incomplete" : "Mark as complete"}
            </span>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="px-5 pt-0">
        <div className="space-y-4">
          <div className="text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              {priorityIcons[item.priority]}
              {priorityLabels[item.priority]} priority
            </span>
          </div>
          <div className="grid gap-3">
            <div className="grid gap-1">
              <Label className="text-xs font-medium text-muted-foreground">
                Priority
              </Label>
              <Select
                value={item.priority}
                onValueChange={(value: TaskPriority) =>
                  updateItemPriority(item.id, value)
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="px-5 pt-0">
        <div className="flex w-full justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-destructive"
            onClick={() => deleteItem(item.id)}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete item</span>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );

  const formLayoutClasses = cn(
    "grid gap-3",
    !isMobile && "sm:grid-cols-3 sm:gap-4",
    "w-full",
  );

  const submitButtonClasses = cn(
    "justify-center",
    isMobile ? "w-full" : "sm:w-auto",
  );

  const addItemForm = (
    <form onSubmit={handleAddItem} className={formLayoutClasses}>
      <div className={cn(!isMobile && "sm:col-span-2")}>
        <Label htmlFor="new-shopping-item" className="sr-only">
          Shopping item
        </Label>
        <Input
          id="new-shopping-item"
          placeholder="Add a shopping item..."
          value={newItemTitle}
          onChange={(e) => setNewItemTitle(e.target.value)}
          disabled={isLoading}
          className="w-full"
        />
      </div>
      <div
        className={cn(
          "flex gap-2",
          isMobile ? "flex-col" : "sm:flex-row",
          "w-full",
        )}
      >
        <Select
          value={newItemPriority}
          onValueChange={(value: TaskPriority) => setNewItemPriority(value)}
          disabled={isLoading}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="submit"
          disabled={isLoading}
          className={submitButtonClasses}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </Button>
      </div>
    </form>
  );

  const filtersSection = (
    <div className="flex w-full flex-wrap items-end gap-4">
      <div className="flex flex-col gap-1 w-full sm:w-auto sm:min-w-[220px]">
        <Label htmlFor="shopping-grouping">Group by</Label>
        <Select
          value={groupMode}
          onValueChange={(value) => setGroupMode(value as ItemGroupMode)}
          disabled={!sortedItems.length}
        >
          <SelectTrigger id="shopping-grouping" className="w-full">
            <SelectValue placeholder="Grouping" />
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
      <div className="flex flex-col gap-1 w-full sm:w-auto sm:min-w-[220px]">
        <Label htmlFor="shopping-sorting">Sort by</Label>
        <Select
          value={sortValue}
          onValueChange={(value) => setSortValue(value as SortOptionValue)}
          disabled={!sortedItems.length}
        >
          <SelectTrigger id="shopping-sorting" className="w-full">
            <SelectValue placeholder="Sorting" />
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
      <div className="flex flex-col gap-1 w-full sm:w-auto sm:min-w-[220px]">
        <Label htmlFor="shopping-status">Status</Label>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as StatusFilter)}
        >
          <SelectTrigger id="shopping-status" className="w-full">
            <SelectValue placeholder="Filter" />
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
    </div>
  );

  if (isMobile) {
    return (
      <>
        <section className="flex min-h-screen flex-col bg-background">
          <header className="border-b bg-card px-4 py-6 shadow-sm">
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                size="icon"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setFiltersOpen(true)}
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto px-4 py-6">
            {sortedItems.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {emptyStateMessage}
              </p>
            ) : (
              <div className="space-y-6">
                {displayGroups.map((group, index) => (
                  <div key={group.label || index} className="space-y-3">
                    {group.label ? (
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {group.label}
                      </p>
                    ) : null}
                    <Carousel
                      className="w-full"
                      opts={{ align: "start", dragFree: true }}
                    >
                      <CarouselContent className="-ml-3">
                        {group.items.map((item) => (
                          <CarouselItem
                            key={item.id}
                            className="basis-[90%] pl-3 sm:basis-[60%]"
                          >
                            {renderShoppingCard(item)}
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                    </Carousel>
                  </div>
                ))}
              </div>
            )}
          </main>
          <footer className="border-t bg-card px-4 py-3 text-sm text-muted-foreground">
            {summaryText}
          </footer>
        </section>
        <Drawer
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          direction="bottom"
        >
          <DrawerContent className="max-h-[80vh]">
            <DrawerHeader>
              <DrawerTitle>Filters</DrawerTitle>
            </DrawerHeader>
            <div className="overflow-y-auto px-4 pb-4">{filtersSection}</div>
            <div className="border-t px-4 pb-4 pt-3">
              <DrawerClose asChild>
                <Button className="w-full" variant="secondary">
                  Close
                </Button>
              </DrawerClose>
            </div>
          </DrawerContent>
        </Drawer>
        <Drawer
          open={createOpen}
          onOpenChange={setCreateOpen}
          direction="bottom"
        >
          <DrawerContent className="max-h-[80vh]">
            <DrawerHeader>
              <DrawerTitle>New Item</DrawerTitle>
            </DrawerHeader>
            <div className="overflow-y-auto px-4 pb-4">{addItemForm}</div>
            <div className="border-t px-4 pb-4 pt-3">
              <DrawerClose asChild>
                <Button className="w-full" variant="secondary">
                  Close
                </Button>
              </DrawerClose>
            </div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <Card>
      <CardHeader className="p-6 pb-0">
        <div className="flex flex-col gap-6">
          <div className="flex justify-end">
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Item</DialogTitle>
                  <DialogDescription>
                    Add a shopping item to keep track of what you need.
                  </DialogDescription>
                </DialogHeader>
                {addItemForm}
              </DialogContent>
            </Dialog>
          </div>
          {filtersSection}
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {sortedItems.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {emptyStateMessage}
          </p>
        ) : (
          <DataTable
            columns={itemColumns}
            data={sortedItems}
            groups={groupMode === "none" ? undefined : groupedItems}
            emptyState={emptyStateMessage}
            sortState={tableSortState}
            onSortChange={handleTableSortChange}
          />
        )}
      </CardContent>
      <CardFooter className="border-t p-6 pt-4 text-sm text-muted-foreground">
        {summaryText}
      </CardFooter>
    </Card>
  );
}
