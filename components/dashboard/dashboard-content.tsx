"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { Filter } from "lucide-react";

import { useSupabase } from "@/components/dashboard/supabase-provider";
import { useCreationDialogs } from "@/components/dashboard/creation-dialogs-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDailyHighlightPreference } from "@/hooks/use-daily-highlight-preference";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  groupItems,
  sortItems,
  sortConfigFromValue,
  type ItemGroupMode,
  type SortOptionValue,
} from "@/components/dashboard/list-utils";
import type { Category, ListItem, RecurrenceType } from "@/types";
import type { DataTableSortState } from "@/components/ui/data-table";

import {
  columnIdBySortKey,
  defaultSortValue,
  recurrenceOptions,
  sortKeyByColumnId,
} from "./constants";
import type {
  CategoryOption,
  DerivedStatus,
  ItemGroup,
  StatusFilter,
} from "./types";
import { NewItemCard } from "./new-item-card";
import { InsightsGrid } from "./insights-grid";
import { FiltersCard } from "./filters-card";
import { ItemsView } from "./items-view";
import { DailyHighlightCard } from "./daily-highlight-card";
import { itemAnchorId } from "./item-anchor";

const getDerivedStatus = (item: ListItem, now: number): DerivedStatus => {
  void now;
  return item.completed ? "completed" : "active";
};

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

const DAILY_HIGHLIGHT_STORAGE_KEY = "wajib:daily-highlight";
const DAILY_HIGHLIGHT_EVENT = "wajib:daily-highlight";

type DailyHighlightState = {
  day: string;
  taskId?: string;
  routineId?: string;
};

const getLocalDayKey = (timestamp: number) => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const hashSeed = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const pickDailyItem = (items: ListItem[], seed: string) => {
  if (!items.length) return null;
  const sorted = [...items].sort((a, b) =>
    a.id.localeCompare(b.id, undefined, { sensitivity: "base" }),
  );
  const index = hashSeed(seed) % sorted.length;
  return sorted[index];
};

const subscribeDailyHighlight = (callback: () => void) => {
  if (typeof window === "undefined") return () => undefined;

  const handler = (event: StorageEvent | Event) => {
    if (event instanceof StorageEvent) {
      if (event.key !== DAILY_HIGHLIGHT_STORAGE_KEY) return;
    }
    callback();
  };

  window.addEventListener("storage", handler);
  window.addEventListener(DAILY_HIGHLIGHT_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(DAILY_HIGHLIGHT_EVENT, handler);
  };
};

const getDailyHighlightSnapshot = () => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(DAILY_HIGHLIGHT_STORAGE_KEY);
};

const getDailyHighlightServerSnapshot = () => null;

export function DashboardContent() {
  const isMobile = useIsMobile();
  const supabaseContext = useSupabase();
  const {
    items,
    isLoading,
    addItem,
    toggleItemCompletion,
    updateItemDetails,
    deleteItem,
  } = supabaseContext.items;
  const categories: Category[] = supabaseContext.categories;
  const {
    isCreateTaskOpen,
    setIsCreateTaskOpen,
    isCreateRoutineOpen,
    setIsCreateRoutineOpen,
  } = useCreationDialogs();

  const [groupMode, setGroupMode] = useState<ItemGroupMode>("month");
  const [sortValue, setSortValue] = useState<SortOptionValue>(defaultSortValue);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [timeMarker, setTimeMarker] = useState(() => Date.now());
  const [showInsights, setShowInsights] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<"tasks" | "routines">("tasks");
  const { isEnabled: isDailyHighlightEnabled } = useDailyHighlightPreference();

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTimeMarker(Date.now());
    }, 60_000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const categoryOptions = useMemo<CategoryOption[]>(() => {
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

  const categoryMap = useMemo(
    () => new Map(categoryOptions.map((option) => [option.value, option])),
    [categoryOptions],
  );

  const derivedStatuses = useMemo(() => {
    return items.reduce((map, item) => {
      map.set(item.id, getDerivedStatus(item, timeMarker));
      return map;
    }, new Map<string, DerivedStatus>());
  }, [items, timeMarker]);

  const { tasks, routines } = useMemo(() => {
    const taskItems: ListItem[] = [];
    const routineItems: ListItem[] = [];
    for (const item of items) {
      if (item.item_kind === "routine" || item.recurrence_type !== "none") {
        routineItems.push(item);
      } else {
        taskItems.push(item);
      }
    }
    return { tasks: taskItems, routines: routineItems };
  }, [items]);

  const dayKey = useMemo(() => getLocalDayKey(timeMarker), [timeMarker]);

  const storedHighlightRaw = useSyncExternalStore(
    subscribeDailyHighlight,
    getDailyHighlightSnapshot,
    getDailyHighlightServerSnapshot,
  );

  const storedHighlight = useMemo(() => {
    if (!storedHighlightRaw) return null;
    try {
      return JSON.parse(storedHighlightRaw) as DailyHighlightState;
    } catch {
      return null;
    }
  }, [storedHighlightRaw]);

  const computedHighlight = useMemo(() => {
    if (!isDailyHighlightEnabled) return null;

    const activeTasks = tasks.filter(
      (item) => (derivedStatuses.get(item.id) ?? "active") === "active",
    );
    const activeRoutines = routines.filter(
      (item) => (derivedStatuses.get(item.id) ?? "active") === "active",
    );

    const storedTask =
      storedHighlight?.day === dayKey && storedHighlight.taskId
        ? (activeTasks.find((item) => item.id === storedHighlight.taskId) ??
          null)
        : null;
    const storedRoutine =
      storedHighlight?.day === dayKey && storedHighlight.routineId
        ? (activeRoutines.find(
            (item) => item.id === storedHighlight.routineId,
          ) ?? null)
        : null;

    const nextTask = storedTask ?? pickDailyItem(activeTasks, `${dayKey}-task`);
    const nextRoutine =
      storedRoutine ?? pickDailyItem(activeRoutines, `${dayKey}-routine`);

    return {
      day: dayKey,
      taskId: nextTask?.id,
      routineId: nextRoutine?.id,
    } satisfies DailyHighlightState;
  }, [
    dayKey,
    derivedStatuses,
    isDailyHighlightEnabled,
    routines,
    storedHighlight,
    tasks,
  ]);

  useEffect(() => {
    if (!computedHighlight) return;
    const nextRaw = JSON.stringify(computedHighlight);
    if (nextRaw === storedHighlightRaw) return;
    window.localStorage.setItem(DAILY_HIGHLIGHT_STORAGE_KEY, nextRaw);
    window.dispatchEvent(new Event(DAILY_HIGHLIGHT_EVENT));
  }, [computedHighlight, storedHighlightRaw]);

  const dailyTask = useMemo(() => {
    if (!computedHighlight?.taskId) return null;
    return tasks.find((item) => item.id === computedHighlight.taskId) ?? null;
  }, [computedHighlight, tasks]);

  const dailyRoutine = useMemo(() => {
    if (!computedHighlight?.routineId) return null;
    return (
      routines.find((item) => item.id === computedHighlight.routineId) ?? null
    );
  }, [computedHighlight, routines]);

  const filterAndSortItems = useCallback(
    (input: ListItem[]) => {
      const filtered = input.filter((item) => {
        const derivedStatus = derivedStatuses.get(item.id) ?? "active";
        const matchesStatus =
          statusFilter === "all" ? true : statusFilter === derivedStatus;

        const matchesCategory =
          categoryFilter === "all" ? true : item.category === categoryFilter;

        return matchesStatus && matchesCategory;
      });

      const sortConfig = sortConfigFromValue(sortValue);
      const sorted = sortItems(filtered, sortConfig);
      const { prioritized, daily, others } = splitDailyRecurringItems(sorted);
      const grouped = groupItems(prioritized, groupMode).map((group) => ({
        label: group.label,
        items: group.items,
      }));
      const groupedForNone =
        groupMode === "none"
          ? (() => {
              const groups: ItemGroup[] = [];
              if (daily.length) {
                groups.push({ label: "Daily recurring", items: daily });
              }
              if (others.length) {
                groups.push({
                  label: daily.length ? "Other tasks" : "",
                  items: others,
                });
              }
              return groups.length
                ? groups
                : [{ label: "", items: prioritized }];
            })()
          : grouped;

      const tableSortState = (() => {
        const sortConfigLocal = sortConfigFromValue(sortValue);
        const columnId = columnIdBySortKey[sortConfigLocal.key];
        if (!columnId) return undefined;
        return { columnId, direction: sortConfigLocal.direction };
      })();

      return {
        filtered,
        prioritized,
        groupedItems: groupedForNone,
        tableSortState,
      };
    },
    [categoryFilter, derivedStatuses, groupMode, sortValue, statusFilter],
  );

  const taskView = useMemo(
    () => filterAndSortItems(tasks),
    [filterAndSortItems, tasks],
  );
  const routineView = useMemo(
    () => filterAndSortItems(routines),
    [filterAndSortItems, routines],
  );

  const counts = useMemo(() => {
    const accumulator = (list: ListItem[]) => {
      let completed = 0;
      list.forEach((item) => {
        const status = derivedStatuses.get(item.id) ?? "active";
        if (status === "completed") completed += 1;
      });
      return {
        completedCount: completed,
        activeCount: list.length - completed,
      };
    };
    return {
      tasks: accumulator(tasks),
      routines: accumulator(routines),
    };
  }, [derivedStatuses, routines, tasks]);

  const recurringCount = useMemo(() => routines.length, [routines]);

  const summaryTextTasks = `Showing ${taskView.prioritized.length} of ${
    tasks.length
  } tasks (${counts.tasks.activeCount} active, ${
    counts.tasks.completedCount
  } completed)`;

  const summaryTextRoutines = `Showing ${routineView.prioritized.length} of ${
    routines.length
  } routines (${counts.routines.activeCount} due, ${
    counts.routines.completedCount
  } not due)`;

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

  const handleTableSortChange = useCallback((nextSort: DataTableSortState) => {
    const sortKey = sortKeyByColumnId[nextSort.columnId];
    if (!sortKey) return;
    setSortValue(`${sortKey}:${nextSort.direction}` as SortOptionValue);
  }, []);

  const handleResetFilters = useCallback(() => {
    setStatusFilter("active");
    setCategoryFilter("all");
    setGroupMode("month");
    setSortValue(defaultSortValue);
  }, []);

  const handleOpenItem = useCallback(
    (item: ListItem) => {
      if (isMobile) {
        const targetTab =
          item.item_kind === "routine" || item.recurrence_type !== "none"
            ? "routines"
            : "tasks";
        setActiveTab(targetTab);
        window.setTimeout(() => {
          const element = document.getElementById(itemAnchorId(item.id));
          element?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 80);
      } else {
        const element = document.getElementById(itemAnchorId(item.id));
        element?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    },
    [isMobile, setActiveTab],
  );

  const fallbackCategory = categories[0]?.slug ?? "task";
  const handleAddTask = useCallback(
    async (input: Parameters<typeof addItem>[0]) => {
      const success = await addItem({ ...input, recurrenceType: "none" });
      if (success) {
        setIsCreateTaskOpen(false);
      }
      return success;
    },
    [addItem, setIsCreateTaskOpen],
  );

  const handleBulkAddTask = useCallback(
    async (input: Parameters<typeof addItem>[0]) =>
      addItem({ ...input, recurrenceType: "none" }),
    [addItem],
  );

  const handleAddRoutine = useCallback(
    async (input: Parameters<typeof addItem>[0]) => {
      const success = await addItem({
        ...input,
        recurrenceType: input.recurrenceType ?? "daily",
      });
      if (success) {
        setIsCreateRoutineOpen(false);
      }
      return success;
    },
    [addItem, setIsCreateRoutineOpen],
  );

  const handleBulkAddRoutine = useCallback(
    async (input: Parameters<typeof addItem>[0]) =>
      addItem({
        ...input,
        recurrenceType: input.recurrenceType ?? "daily",
      }),
    [addItem],
  );

  const newTaskForm = (
    <NewItemCard
      variant="task"
      onAddItem={handleAddTask}
      onBulkAddItem={handleBulkAddTask}
      isSubmitting={isLoading}
      categoryOptions={categoryOptions}
      defaultCategory={fallbackCategory}
    />
  );

  const newRoutineForm = (
    <NewItemCard
      variant="routine"
      onAddItem={handleAddRoutine}
      onBulkAddItem={handleBulkAddRoutine}
      isSubmitting={isLoading}
      categoryOptions={categoryOptions}
      defaultCategory={fallbackCategory}
    />
  );

  const createTaskLauncher = isMobile ? (
    <Drawer
      open={isCreateTaskOpen}
      onOpenChange={setIsCreateTaskOpen}
      direction="bottom"
    >
      <DrawerContent className="max-h-[85vh] overflow-hidden">
        <DrawerHeader className="sr-only">
          <DrawerTitle>Create task</DrawerTitle>
        </DrawerHeader>
        <div className="overflow-y-auto p-4 pt-2">{newTaskForm}</div>
      </DrawerContent>
    </Drawer>
  ) : (
    <Dialog open={isCreateTaskOpen} onOpenChange={setIsCreateTaskOpen}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create task</DialogTitle>
          <DialogDescription>
            Capture an item and add details before saving.
          </DialogDescription>
        </DialogHeader>
        {newTaskForm}
      </DialogContent>
    </Dialog>
  );

  const createRoutineLauncher = isMobile ? (
    <Drawer
      open={isCreateRoutineOpen}
      onOpenChange={setIsCreateRoutineOpen}
      direction="bottom"
    >
      <DrawerContent className="max-h-[85vh] overflow-hidden">
        <DrawerHeader className="sr-only">
          <DrawerTitle>Create routine</DrawerTitle>
        </DrawerHeader>
        <div className="overflow-y-auto p-4 pt-2">{newRoutineForm}</div>
      </DrawerContent>
    </Drawer>
  ) : (
    <Dialog open={isCreateRoutineOpen} onOpenChange={setIsCreateRoutineOpen}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create routine</DialogTitle>
          <DialogDescription>
            Add a recurring cadence and mark completions over time.
          </DialogDescription>
        </DialogHeader>
        {newRoutineForm}
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6">
      {createRoutineLauncher}
      {createTaskLauncher}

      <div className="flex justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowInsights((prev) => !prev)}
        >
          {showInsights ? "Hide task insights" : "Show task insights"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters((prev) => !prev)}
        >
          {showFilters ? "Hide filters" : "Show filters"}
        </Button>
      </div>

      {isDailyHighlightEnabled ? (
        <DailyHighlightCard
          task={dailyTask}
          routine={dailyRoutine}
          derivedStatuses={derivedStatuses}
          categoryMap={categoryMap}
          onOpenItem={handleOpenItem}
          onToggleComplete={(item) => void toggleItemCompletion(item)}
        />
      ) : null}

      {showInsights ? (
        <InsightsGrid
          categoryChartData={categoryChartData}
          recurringBreakdownData={recurringBreakdownData}
          summaryText={`${items.length} total items`}
          activeCount={counts.tasks.activeCount + counts.routines.activeCount}
          completedCount={
            counts.tasks.completedCount + counts.routines.completedCount
          }
          categoryCount={categoryOptions.length}
          recurringCount={recurringCount}
        />
      ) : null}
      {showFilters ? (
        <FiltersCard
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          categoryFilter={categoryFilter}
          onCategoryChange={setCategoryFilter}
          categoryOptions={categoryOptions}
          groupMode={groupMode}
          onGroupModeChange={setGroupMode}
          sortValue={sortValue}
          onSortValueChange={setSortValue}
          onReset={handleResetFilters}
        />
      ) : null}

      {isMobile ? (
        <Tabs
          value={activeTab}
          onValueChange={(value) =>
            setActiveTab(value === "routines" ? "routines" : "tasks")
          }
          className="space-y-4"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="routines">Routines</TabsTrigger>
          </TabsList>
          <TabsContent value="tasks">
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Tasks</h2>
                <p className="text-xs text-muted-foreground">
                  {summaryTextTasks}
                </p>
              </div>
              <ItemsView
                isMobile={isMobile}
                variant="task"
                currentTime={timeMarker}
                summaryText={summaryTextTasks}
                prioritizedItems={taskView.prioritized}
                displayGroups={taskView.groupedItems}
                categoryMap={categoryMap}
                categoryOptions={categoryOptions}
                derivedStatuses={derivedStatuses}
                updateItemDetails={updateItemDetails}
                toggleItemCompletion={toggleItemCompletion}
                deleteItem={deleteItem}
                emptyStateContent={emptyStateContent}
                tableSortState={taskView.tableSortState}
                onTableSortChange={handleTableSortChange}
              />
            </section>
          </TabsContent>
          <TabsContent value="routines">
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Routines</h2>
                <p className="text-xs text-muted-foreground">
                  {summaryTextRoutines}
                </p>
              </div>
              <ItemsView
                isMobile={isMobile}
                variant="routine"
                currentTime={timeMarker}
                summaryText={summaryTextRoutines}
                prioritizedItems={routineView.prioritized}
                displayGroups={routineView.groupedItems}
                categoryMap={categoryMap}
                categoryOptions={categoryOptions}
                derivedStatuses={derivedStatuses}
                updateItemDetails={updateItemDetails}
                toggleItemCompletion={toggleItemCompletion}
                deleteItem={deleteItem}
                emptyStateContent={emptyStateContent}
                tableSortState={routineView.tableSortState}
                onTableSortChange={handleTableSortChange}
              />
            </section>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Tasks</h2>
              <p className="text-xs text-muted-foreground">
                {summaryTextTasks}
              </p>
            </div>
            <ItemsView
              isMobile={isMobile}
              variant="task"
              currentTime={timeMarker}
              summaryText={summaryTextTasks}
              prioritizedItems={taskView.prioritized}
              displayGroups={taskView.groupedItems}
              categoryMap={categoryMap}
              categoryOptions={categoryOptions}
              derivedStatuses={derivedStatuses}
              updateItemDetails={updateItemDetails}
              toggleItemCompletion={toggleItemCompletion}
              deleteItem={deleteItem}
              emptyStateContent={emptyStateContent}
              tableSortState={taskView.tableSortState}
              onTableSortChange={handleTableSortChange}
            />
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Routines</h2>
              <p className="text-xs text-muted-foreground">
                {summaryTextRoutines}
              </p>
            </div>
            <ItemsView
              isMobile={isMobile}
              variant="routine"
              currentTime={timeMarker}
              summaryText={summaryTextRoutines}
              prioritizedItems={routineView.prioritized}
              displayGroups={routineView.groupedItems}
              categoryMap={categoryMap}
              categoryOptions={categoryOptions}
              derivedStatuses={derivedStatuses}
              updateItemDetails={updateItemDetails}
              toggleItemCompletion={toggleItemCompletion}
              deleteItem={deleteItem}
              emptyStateContent={emptyStateContent}
              tableSortState={routineView.tableSortState}
              onTableSortChange={handleTableSortChange}
            />
          </section>
        </div>
      )}
    </div>
  );
}
