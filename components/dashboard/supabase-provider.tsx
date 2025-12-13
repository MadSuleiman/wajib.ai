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
import { sortItemsByPriority } from "@/components/dashboard/list-utils";
import { toLocalMidnight } from "@/lib/timezone";
import type {
  Category,
  ItemKind,
  ListItem,
  RecurrenceType,
  TaskPriority,
} from "@/types";
import { routineRowToListItem, taskRowToListItem } from "@/types/supabase";

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
  updateItemDetails: (
    itemId: string,
    updates: {
      title?: string;
      priority?: TaskPriority;
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
        const itemKind: ItemKind =
          normalizedRecurrenceType === "none" ? "task" : "routine";
        const nextOccurrence =
          normalizedRecurrenceType === "none"
            ? null
            : toLocalMidnight(new Date());

        const { data, error } =
          normalizedRecurrenceType === "none"
            ? await supabase
                .from("tasks")
                .insert([
                  {
                    title: trimmedTitle,
                    completed: false,
                    priority,
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
      if (item.recurrence_type && item.recurrence_type !== "none") {
        // If the routine is currently considered "completed" (next occurrence in the future),
        // toggling should restore it to active/due today instead of logging another completion.
        const today = toLocalMidnight(new Date());
        const nextDate = item.recurrence_next_occurrence
          ? new Date(item.recurrence_next_occurrence)
          : null;
        const isCompleted = nextDate ? nextDate > today : false;

        if (isCompleted) {
          try {
            const { data, error } = await supabase
              .from("routines")
              .update({
                recurrence_next_occurrence: today.toISOString(),
                recurrence_last_completed: null,
              } as never)
              .eq("id", item.id)
              .select()
              .single();

            if (error) throw error;
            if (data) {
              refreshItem(routineRowToListItem(data as never));
            }

            toast.success("Routine marked as active");
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
          const { data, error } = await supabase.rpc("complete_routine", {
            p_routine_id: item.id,
            p_user_id: item.user_id,
          });

          if (error) throw error;

          if (data) {
            refreshItem(routineRowToListItem(data as never));
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
          .from("tasks")
          .update({ completed: !item.completed } as never)
          .eq("id", item.id)
          .select()
          .single();

        if (error) throw error;
        if (data) {
          refreshItem(taskRowToListItem(data as never));
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
    // calculateNextOccurrence is stable; included for clarity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [calculateNextOccurrence, refreshItem, supabase],
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
          .update({ priority } as never)
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
          const nextOccurrence = toLocalMidnight(new Date());

          const { data: created, error: createError } = await supabase
            .from("routines")
            .insert([
              {
                title: existingItem.title,
                priority: existingItem.priority,
                estimated_hours: existingItem.estimated_hours,
                category: existingItem.category,
                user_id: existingItem.user_id,
                recurrence_type: normalizedType,
                recurrence_interval: normalizedInterval,
                recurrence_next_occurrence: nextOccurrence
                  ? nextOccurrence.toISOString()
                  : null,
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
                  priority: existingItem.priority,
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

          const referenceDate = existingItem.recurrence_last_completed
            ? new Date(existingItem.recurrence_last_completed)
            : null;
          const nextOccurrence = referenceDate
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
    [calculateNextOccurrence, items, refreshItem, removeItem, supabase],
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
          payload.priority = updates.priority;
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

          const referenceDate = existingItem.recurrence_last_completed
            ? new Date(existingItem.recurrence_last_completed)
            : null;
          const nextOccurrence = referenceDate
            ? calculateNextOccurrence(
                normalizedType,
                normalizedInterval,
                referenceDate,
              )
            : toLocalMidnight(new Date());

          payload.recurrence_type = normalizedType;
          payload.recurrence_interval = normalizedInterval;
          payload.recurrence_next_occurrence = nextOccurrence
            ? nextOccurrence.toISOString()
            : null;
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
    [calculateNextOccurrence, items, refreshItem, supabase],
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
    const today = toLocalMidnight(new Date());
    const overdue = items.filter((item) => {
      if (!item.recurrence_type || item.recurrence_type === "none") {
        return false;
      }
      if (!item.recurrence_next_occurrence) return false;
      const nextDate = new Date(item.recurrence_next_occurrence);
      return nextDate < today;
    });

    if (!overdue.length) return;

    let cancelled = false;
    const rescheduleOverdue = async () => {
      for (const item of overdue) {
        if (cancelled) break;
        const nextOccurrence = calculateNextOccurrence(
          item.recurrence_type,
          item.recurrence_interval || 1,
          today,
        );
        const { data, error } = await supabase
          .from("routines")
          .update({
            recurrence_next_occurrence: nextOccurrence
              ? nextOccurrence.toISOString()
              : null,
            active: true,
          } as never)
          .eq("id", item.id)
          .select()
          .single();
        if (error) {
          console.error("Failed to reschedule overdue routine", item.id, error);
          continue;
        }
        if (data) {
          refreshItem(routineRowToListItem(data as never));
        }
      }
    };

    void rescheduleOverdue();

    return () => {
      cancelled = true;
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
