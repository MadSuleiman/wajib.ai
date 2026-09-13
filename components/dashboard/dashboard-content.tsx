"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { addMinutes } from "date-fns";
import {
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Filter,
  Plus,
  Repeat2,
} from "lucide-react";

import { useSupabase } from "@/components/dashboard/supabase-provider";
import { useCreationDialogs } from "@/components/dashboard/creation-dialogs-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDashboardView } from "@/hooks/use-dashboard-view";
import { useDailyHighlightPreference } from "@/hooks/use-daily-highlight-preference";
import { Button } from "@/components/ui/button";
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
import { buildGoogleCalendarUrl } from "@/lib/calendar";
import { getLocalTimeZone } from "@/lib/timezone";

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
import { ItemsView } from "./items-view";
import { itemAnchorId } from "./item-anchor";
import { CreateItemDialog } from "./create-item-dialog";
import { DailyHighlightCard } from "./daily-highlight-card";
import { FiltersCard } from "./filters-card";
import { InsightsGrid } from "./insights-grid";
import { ScheduleBlockDialog } from "./schedule-block-dialog";

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

const formatTaskTypeLabel = (value: string) => {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
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

type DashboardContentProps = {
  focusKind?: "tasks" | "routines";
  isPopout?: boolean;
};

export function DashboardContent({
  focusKind,
  isPopout = false,
}: DashboardContentProps) {
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
  const { section: activeTab, setSection: setActiveTab } = useDashboardView();
  const [scheduleItem, setScheduleItem] = useState<ListItem | null>(null);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const { isEnabled: isDailyHighlightEnabled } = useDailyHighlightPreference();
  const allowPopout = !isPopout;
  const timeZone = useMemo(() => getLocalTimeZone(), []);

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
    (input: ListItem[], kind: "tasks" | "routines") => {
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
      const grouped =
        kind === "routines" && groupMode === "month"
          ? Array.from(
              prioritized
                .reduce((map, item) => {
                  const key = item.category;
                  const label =
                    categoryMap.get(key)?.label ?? formatTaskTypeLabel(key);
                  if (!map.has(key)) {
                    map.set(key, { label, items: [] as ListItem[] });
                  }
                  map.get(key)!.items.push(item);
                  return map;
                }, new Map<string, ItemGroup>())
                .values(),
            ).sort((a, b) =>
              a.label.localeCompare(b.label, undefined, {
                sensitivity: "base",
              }),
            )
          : groupItems(prioritized, groupMode).map((group) => ({
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
                  label:
                    daily.length && kind === "routines"
                      ? "Other routines"
                      : daily.length
                        ? "Other tasks"
                        : "",
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
    [
      categoryFilter,
      categoryMap,
      derivedStatuses,
      groupMode,
      sortValue,
      statusFilter,
    ],
  );

  const taskView = useMemo(
    () => filterAndSortItems(tasks, "tasks"),
    [filterAndSortItems, tasks],
  );
  const routineView = useMemo(
    () => filterAndSortItems(routines, "routines"),
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

  const emptyStateContent = useMemo(
    () => (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
        <Filter className="h-5 w-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{emptyStateMessage}</p>
      </div>
    ),
    [emptyStateMessage],
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

  const handleOpenSchedule = useCallback((item: ListItem) => {
    setScheduleItem(item);
    setIsScheduleOpen(true);
  }, []);

  const handleScheduleOpenChange = useCallback((open: boolean) => {
    setIsScheduleOpen(open);
    if (!open) {
      setScheduleItem(null);
    }
  }, []);

  const handleScheduleBlock = useCallback(
    (item: ListItem, startTime: Date) => {
      if (typeof window === "undefined") return;
      const endTime = addMinutes(startTime, 30);
      const url = buildGoogleCalendarUrl({
        title: item.title,
        start: startTime,
        end: endTime,
        timeZone,
      });
      window.open(url, "_blank", "noopener,noreferrer");
    },
    [timeZone],
  );

  const handleOpenPopout = useCallback((kind: "tasks" | "routines") => {
    if (typeof window === "undefined") return;
    const popoutUrl = new URL(`/popout/${kind}`, window.location.origin);
    const features =
      "popup=yes,width=460,height=720,top=80,left=80,noopener,noreferrer";
    const popout = window.open(
      popoutUrl.toString(),
      `wajib-${kind}-popout`,
      features,
    );
    popout?.focus();
  }, []);

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

  const createTaskLauncher = (
    <CreateItemDialog
      open={isCreateTaskOpen}
      onOpenChange={setIsCreateTaskOpen}
      variant="task"
      onAddItem={handleAddTask}
      onBulkAddItem={handleBulkAddTask}
      isSubmitting={isLoading}
      categoryOptions={categoryOptions}
      defaultCategory={fallbackCategory}
    />
  );

  const createRoutineLauncher = (
    <CreateItemDialog
      open={isCreateRoutineOpen}
      onOpenChange={setIsCreateRoutineOpen}
      variant="routine"
      onAddItem={handleAddRoutine}
      onBulkAddItem={handleBulkAddRoutine}
      isSubmitting={isLoading}
      categoryOptions={categoryOptions}
      defaultCategory={fallbackCategory}
    />
  );

  const renderListSection = (kind: "tasks" | "routines") => {
    const isTask = kind === "tasks";
    const title = isTask ? "Tasks" : "Routines";
    const summaryText = isTask ? summaryTextTasks : summaryTextRoutines;
    const view = isTask ? taskView : routineView;
    const variant = isTask ? "task" : "routine";

    return (
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{title}</h2>
            {allowPopout ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => handleOpenPopout(kind)}
                className="text-muted-foreground hover:text-foreground"
                aria-label={`Pop out ${title.toLowerCase()}`}
              >
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
          <p className="hidden text-xs text-muted-foreground md:block">
            {summaryText}
          </p>
        </div>
        <ItemsView
          isMobile={isMobile}
          variant={variant}
          currentTime={variant === "routine" ? timeMarker : 0}
          summaryText={summaryText}
          prioritizedItems={view.prioritized}
          displayGroups={view.groupedItems}
          categoryMap={categoryMap}
          categoryOptions={categoryOptions}
          derivedStatuses={derivedStatuses}
          updateItemDetails={updateItemDetails}
          toggleItemCompletion={toggleItemCompletion}
          deleteItem={deleteItem}
          onScheduleItem={handleOpenSchedule}
          emptyStateContent={emptyStateContent}
          tableSortState={view.tableSortState}
          onTableSortChange={handleTableSortChange}
        />
      </section>
    );
  };

  const focusedSection = focusKind ? renderListSection(focusKind) : null;
  const insights = (
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
  );

  return (
    <div className={`space-y-6${isMobile && !isPopout ? " pb-36" : ""}`}>
      {createRoutineLauncher}
      {createTaskLauncher}
      <ScheduleBlockDialog
        isOpen={isScheduleOpen}
        onOpenChange={handleScheduleOpenChange}
        item={scheduleItem}
        onSchedule={handleScheduleBlock}
      />

      {!isPopout ? (
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-semibold leading-tight text-primary md:text-5xl">
              {isMobile && activeTab === "routines"
                ? "Routines"
                : isMobile && activeTab === "insights"
                  ? "Your progress"
                  : "Today"}
            </h1>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="hidden md:inline-flex"
              aria-pressed={showInsights}
              onClick={() => setShowInsights((prev) => !prev)}
            >
              <BarChart3 aria-hidden="true" />
              {showInsights ? "Hide task insights" : "Show task insights"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              aria-expanded={showFilters}
              onClick={() => setShowFilters((prev) => !prev)}
            >
              <Filter aria-hidden="true" />
              {showFilters ? "Hide filters" : "Filters"}
            </Button>
          </div>
        </div>
      ) : null}

      {!isPopout &&
      isDailyHighlightEnabled &&
      (!isMobile || activeTab !== "insights") ? (
        <DailyHighlightCard
          focusKind={
            isMobile
              ? activeTab === "routines"
                ? "routine"
                : "task"
              : undefined
          }
          task={dailyTask}
          routine={dailyRoutine}
          derivedStatuses={derivedStatuses}
          categoryMap={categoryMap}
          onOpenItem={handleOpenItem}
          onToggleComplete={(item) => void toggleItemCompletion(item)}
          onScheduleItem={handleOpenSchedule}
        />
      ) : null}

      {!isPopout && !isMobile && showInsights ? insights : null}
      {!isPopout && showFilters ? (
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

      {focusKind ? (
        focusedSection
      ) : isMobile ? (
        <Tabs
          value={activeTab}
          onValueChange={(value) =>
            setActiveTab(
              value === "routines" || value === "insights" ? value : "tasks",
            )
          }
          className="gap-0"
        >
          <div className="mobile-dashboard-dock">
            <div className="mx-auto flex max-w-lg gap-2">
              <Button
                className="h-11 flex-1 rounded-xl"
                aria-label={
                  activeTab === "routines" ? "Create routine" : "Create task"
                }
                onClick={() =>
                  activeTab === "routines"
                    ? setIsCreateRoutineOpen(true)
                    : setIsCreateTaskOpen(true)
                }
              >
                <Plus aria-hidden="true" />
                {activeTab === "routines" ? "Add routine" : "Add task"}
              </Button>
              <Button
                variant="outline"
                className="size-11 rounded-xl"
                aria-label={
                  activeTab === "routines" ? "Create task" : "Create routine"
                }
                onClick={() =>
                  activeTab === "routines"
                    ? setIsCreateTaskOpen(true)
                    : setIsCreateRoutineOpen(true)
                }
              >
                {activeTab === "routines" ? (
                  <Plus aria-hidden="true" />
                ) : (
                  <Repeat2 aria-hidden="true" />
                )}
              </Button>
            </div>
            <TabsList
              className="mx-auto mt-2 grid h-14 w-full max-w-lg grid-cols-3 border-0 bg-transparent p-0 shadow-none backdrop-blur-none"
              aria-label="Dashboard sections"
            >
              <TabsTrigger
                value="tasks"
                className="h-12 flex-col gap-1 rounded-lg border-0 py-2 text-xs shadow-none data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none dark:data-[state=active]:bg-transparent"
              >
                <CheckCircle2 className="size-5" aria-hidden="true" /> Tasks
              </TabsTrigger>
              <TabsTrigger
                value="routines"
                className="h-12 flex-col gap-1 rounded-lg border-0 py-2 text-xs shadow-none data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none dark:data-[state=active]:bg-transparent"
              >
                <Repeat2 className="size-5" aria-hidden="true" /> Routines
              </TabsTrigger>
              <TabsTrigger
                value="insights"
                className="h-12 flex-col gap-1 rounded-lg border-0 py-2 text-xs shadow-none data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none dark:data-[state=active]:bg-transparent"
              >
                <BarChart3 className="size-5" aria-hidden="true" /> Insights
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="tasks">{renderListSection("tasks")}</TabsContent>
          <TabsContent value="routines">
            {renderListSection("routines")}
          </TabsContent>
          <TabsContent value="insights">{insights}</TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-8">
          {renderListSection("tasks")}
          {renderListSection("routines")}
        </div>
      )}
    </div>
  );
}
