"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { addDays, addMonths, addWeeks, addYears } from "date-fns";
import { toast } from "sonner";

import { createClientSupabaseClient } from "@/lib/supabase-client";
import { sortItemsByPriority } from "@/components/list-utils";
import { getLocalDayBoundaries, toLocalMidnight } from "@/lib/timezone";
import type { Category, ListItem, RecurrenceType, TaskPriority } from "@/types";

type RecurrenceLogCompletion = { completed_at: string };
type RecurrenceLogWithItem = { list_item_id: string; completed_at: string };

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

interface AddItemInput {
  title: string;
  priority: TaskPriority;
  hours?: string;
  category?: string;
  recurrenceType?: RecurrenceType;
  recurrenceInterval?: number;
}

interface ListStore {
  items: ListItem[];
  isLoading: boolean;
  addItem: (input: AddItemInput) => Promise<boolean>;
  toggleItemCompletion: (item: ListItem) => Promise<boolean>;
  updateItemPriority: (
    itemId: string,
    priority: TaskPriority,
  ) => Promise<boolean>;
  updateItemHours: (itemId: string, hours: string) => Promise<boolean>;
  updateItemCategory: (itemId: string, category: string) => Promise<boolean>;
  updateItemRecurrence: (
    itemId: string,
    recurrence: { type: RecurrenceType; interval: number },
  ) => Promise<boolean>;
  deleteItem: (itemId: string) => Promise<boolean>;
}

interface SupabaseContextValue {
  items: ListStore;
  categories: Category[];
}

const SupabaseContext = createContext<SupabaseContextValue | null>(null);

interface SupabaseProviderProps {
  initialItems: ListItem[];
  initialCategories: Category[];
  children: ReactNode;
}

export function SupabaseProvider({
  initialItems,
  initialCategories,
  children,
}: SupabaseProviderProps) {
  const supabase = useMemo(() => createClientSupabaseClient(), []);
  const [items, setItems] = useState<ListItem[]>(() =>
    sortItemsByPriority(initialItems),
  );
  const [categories] = useState<Category[]>(initialCategories);
  const [isLoading, setIsLoading] = useState(false);

  const refreshItem = useCallback((nextItem: ListItem) => {
    setItems((current) =>
      sortItemsByPriority(
        current.some((item) => item.id === nextItem.id)
          ? current.map((item) => (item.id === nextItem.id ? nextItem : item))
          : [...current, nextItem],
      ),
    );
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setItems((current) => current.filter((item) => item.id !== itemId));
  }, []);

  const calculateNextOccurrence = useCallback(
    (
      recurrenceType: RecurrenceType,
      recurrenceInterval: number,
      fromDate: Date = new Date(),
    ): Date | null => {
      if (recurrenceType === "none") {
        return null;
      }

      const normalizedInterval = Math.max(1, recurrenceInterval);
      const baseDate = toLocalMidnight(fromDate);

      switch (recurrenceType) {
        case "daily":
          return addDays(baseDate, normalizedInterval);
        case "weekly":
          return addWeeks(baseDate, normalizedInterval);
        case "monthly":
          return addMonths(baseDate, normalizedInterval);
        case "yearly":
          return addYears(baseDate, normalizedInterval);
        default:
          return null;
      }
    },
    [],
  );

  const addItem: ListStore["addItem"] = useCallback(
    async ({
      title,
      priority,
      hours,
      category,
      recurrenceType = "none",
      recurrenceInterval = 1,
    }) => {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) return false;

      setIsLoading(true);
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user) {
          toast.error("You must be signed in to add items.");
          return false;
        }

        const parsedHours =
          hours && hours.trim() !== "" ? Number.parseFloat(hours) : null;
        const estimatedHours =
          parsedHours === null || Number.isNaN(parsedHours)
            ? null
            : parsedHours;
        const normalizedCategory = (category || "task").trim() || "task";
        const normalizedRecurrenceType: RecurrenceType =
          recurrenceType ?? "none";
        const normalizedRecurrenceInterval =
          recurrenceInterval && recurrenceInterval > 0
            ? Math.floor(recurrenceInterval)
            : 1;
        const nextOccurrence =
          normalizedRecurrenceType === "none"
            ? null
            : toLocalMidnight(new Date());
        const { data, error } = await supabase
          .from("list_items")
          .insert([
            {
              title: trimmedTitle,
              completed: false,
              priority,
              estimated_hours: estimatedHours,
              category: normalizedCategory,
              user_id: user.id,
              recurrence_type: normalizedRecurrenceType,
              recurrence_interval: normalizedRecurrenceInterval,
              recurrence_next_occurrence: nextOccurrence
                ? nextOccurrence.toISOString()
                : null,
            },
          ] as never)
          .select()
          .single();

        if (error) throw error;

        if (data) {
          refreshItem(data as ListItem);
        }

        toast.success("Item added", {
          description: "Your item has been added successfully.",
        });
        return true;
      } catch (error: unknown) {
        toast.error("Failed to add item", {
          description:
            getErrorMessage(error) || "Something went wrong. Please try again.",
        });
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [supabase, refreshItem],
  );

  const toggleItemCompletion: ListStore["toggleItemCompletion"] = useCallback(
    async (item) => {
      if (item.recurrence_type && item.recurrence_type !== "none") {
        try {
          const now = new Date();
          const { start: todayStart, end: todayEnd } =
            getLocalDayBoundaries(now);

          const { data: existingLogsRaw, error: existingLogError } = await supabase
            .from("recurrence_logs")
            .select("completed_at")
            .eq("list_item_id", item.id)
            .gte("completed_at", todayStart.toISOString())
            .lt("completed_at", todayEnd.toISOString())
            .order("completed_at", { ascending: false })
            .limit(1);

          if (existingLogError) throw existingLogError;

          const existingLogs = existingLogsRaw as RecurrenceLogCompletion[] | null;
          let completedAtIso = existingLogs?.[0]?.completed_at ?? null;

          if (!completedAtIso) {
            const { data: newLogRaw, error: logError } = await supabase
              .from("recurrence_logs")
              .insert([
                {
                  list_item_id: item.id,
                  user_id: item.user_id,
                  completed_at: now.toISOString(),
                },
              ] as never)
              .select("completed_at")
              .single();

            if (logError) throw logError;
            const newLog = newLogRaw as RecurrenceLogCompletion | null;
            if (!newLog) {
              throw new Error("Failed to create recurrence log entry");
            }
            completedAtIso = newLog.completed_at;
          }

          const completionDate = new Date(completedAtIso);
          const nextOccurrence = calculateNextOccurrence(
            item.recurrence_type,
            item.recurrence_interval || 1,
            completionDate,
          );

          const { data, error } = await supabase
            .from("list_items")
            .update({
              completed: false,
              recurrence_last_completed: completedAtIso,
              recurrence_next_occurrence: nextOccurrence
                ? nextOccurrence.toISOString()
                : null,
            } as never)
            .eq("id", item.id)
            .select()
            .single();

          if (error) throw error;

          if (data) {
            refreshItem(data as ListItem);
          }

          toast.success("Recurring task logged", {
            description: "Next occurrence scheduled automatically.",
          });
          return true;
        } catch (error: unknown) {
          toast.error("Failed to log recurring task", {
            description:
              getErrorMessage(error) ||
              "Something went wrong. Please try again.",
          });
          return false;
        }
      }

      try {
        const { data, error } = await supabase
          .from("list_items")
          .update({ completed: !item.completed } as never)
          .eq("id", item.id)
          .select()
          .single();

        if (error) throw error;
        if (data) {
          refreshItem(data as ListItem);
        }
        return true;
      } catch (error: unknown) {
        toast.error("Failed to update item", {
          description:
            getErrorMessage(error) || "Something went wrong. Please try again.",
        });
        return false;
      }
    },
    [calculateNextOccurrence, refreshItem, supabase],
  );

  const updateItemPriority: ListStore["updateItemPriority"] = useCallback(
    async (itemId, priority) => {
      try {
        const { data, error } = await supabase
          .from("list_items")
          .update({ priority } as never)
          .eq("id", itemId)
          .select()
          .single();

        if (error) throw error;
        if (data) {
          refreshItem(data as ListItem);
        }
        toast.success("Priority updated");
        return true;
      } catch (error: unknown) {
        toast.error("Failed to update priority", {
          description:
            getErrorMessage(error) || "Something went wrong. Please try again.",
        });
        return false;
      }
    },
    [supabase, refreshItem],
  );

  const updateItemHours: ListStore["updateItemHours"] = useCallback(
    async (itemId, hours) => {
      try {
        const parsedHours =
          hours.trim() === "" ? null : Number.parseFloat(hours);
        if (parsedHours !== null && Number.isNaN(parsedHours)) {
          toast.error("Invalid hours value");
          return false;
        }

        const { data, error } = await supabase
          .from("list_items")
          .update({ estimated_hours: parsedHours } as never)
          .eq("id", itemId)
          .select()
          .single();

        if (error) throw error;
        if (data) {
          refreshItem(data as ListItem);
        }
        toast.success("Hours updated");
        return true;
      } catch (error: unknown) {
        toast.error("Failed to update hours", {
          description:
            getErrorMessage(error) || "Something went wrong. Please try again.",
        });
        return false;
      }
    },
    [supabase, refreshItem],
  );

  const updateItemCategory: ListStore["updateItemCategory"] = useCallback(
    async (itemId, category) => {
      try {
        const normalizedCategory = category.trim() || "task";
        const { data, error } = await supabase
          .from("list_items")
          .update({ category: normalizedCategory } as never)
          .eq("id", itemId)
          .select()
          .single();

        if (error) throw error;
        if (data) {
          refreshItem(data as ListItem);
        }
        toast.success("Category updated");
        return true;
      } catch (error: unknown) {
        toast.error("Failed to update category", {
          description:
            getErrorMessage(error) || "Something went wrong. Please try again.",
        });
        return false;
      }
    },
    [supabase, refreshItem],
  );

  const updateItemRecurrence: ListStore["updateItemRecurrence"] = useCallback(
    async (itemId, { type, interval }) => {
      try {
        const existingItem = items.find((current) => current.id === itemId);
        const normalizedType: RecurrenceType = type ?? "none";
        const normalizedInterval =
          interval && interval > 0 ? Math.floor(interval) : 1;
        const referenceDate = existingItem?.recurrence_last_completed
          ? new Date(existingItem.recurrence_last_completed)
          : null;
        const nextOccurrence =
          normalizedType === "none"
            ? null
            : referenceDate
                ? calculateNextOccurrence(
                    normalizedType,
                    normalizedInterval,
                    referenceDate,
                  )
                : toLocalMidnight(new Date());

        const updates: Record<string, unknown> = {
          recurrence_type: normalizedType,
          recurrence_interval: normalizedInterval,
          recurrence_next_occurrence: nextOccurrence
            ? nextOccurrence.toISOString()
            : null,
        };

        if (normalizedType === "none") {
          updates.recurrence_last_completed = null;
          updates.recurrence_next_occurrence = null;
        } else {
          updates.completed = false;
        }

        const { data, error } = await supabase
          .from("list_items")
          .update(updates as never)
          .eq("id", itemId)
          .select()
          .single();

        if (error) throw error;
        if (data) {
          refreshItem(data as ListItem);
        }
        toast.success("Recurrence updated");
        return true;
      } catch (error: unknown) {
        toast.error("Failed to update recurrence", {
          description:
            getErrorMessage(error) || "Something went wrong. Please try again.",
        });
        return false;
      }
    },
    [calculateNextOccurrence, items, refreshItem, supabase],
  );

  const deleteItem: ListStore["deleteItem"] = useCallback(
    async (itemId) => {
      try {
        const { error } = await supabase
          .from("list_items")
          .delete()
          .eq("id", itemId);

        if (error) throw error;

        removeItem(itemId);
        toast.success("Item deleted", {
          description: "The item has been deleted successfully.",
        });
        return true;
      } catch (error: unknown) {
        toast.error("Failed to delete item", {
          description:
            getErrorMessage(error) || "Something went wrong. Please try again.",
        });
        return false;
      }
    },
    [supabase, removeItem],
  );

  useEffect(() => {
    const recurringItems = items.filter(
      (item) => item.recurrence_type && item.recurrence_type !== "none",
    );
    if (!recurringItems.length) {
      return;
    }

    const misalignedItems = recurringItems.filter((item) => {
      if (!item.recurrence_next_occurrence) {
        return true;
      }
      const nextDate = new Date(item.recurrence_next_occurrence);
      return (
        nextDate.getHours() !== 0 ||
        nextDate.getMinutes() !== 0 ||
        nextDate.getSeconds() !== 0 ||
        nextDate.getMilliseconds() !== 0
      );
    });

    if (!misalignedItems.length) {
      return;
    }

    let isCancelled = false;
    const normalizeSchedules = async () => {
      const idsNeedingAlignment = misalignedItems.map((item) => item.id);

      const { data: logsRaw, error: logsError } = await supabase
        .from("recurrence_logs")
        .select("list_item_id, completed_at")
        .in("list_item_id", idsNeedingAlignment)
        .order("completed_at", { ascending: false });

      if (logsError) {
        console.error("Failed to normalize recurrence logs", logsError);
        return;
      }

      const logs = (logsRaw ?? []) as RecurrenceLogWithItem[];

      const latestLogMap = new Map<string, string>();
      for (const log of logs) {
        if (!latestLogMap.has(log.list_item_id)) {
          latestLogMap.set(log.list_item_id, log.completed_at);
        }
      }

      for (const item of misalignedItems) {
        if (isCancelled) break;
        const logCompletedAt = latestLogMap.get(item.id) ?? null;
        const referenceIso = logCompletedAt ?? item.recurrence_last_completed;
        const referenceDate = referenceIso ? new Date(referenceIso) : null;

        const nextOccurrence =
          referenceDate && item.recurrence_type !== "none"
            ? calculateNextOccurrence(
                item.recurrence_type,
                item.recurrence_interval || 1,
                referenceDate,
              )
            : toLocalMidnight(new Date());

        const expectedNextIso = nextOccurrence
          ? nextOccurrence.toISOString()
          : null;

        if (
          expectedNextIso === (item.recurrence_next_occurrence ?? null) &&
          (referenceIso ?? null) === (item.recurrence_last_completed ?? null)
        ) {
          continue;
        }

        const { data, error } = await supabase
          .from("list_items")
          .update({
            recurrence_last_completed: referenceIso ?? null,
            recurrence_next_occurrence: expectedNextIso,
          } as never)
          .eq("id", item.id)
          .select()
          .single();

        if (error) {
          console.error("Failed to normalize recurrence item", item.id, error);
          continue;
        }

        if (data) {
          refreshItem(data as ListItem);
        }
      }
    };

    void normalizeSchedules();

    return () => {
      isCancelled = true;
    };
  }, [calculateNextOccurrence, items, refreshItem, supabase]);

  const value = useMemo(
    () => ({
      items: {
        items,
        isLoading,
        addItem,
        toggleItemCompletion,
        updateItemPriority,
        updateItemHours,
        updateItemCategory,
        updateItemRecurrence,
        deleteItem,
      },
      categories,
    }),
    [
      items,
      isLoading,
      addItem,
      toggleItemCompletion,
      updateItemPriority,
      updateItemHours,
      updateItemCategory,
      updateItemRecurrence,
      deleteItem,
      categories,
    ],
  );

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error("useSupabase must be used within a SupabaseProvider");
  }
  return context;
}
