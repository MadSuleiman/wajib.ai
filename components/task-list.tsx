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
import type { Task, TaskPriority } from "@/types";
import { useSupabase } from "@/components/supabase-provider";
import { EditableHoursField } from "@/components/editable-hours-field";

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

export function TaskList() {
  const isMobile = useIsMobile();
  const {
    tasks,
    isLoading,
    addTask,
    toggleTaskCompletion,
    updateTaskPriority,
    updateTaskHours,
    deleteTask,
  } = useSupabase().tasks;

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] =
    useState<TaskPriority>("medium");
  const [newTaskHours, setNewTaskHours] = useState<string>("");
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

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await addTask(newTaskTitle, newTaskPriority, newTaskHours);
    if (success) {
      setNewTaskTitle("");
      setNewTaskPriority("medium");
      setNewTaskHours("");
      setCreateOpen(false);
    }
  };

  const filteredTasks = useMemo(() => {
    switch (statusFilter) {
      case "completed":
        return tasks.filter((task) => task.completed);
      case "all":
        return tasks;
      case "active":
      default:
        return tasks.filter((task) => !task.completed);
    }
  }, [tasks, statusFilter]);

  const sortedTasks = useMemo(
    () => sortItems(filteredTasks, sortConfig),
    [filteredTasks, sortConfig],
  );

  const groupedTasks = useMemo(
    () => groupItems(sortedTasks, groupMode),
    [sortedTasks, groupMode],
  );

  const displayGroups =
    groupMode === "none" ? [{ label: "", items: sortedTasks }] : groupedTasks;

  const completedCount = useMemo(
    () => tasks.filter((task) => task.completed).length,
    [tasks],
  );

  const summaryText = `Showing ${sortedTasks.length} of ${tasks.length} tasks (${completedCount} completed)`;

  const emptyStateMessage =
    tasks.length === 0
      ? "No tasks yet. Add your first one above."
      : "No tasks match your current filters.";

  const handleTableSortChange = useCallback((state: DataTableSortState) => {
    const sortKey = sortKeyByColumnId[state.columnId];
    if (!sortKey) return;
    setSortValue(`${sortKey}:${state.direction}` as SortOptionValue);
  }, []);

  const taskColumns = useMemo<DataTableColumn<Task>[]>(() => {
    return [
      {
        id: "status",
        header: "Status",
        cell: (task) => (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => toggleTaskCompletion(task.id, task.completed)}
          >
            {task.completed ? (
              <CheckCircle2 className="h-5 w-5 text-primary" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground" />
            )}
            <span className="sr-only">
              {task.completed ? "Mark as incomplete" : "Mark as complete"}
            </span>
          </Button>
        ),
        cellClassName: "w-[60px]",
      },
      {
        id: "title",
        header: "Task",
        sortable: true,
        cell: (task) => (
          <p
            className={cn(
              "font-medium",
              task.completed && "text-muted-foreground line-through",
            )}
          >
            {task.title}
          </p>
        ),
      },
      {
        id: "priority",
        header: "Priority",
        sortable: true,
        cell: (task) => (
          <Select
            value={task.priority}
            onValueChange={(value: TaskPriority) =>
              updateTaskPriority(task.id, value)
            }
          >
            <SelectTrigger className="h-8 min-w-[140px]">
              <SelectValue>
                <div className="flex items-center gap-2">
                  {priorityIcons[task.priority]}
                  <span>{priorityLabels[task.priority]}</span>
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
        id: "hours",
        header: "Hours",
        sortable: true,
        cell: (task) => (
          <EditableHoursField
            itemId={task.id}
            initialValue={task.estimated_hours ?? null}
            onSave={updateTaskHours}
            className="justify-start"
            inputClassName="h-8 w-20"
            srLabel="Save estimated hours"
          />
        ),
        cellClassName: "w-[160px]",
      },
      {
        id: "added",
        header: "Added",
        sortable: true,
        cell: (task) => (
          <div className="text-xs text-muted-foreground">
            <div>{formatDateLabel(task.created_at)}</div>
            <div>
              {formatDistanceToNow(new Date(task.created_at), {
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
        cell: (task) => (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => deleteTask(task.id)}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete task</span>
          </Button>
        ),
        cellClassName: "w-[60px] text-right",
      },
    ];
  }, [deleteTask, toggleTaskCompletion, updateTaskHours, updateTaskPriority]);

  const renderTaskMobileCard = (task: Task) => (
    <Card key={task.id} className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-2">
        <div className="flex-1 space-y-1">
          <CardTitle
            className={cn(
              "text-base font-semibold",
              task.completed && "text-muted-foreground line-through",
            )}
          >
            {task.title}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            {formatAddedDescription(task.created_at)}
          </CardDescription>
        </div>
        <CardAction className="mt-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => toggleTaskCompletion(task.id, task.completed)}
          >
            {task.completed ? (
              <CheckCircle2 className="h-5 w-5 text-primary" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground" />
            )}
            <span className="sr-only">
              {task.completed ? "Mark as incomplete" : "Mark as complete"}
            </span>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 p-4 pt-0">
        <div className="text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            {priorityIcons[task.priority]}
            {priorityLabels[task.priority]} priority
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={task.priority}
            onValueChange={(value: TaskPriority) =>
              updateTaskPriority(task.id, value)
            }
          >
            <SelectTrigger className="h-8 min-w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
          <EditableHoursField
            itemId={task.id}
            initialValue={task.estimated_hours ?? null}
            onSave={updateTaskHours}
            inputClassName="h-8 w-20 sm:w-24"
            srLabel="Save estimated hours"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => deleteTask(task.id)}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete task</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const formLayoutClasses = cn(
    "grid gap-3",
    !isMobile && "sm:grid-cols-4 sm:gap-4",
    "w-full",
  );

  const submitButtonClasses = cn(
    "justify-center",
    isMobile ? "w-full" : "sm:w-auto",
  );

  const addTaskForm = (
    <form onSubmit={handleAddTask} className={formLayoutClasses}>
      <div className={cn(!isMobile && "sm:col-span-2")}>
        <Label htmlFor="new-task" className="sr-only">
          Task title
        </Label>
        <Input
          id="new-task"
          placeholder="Add a new task..."
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          disabled={isLoading}
          className="w-full"
        />
      </div>
      <div>
        <Label htmlFor="new-task-priority" className="sr-only">
          Task priority
        </Label>
        <Select
          value={newTaskPriority}
          onValueChange={(value: TaskPriority) => setNewTaskPriority(value)}
          disabled={isLoading}
        >
          <SelectTrigger id="new-task-priority" className="w-full">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className={cn("flex gap-2", isMobile ? "flex-col" : "sm:flex-row")}>
        <Input
          placeholder="Hours"
          type="number"
          min="0.1"
          step="0.1"
          value={newTaskHours}
          onChange={(e) => setNewTaskHours(e.target.value)}
          disabled={isLoading}
          className="w-full"
        />
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
        <Label htmlFor="task-grouping">Group by</Label>
        <Select
          value={groupMode}
          onValueChange={(value) => setGroupMode(value as ItemGroupMode)}
          disabled={!sortedTasks.length}
        >
          <SelectTrigger id="task-grouping" className="w-full">
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
        <Label htmlFor="task-sorting">Sort by</Label>
        <Select
          value={sortValue}
          onValueChange={(value) => setSortValue(value as SortOptionValue)}
          disabled={!sortedTasks.length}
        >
          <SelectTrigger id="task-sorting" className="w-full">
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
        <Label htmlFor="task-status">Status</Label>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as StatusFilter)}
        >
          <SelectTrigger id="task-status" className="w-full">
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
        <section className="flex max-h-[80vh] flex-col">
          <header className="px-4 py-3">
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setFiltersOpen(true)}
              >
                <Filter className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto px-4 py-6">
            {sortedTasks.length === 0 ? (
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
                        {group.items.map((task) => (
                          <CarouselItem
                            key={task.id}
                            className="basis-[90%] pl-3 sm:basis-[60%]"
                          >
                            {renderTaskMobileCard(task)}
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                    </Carousel>
                  </div>
                ))}
              </div>
            )}
          </main>
          <footer className="border-t px-4 py-3 text-sm text-muted-foreground">
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
              <DrawerTitle>New Task</DrawerTitle>
            </DrawerHeader>
            <div className="overflow-y-auto px-4 pb-4">{addTaskForm}</div>
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
                  <DialogTitle>Create Task</DialogTitle>
                  <DialogDescription>
                    Provide task details to add it to your dashboard.
                  </DialogDescription>
                </DialogHeader>
                {addTaskForm}
              </DialogContent>
            </Dialog>
          </div>
          {filtersSection}
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {sortedTasks.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {emptyStateMessage}
          </p>
        ) : (
          <DataTable
            columns={taskColumns}
            data={sortedTasks}
            groups={groupMode === "none" ? undefined : groupedTasks}
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
