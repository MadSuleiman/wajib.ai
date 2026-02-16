"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { format } from "date-fns";
import { toast } from "sonner";

import { createClientSupabaseClient } from "@/lib/supabase-client";
import { sortItemsByPriority } from "@/components/dashboard/list-utils";
import type {
  Category,
  ItemKind,
  ListItem,
  RecurrenceType,
  TaskPriority,
  TaskUrgency,
} from "@/types";
import { routineRowToListItem, taskRowToListItem } from "@/types/supabase";

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

const getLocalDayKey = (date: Date) => format(date, "yyyy-MM-dd");

interface AddItemInput {
  title: string;
  priority: TaskPriority;
  urgency: TaskUrgency;
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
  updateItemDetails: (
    itemId: string,
    updates: {
      title?: string;
      priority?: TaskPriority;
      urgency?: TaskUrgency;
      hours?: string | null;
      category?: string;
      recurrence?: { type: RecurrenceType; interval: number };
    },
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
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<ListItem[]>(() =>
    sortItemsByPriority(initialItems),
  );
  const [categories] = useState<Category[]>(initialCategories);
  const [isLoading, setIsLoading] = useState(false);
  const [routineCompletionDay, setRoutineCompletionDay] = useState(() =>
    getLocalDayKey(new Date()),
  );
  const [completedRoutineIds, setCompletedRoutineIds] = useState<Set<string>>(
    () => new Set(),
  );
  const routineCompletionDayRef = useRef(routineCompletionDay);
  const completedRoutineIdsRef = useRef(completedRoutineIds);

  useEffect(() => {
    routineCompletionDayRef.current = routineCompletionDay;
  }, [routineCompletionDay]);

  useEffect(() => {
    completedRoutineIdsRef.current = completedRoutineIds;
  }, [completedRoutineIds]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const nextKey = getLocalDayKey(new Date());
      setRoutineCompletionDay((current) =>
        current === nextKey ? current : nextKey,
      );
    }, 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const applyRoutineCompletionSet = useCallback((nextSet: Set<string>) => {
    setCompletedRoutineIds(nextSet);
    setItems((current) =>
      sortItemsByPriority(
        current.map((item) =>
          item.item_kind === "routine"
            ? { ...item, completed: nextSet.has(item.id) }
            : item,
        ),
      ),
    );
  }, []);

  const refreshRoutineCompletionsForDay = useCallback(
    async (input: { userId: string; dayKey: string }) => {
      const { data, error } = await supabase
        .from("routine_logs")
        .select("routine_id, completed_day")
        .eq("user_id", input.userId)
        .eq("completed_day", input.dayKey);

      if (error) throw error;

      const nextSet = new Set<string>();
      (data ?? []).forEach((row) => {
        if (row?.routine_id) nextSet.add(String(row.routine_id));
      });
      applyRoutineCompletionSet(nextSet);
    },
    [applyRoutineCompletionSet, supabase],
  );

  const refreshItem = useCallback((nextItem: ListItem) => {
    const normalized =
      nextItem.item_kind === "routine"
        ? {
            ...nextItem,
            completed: completedRoutineIdsRef.current.has(nextItem.id),
          }
        : nextItem;
    setItems((current) =>
      sortItemsByPriority(
        current.some((item) => item.id === normalized.id)
          ? current.map((item) =>
              item.id === normalized.id ? normalized : item,
            )
          : [...current, normalized],
      ),
    );
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setItems((current) => current.filter((item) => item.id !== itemId));
  }, []);

  const addItem: ListStore["addItem"] = useCallback(
    async ({
      title,
      priority,
      urgency = "medium",
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
        const itemKind: ItemKind =
          normalizedRecurrenceType === "none" ? "task" : "routine";

        const { data, error } =
          normalizedRecurrenceType === "none"
            ? await supabase
                .from("tasks")
                .insert([
                  {
                    title: trimmedTitle,
                    completed: false,
                    value: priority,
                    urgency,
                    estimated_hours: estimatedHours,
                    category: normalizedCategory,
                    user_id: user.id,
                  },
                ] as never)
                .select()
                .single()
            : await supabase
                .from("routines")
                .insert([
                  {
                    title: trimmedTitle,
                    value: priority,
                    urgency,
                    estimated_hours: estimatedHours,
                    category: normalizedCategory,
                    user_id: user.id,
                    recurrence_type: normalizedRecurrenceType,
                    recurrence_interval: normalizedRecurrenceInterval,
                  },
                ] as never)
                .select()
                .single();

        if (error) throw error;

        if (data) {
          const item =
            itemKind === "task"
              ? taskRowToListItem(data as never)
              : routineRowToListItem(data as never);
          refreshItem(item);
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
      if (item.item_kind === "routine") {
        try {
          const dayKey = getLocalDayKey(new Date());
          if (dayKey !== routineCompletionDayRef.current) {
            setRoutineCompletionDay(dayKey);
          }

          if (item.completed) {
            const { error } = await supabase
              .from("routine_logs")
              .delete()
              .eq("routine_id", item.id)
              .eq("user_id", item.user_id)
              .eq("completed_day", dayKey);

            if (error) throw error;

            const nextSet = new Set(completedRoutineIdsRef.current);
            nextSet.delete(item.id);
            applyRoutineCompletionSet(nextSet);
            toast.success("Routine marked as active");
            return true;
          }

          const { error } = await supabase.from("routine_logs").upsert(
            [
              {
                routine_id: item.id,
                user_id: item.user_id,
                completed_day: dayKey,
                completed_at: new Date().toISOString(),
              },
            ] as never,
            { onConflict: "routine_id,user_id,completed_day" },
          );

          if (error) throw error;

          const nextSet = new Set(completedRoutineIdsRef.current);
          nextSet.add(item.id);
          applyRoutineCompletionSet(nextSet);

          toast.success("Routine completed", {
            description: "Tracked for today.",
          });
          return true;
        } catch (error: unknown) {
          toast.error("Failed to update routine", {
            description:
              getErrorMessage(error) ||
              "Something went wrong. Please try again.",
          });
          return false;
        }
      }

      try {
        const nextCompleted = !item.completed;
        const { data, error } = await supabase
          .from("tasks")
          .update({ completed: nextCompleted } as never)
          .eq("id", item.id)
          .select()
          .single();

        if (error) throw error;
        if (data) {
          refreshItem(taskRowToListItem(data as never));
        }
        toast.success(
          nextCompleted ? "Task completed" : "Task marked as active",
        );
        return true;
      } catch (error: unknown) {
        toast.error("Failed to update item", {
          description:
            getErrorMessage(error) || "Something went wrong. Please try again.",
        });
        return false;
      }
    },
    [applyRoutineCompletionSet, refreshItem, supabase],
  );

  const updateItemPriority: ListStore["updateItemPriority"] = useCallback(
    async (itemId, priority) => {
      try {
        const targetTable =
          items.find((it) => it.id === itemId)?.item_kind === "routine"
            ? "routines"
            : "tasks";

        const { data, error } = await supabase
          .from(targetTable)
          .update({ value: priority } as never)
          .eq("id", itemId)
          .select()
          .single();

        if (error) throw error;
        if (data) {
          const updated =
            targetTable === "tasks"
              ? taskRowToListItem(data as never)
              : routineRowToListItem(data as never);
          refreshItem(updated);
        }
        toast.success("Value updated");
        return true;
      } catch (error: unknown) {
        toast.error("Failed to update value", {
          description:
            getErrorMessage(error) || "Something went wrong. Please try again.",
        });
        return false;
      }
    },
    [items, supabase, refreshItem],
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

        const targetTable =
          items.find((it) => it.id === itemId)?.item_kind === "routine"
            ? "routines"
            : "tasks";

        const { data, error } = await supabase
          .from(targetTable)
          .update({ estimated_hours: parsedHours } as never)
          .eq("id", itemId)
          .select()
          .single();

        if (error) throw error;
        if (data) {
          const updated =
            targetTable === "tasks"
              ? taskRowToListItem(data as never)
              : routineRowToListItem(data as never);
          refreshItem(updated);
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
    [items, supabase, refreshItem],
  );

  const updateItemCategory: ListStore["updateItemCategory"] = useCallback(
    async (itemId, category) => {
      try {
        const normalizedCategory = category.trim() || "task";
        const targetTable =
          items.find((it) => it.id === itemId)?.item_kind === "routine"
            ? "routines"
            : "tasks";

        const { data, error } = await supabase
          .from(targetTable)
          .update({ category: normalizedCategory } as never)
          .eq("id", itemId)
          .select()
          .single();

        if (error) throw error;
        if (data) {
          const updated =
            targetTable === "tasks"
              ? taskRowToListItem(data as never)
              : routineRowToListItem(data as never);
          refreshItem(updated);
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
    [items, supabase, refreshItem],
  );

  const updateItemRecurrence: ListStore["updateItemRecurrence"] = useCallback(
    async (itemId, { type, interval }) => {
      try {
        const existingItem = items.find((current) => current.id === itemId);
        if (!existingItem) {
          toast.error("Item not found");
          return false;
        }

        if (existingItem.item_kind === "task" && type === "none") {
          // No-op: already a task with no recurrence
          toast.info("No changes to recurrence");
          return true;
        }

        if (existingItem.item_kind === "task" && type && type !== "none") {
          // Converting task -> routine: create routine, delete task
          const normalizedType: RecurrenceType = type;
          const normalizedInterval =
            interval && interval > 0 ? Math.floor(interval) : 1;

          const { data: created, error: createError } = await supabase
            .from("routines")
            .insert([
              {
                title: existingItem.title,
                value: existingItem.priority,
                urgency: existingItem.urgency,
                estimated_hours: existingItem.estimated_hours,
                category: existingItem.category,
                user_id: existingItem.user_id,
                recurrence_type: normalizedType,
                recurrence_interval: normalizedInterval,
              },
            ] as never)
            .select()
            .single();

          if (createError) throw createError;

          const { error: deleteError } = await supabase
            .from("tasks")
            .delete()
            .eq("id", existingItem.id);
          if (deleteError) throw deleteError;

          if (created) {
            removeItem(existingItem.id);
            refreshItem(routineRowToListItem(created as never));
          }

          toast.success("Converted to routine");
          return true;
        }

        if (existingItem.item_kind === "routine") {
          const normalizedType: RecurrenceType =
            type ?? existingItem.recurrence_type;
          const normalizedInterval =
            interval && interval > 0
              ? Math.floor(interval)
              : existingItem.recurrence_interval;

          if (normalizedType === "none") {
            // Convert routine -> task
            const { data: createdTask, error: taskError } = await supabase
              .from("tasks")
              .insert([
                {
                  title: existingItem.title,
                  completed: existingItem.completed,
                  value: existingItem.priority,
                  urgency: existingItem.urgency,
                  estimated_hours: existingItem.estimated_hours,
                  category: existingItem.category,
                  user_id: existingItem.user_id,
                },
              ] as never)
              .select()
              .single();

            if (taskError) throw taskError;

            const { error: deleteError } = await supabase
              .from("routines")
              .delete()
              .eq("id", existingItem.id);
            if (deleteError) throw deleteError;

            if (createdTask) {
              removeItem(existingItem.id);
              refreshItem(taskRowToListItem(createdTask as never));
            }

            toast.success("Converted to task");
            return true;
          }

          const updates: Record<string, unknown> = {
            recurrence_type: normalizedType,
            recurrence_interval: normalizedInterval,
          };

          const { data, error } = await supabase
            .from("routines")
            .update(updates as never)
            .eq("id", itemId)
            .select()
            .single();

          if (error) throw error;
          if (data) {
            refreshItem(routineRowToListItem(data as never));
          }
          toast.success("Recurrence updated");
          return true;
        }

        // Fallback: unexpected kind
        return false;
      } catch (error: unknown) {
        toast.error("Failed to update recurrence", {
          description:
            getErrorMessage(error) || "Something went wrong. Please try again.",
        });
        return false;
      }
    },
    [items, refreshItem, removeItem, supabase],
  );

  const updateItemDetails: ListStore["updateItemDetails"] = useCallback(
    async (itemId, updates) => {
      try {
        const existingItem = items.find((current) => current.id === itemId);
        if (!existingItem) {
          toast.error("Item not found");
          return false;
        }

        const payload: Record<string, unknown> = {};
        let hasChanges = false;

        if (typeof updates.title === "string") {
          const trimmedTitle = updates.title.trim();
          if (trimmedTitle && trimmedTitle !== existingItem.title) {
            payload.title = trimmedTitle;
            hasChanges = true;
          }
        }

        if (updates.category) {
          const normalizedCategory = updates.category.trim() || "task";
          if (normalizedCategory !== existingItem.category) {
            payload.category = normalizedCategory;
            hasChanges = true;
          }
        }

        if (updates.priority && updates.priority !== existingItem.priority) {
          payload.value = updates.priority;
          hasChanges = true;
        }

        if (updates.urgency && updates.urgency !== existingItem.urgency) {
          payload.urgency = updates.urgency;
          hasChanges = true;
        }

        if (typeof updates.hours !== "undefined") {
          const hoursValue =
            updates.hours?.trim() === "" ? null : updates.hours;
          const parsedHours =
            hoursValue === null || typeof hoursValue === "undefined"
              ? null
              : Number.parseFloat(hoursValue);
          if (parsedHours !== null && Number.isNaN(parsedHours)) {
            toast.error("Invalid hours value");
            return false;
          }
          if (parsedHours !== existingItem.estimated_hours) {
            payload.estimated_hours = parsedHours;
            hasChanges = true;
          }
        }

        if (updates.recurrence) {
          if (existingItem.item_kind === "task") {
            // Task can only get recurrence via updateItemRecurrence which will convert; here we treat as no-op.
            toast.error("Use recurrence update to convert tasks to routines");
            return false;
          }

          const normalizedType: RecurrenceType =
            updates.recurrence.type ?? existingItem.recurrence_type;
          const normalizedInterval =
            updates.recurrence.interval && updates.recurrence.interval > 0
              ? Math.floor(updates.recurrence.interval)
              : existingItem.recurrence_interval;

          payload.recurrence_type = normalizedType;
          payload.recurrence_interval = normalizedInterval;
          hasChanges = true;
        }

        if (!hasChanges) {
          toast.info("No changes to save");
          return true;
        }

        const targetTable =
          existingItem.item_kind === "routine" ? "routines" : "tasks";

        const { data, error } = await supabase
          .from(targetTable)
          .update(payload as never)
          .eq("id", itemId)
          .select()
          .single();

        if (error) throw error;
        if (data) {
          const updated =
            targetTable === "tasks"
              ? taskRowToListItem(data as never)
              : routineRowToListItem(data as never);
          refreshItem(updated);
        }

        toast.success("Task updated");
        return true;
      } catch (error: unknown) {
        toast.error("Failed to update task", {
          description:
            getErrorMessage(error) || "Something went wrong. Please try again.",
        });
        return false;
      }
    },
    [items, refreshItem, supabase],
  );

  const deleteItem: ListStore["deleteItem"] = useCallback(
    async (itemId) => {
      try {
        const existingItem = items.find((current) => current.id === itemId);
        const targetTable =
          existingItem?.item_kind === "routine" ? "routines" : "tasks";

        const { error } = await supabase
          .from(targetTable)
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
    [items, supabase, removeItem],
  );

  useEffect(() => {
    let isCancelled = false;
    let taskChannel: ReturnType<typeof supabase.channel> | null = null;
    let routineChannel: ReturnType<typeof supabase.channel> | null = null;
    let routineLogChannel: ReturnType<typeof supabase.channel> | null = null;

    const stopRealtime = () => {
      if (taskChannel) {
        supabase.removeChannel(taskChannel);
        taskChannel = null;
      }
      if (routineChannel) {
        supabase.removeChannel(routineChannel);
        routineChannel = null;
      }
      if (routineLogChannel) {
        supabase.removeChannel(routineLogChannel);
        routineLogChannel = null;
      }
    };

    const startRealtime = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("Unable to start realtime feed", userError);
        return;
      }

      setUserId(user.id);

      taskChannel = supabase
        .channel("tasks-realtime")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "tasks",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (isCancelled) return;
            if (payload.eventType === "DELETE" && payload.old?.id) {
              removeItem(String(payload.old.id));
              return;
            }
            if (payload.new) {
              refreshItem(taskRowToListItem(payload.new as never));
            }
          },
        )
        .subscribe();

      routineChannel = supabase
        .channel("routines-realtime")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "routines",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (isCancelled) return;
            if (payload.eventType === "DELETE" && payload.old?.id) {
              removeItem(String(payload.old.id));
              return;
            }
            if (payload.new) {
              refreshItem(routineRowToListItem(payload.new as never));
            }
          },
        )
        .subscribe();

      routineLogChannel = supabase
        .channel("routine-logs-realtime")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "routine_logs",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (isCancelled) return;
            const record = (
              payload.eventType === "DELETE" ? payload.old : payload.new
            ) as { routine_id?: string; completed_day?: string } | undefined;
            const routineId = record?.routine_id
              ? String(record.routine_id)
              : null;
            const completedDay = record?.completed_day
              ? String(record.completed_day)
              : null;

            if (!routineId || !completedDay) return;
            if (completedDay !== routineCompletionDayRef.current) return;

            if (payload.eventType === "DELETE") {
              setCompletedRoutineIds((current) => {
                const next = new Set(current);
                next.delete(routineId);
                return next;
              });
              setItems((current) =>
                current.map((item) =>
                  item.id === routineId && item.item_kind === "routine"
                    ? { ...item, completed: false }
                    : item,
                ),
              );
              return;
            }

            setCompletedRoutineIds((current) => {
              const next = new Set(current);
              next.add(routineId);
              return next;
            });
            setItems((current) =>
              current.map((item) =>
                item.id === routineId && item.item_kind === "routine"
                  ? { ...item, completed: true }
                  : item,
              ),
            );
          },
        )
        .subscribe();
    };

    const restartRealtimeWhenVisible = () => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState !== "visible"
      ) {
        return;
      }
      stopRealtime();
      void startRealtime();
    };

    void startRealtime();
    document.addEventListener("visibilitychange", restartRealtimeWhenVisible);

    return () => {
      isCancelled = true;
      document.removeEventListener(
        "visibilitychange",
        restartRealtimeWhenVisible,
      );
      stopRealtime();
    };
  }, [refreshItem, removeItem, supabase]);

  useEffect(() => {
    if (!userId) return;
    void refreshRoutineCompletionsForDay({
      userId,
      dayKey: routineCompletionDay,
    }).catch((error: unknown) => {
      console.error("Failed to refresh routine completions", error);
    });
  }, [refreshRoutineCompletionsForDay, routineCompletionDay, userId]);

  useEffect(() => {
    if (!userId) return;

    const refreshWhenVisible = () => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState !== "visible"
      ) {
        return;
      }
      void refreshRoutineCompletionsForDay({
        userId,
        dayKey: routineCompletionDayRef.current,
      }).catch((error: unknown) => {
        console.error("Failed to refresh routine completions", error);
      });
    };

    const handleVisibilityChange = () => {
      refreshWhenVisible();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshRoutineCompletionsForDay, userId]);

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
        updateItemDetails,
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
      updateItemDetails,
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
