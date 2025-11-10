"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Filter } from "lucide-react";

import { useSupabase } from "@/components/supabase-provider";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  groupItems,
  sortItems,
  sortConfigFromValue,
  type ItemGroupMode,
  type SortOptionValue,
} from "@/components/list-utils";
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

const getTimeValue = (value?: string | null): number | null => {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const getDerivedStatus = (item: ListItem, now: number): DerivedStatus => {
  if (!item.recurrence_type || item.recurrence_type === "none") {
    return item.completed ? "completed" : "active";
  }

  const nextOccurrence = getTimeValue(item.recurrence_next_occurrence);
  if (!nextOccurrence) return "active";

  return nextOccurrence <= now ? "active" : "completed";
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

  const [groupMode, setGroupMode] = useState<ItemGroupMode>("month");
  const [sortValue, setSortValue] = useState<SortOptionValue>(defaultSortValue);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [timeMarker, setTimeMarker] = useState(() => Date.now());

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

  const derivedStatuses = useMemo(
    () =>
      items.reduce((map, item) => {
        map.set(item.id, getDerivedStatus(item, timeMarker));
        return map;
      }, new Map<string, DerivedStatus>()),
    [items, timeMarker],
  );

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const derivedStatus = derivedStatuses.get(item.id) ?? "active";
      const matchesStatus =
        statusFilter === "all" ? true : statusFilter === derivedStatus;

      const matchesCategory =
        categoryFilter === "all" ? true : item.category === categoryFilter;

      return matchesStatus && matchesCategory;
    });
  }, [categoryFilter, derivedStatuses, items, statusFilter]);

  const sortConfig = useMemo(() => sortConfigFromValue(sortValue), [sortValue]);

  const tableSortState = useMemo(() => {
    const columnId = columnIdBySortKey[sortConfig.key];
    if (!columnId) return undefined;
    return { columnId, direction: sortConfig.direction };
  }, [sortConfig]);

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

  const displayGroups = useMemo<ItemGroup[]>(() => {
    if (groupMode === "none") {
      const groups: ItemGroup[] = [];
      if (dailyRecurringItems.length) {
        groups.push({ label: "Daily recurring", items: dailyRecurringItems });
      }
      if (nonDailyItems.length) {
        groups.push({
          label: dailyRecurringItems.length ? "Other tasks" : "",
          items: nonDailyItems,
        });
      }
      return groups.length ? groups : [{ label: "", items: prioritizedItems }];
    }

    return groupedItems.map((group) => ({
      label: group.label,
      items: group.items,
    }));
  }, [
    dailyRecurringItems,
    groupMode,
    groupedItems,
    nonDailyItems,
    prioritizedItems,
  ]);

  const { activeCount, completedCount } = useMemo(() => {
    let completed = 0;
    derivedStatuses.forEach((status) => {
      if (status === "completed") {
        completed += 1;
      }
    });
    return {
      completedCount: completed,
      activeCount: items.length - completed,
    };
  }, [derivedStatuses, items.length]);

  const recurringCount = useMemo(
    () => items.filter((item) => item.recurrence_type !== "none").length,
    [items],
  );

  const summaryText = `Showing ${prioritizedItems.length} of ${
    items.length
  } items (${activeCount} active, ${completedCount} completed)`;

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

  const fallbackCategory = categories[0]?.slug ?? "task";

  return (
    <div className="space-y-6">
      <NewItemCard
        onAddItem={addItem}
        isSubmitting={isLoading}
        categoryOptions={categoryOptions}
        defaultCategory={fallbackCategory}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <InsightsGrid
          categoryChartData={categoryChartData}
          recurringBreakdownData={recurringBreakdownData}
          summaryText={summaryText}
          activeCount={activeCount}
          completedCount={completedCount}
          categoryCount={categoryOptions.length}
          recurringCount={recurringCount}
        />
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
      </div>

      <ItemsView
        isMobile={isMobile}
        summaryText={summaryText}
        prioritizedItems={prioritizedItems}
        displayGroups={displayGroups}
        categoryMap={categoryMap}
        categoryOptions={categoryOptions}
        derivedStatuses={derivedStatuses}
        updateItemCategory={updateItemCategory}
        updateItemRecurrence={updateItemRecurrence}
        updateItemPriority={updateItemPriority}
        updateItemHours={updateItemHours}
        toggleItemCompletion={toggleItemCompletion}
        deleteItem={deleteItem}
        emptyStateContent={emptyStateContent}
        tableSortState={tableSortState}
        onTableSortChange={handleTableSortChange}
      />
    </div>
  );
}
