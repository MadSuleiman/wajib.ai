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
import { toast } from "sonner";

import { useNetworkStatus } from "@/hooks/use-network-status";
import {
  OFFLINE_MUTATIONS_STORAGE_KEY,
  applyOfflineMutation,
  applyOfflineMutations,
  enqueueOfflineMutation,
  isTempId,
  parseOfflineMutations,
  serializeOfflineMutations,
  type ItemPatch,
  type NormalizedCreateInput,
  type OfflineMutation,
} from "@/lib/offline-mutations";
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
import {
  getLocalDayKey,
  getRoutinePeriodInfo,
  isDayKeyInRange,
} from "./routine-period";

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

const createLocalId = () =>
  `local-${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`}`;

const createMutationId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const normalizeEstimatedHours = (hours?: string | null) => {
  const rawValue = typeof hours === "string" ? hours.trim() : "";
  if (!rawValue) return { value: null, isValid: true };
  const parsed = Number.parseFloat(rawValue);
  return {
    value: Number.isNaN(parsed) ? null : parsed,
    isValid: !Number.isNaN(parsed),
  };
};

const normalizeCategory = (category?: string) =>
  (category || "task").trim() || "task";

const buildNormalizedCreateInput = ({
  title,
  priority,
  urgency,
  hours,
  category,
  recurrenceType,
  recurrenceInterval,
}: AddItemInput): {
  itemKind: ItemKind;
  normalized: NormalizedCreateInput;
  validationError?: string;
} => {
  const hoursResult = normalizeEstimatedHours(hours ?? null);
  if (!hoursResult.isValid) {
    return {
      itemKind: "task",
      normalized: {
        title,
        value: priority,
        urgency,
        estimated_hours: null,
        category: normalizeCategory(category),
        recurrence_type: "none",
        recurrence_interval: 1,
        completed: false,
      },
      validationError: "Invalid hours value",
    };
  }

  const normalizedRecurrenceType = recurrenceType ?? "none";
  const normalizedRecurrenceInterval =
    recurrenceInterval && recurrenceInterval > 0
      ? Math.floor(recurrenceInterval)
      : 1;
  const itemKind: ItemKind =
    normalizedRecurrenceType === "none" ? "task" : "routine";

  return {
    itemKind,
    normalized: {
      title: title.trim(),
      value: priority,
      urgency,
      estimated_hours: hoursResult.value,
      category: normalizeCategory(category),
      recurrence_type:
        itemKind === "routine" ? normalizedRecurrenceType : "none",
      recurrence_interval:
        itemKind === "routine" ? normalizedRecurrenceInterval : 1,
      completed: false,
    },
  };
};

const buildItemPatch = (
  existingItem: ListItem,
  updates: {
    title?: string;
    priority?: TaskPriority;
    urgency?: TaskUrgency;
    hours?: string | null;
    category?: string;
    recurrence?: { type: RecurrenceType; interval: number };
  },
) => {
  const patch: ItemPatch = {};
  let hasChanges = false;
  let validationError: string | null = null;

  if (typeof updates.title === "string") {
    const trimmedTitle = updates.title.trim();
    if (trimmedTitle && trimmedTitle !== existingItem.title) {
      patch.title = trimmedTitle;
      hasChanges = true;
    }
  }

  if (typeof updates.category === "string") {
    const normalizedCategory = normalizeCategory(updates.category);
    if (normalizedCategory !== existingItem.category) {
      patch.category = normalizedCategory;
      hasChanges = true;
    }
  }

  if (updates.priority && updates.priority !== existingItem.priority) {
    patch.value = updates.priority;
    hasChanges = true;
  }

  if (updates.urgency && updates.urgency !== existingItem.urgency) {
    patch.urgency = updates.urgency;
    hasChanges = true;
  }

  if (typeof updates.hours !== "undefined") {
    const hoursResult = normalizeEstimatedHours(updates.hours);
    if (!hoursResult.isValid) {
      validationError = "Invalid hours value";
    } else if (hoursResult.value !== existingItem.estimated_hours) {
      patch.estimated_hours = hoursResult.value;
      hasChanges = true;
    }
  }

  if (updates.recurrence) {
    if (existingItem.item_kind === "task") {
      validationError = "Use recurrence update to convert tasks to routines";
    } else {
      const normalizedType =
        updates.recurrence.type ?? existingItem.recurrence_type;
      const normalizedInterval =
        updates.recurrence.interval && updates.recurrence.interval > 0
          ? Math.floor(updates.recurrence.interval)
          : existingItem.recurrence_interval;

      if (normalizedType !== existingItem.recurrence_type) {
        patch.recurrence_type = normalizedType;
        hasChanges = true;
      }

      if (normalizedInterval !== existingItem.recurrence_interval) {
        patch.recurrence_interval = normalizedInterval;
        hasChanges = true;
      }
    }
  }

  return { patch, hasChanges, validationError };
};

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

interface SyncState {
  isCheckingConnection: boolean;
  isOnline: boolean;
  isSlowConnection: boolean;
  pendingChangesCount: number;
  isSyncing: boolean;
  lastSyncError: string | null;
  flushPendingChanges: () => Promise<void>;
}

interface SupabaseContextValue {
  items: ListStore;
  categories: Category[];
  sync: SyncState;
}

const SupabaseContext = createContext<SupabaseContextValue | null>(null);

interface SupabaseProviderProps {
  initialUserId?: string | null;
  initialItems: ListItem[];
  initialCategories: Category[];
  children: ReactNode;
}

export function SupabaseProvider({
  initialUserId,
  initialItems,
  initialCategories,
  children,
}: SupabaseProviderProps) {
  const supabase = useMemo(() => createClientSupabaseClient(), []);
  const { isCheckingConnection, isOnline, isSlowConnection } =
    useNetworkStatus();
  const [userId, setUserId] = useState<string | null>(
    initialUserId ?? initialItems[0]?.user_id ?? null,
  );
  const [items, setItems] = useState<ListItem[]>(() =>
    sortItemsByPriority(initialItems),
  );
  const itemsRef = useRef(items);
  const [categories] = useState<Category[]>(initialCategories);
  const [isLoading, setIsLoading] = useState(false);
  const [routineCompletionDay, setRoutineCompletionDay] = useState(() =>
    getLocalDayKey(new Date()),
  );
  const [completedRoutineIds, setCompletedRoutineIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [offlineMutations, setOfflineMutations] = useState<OfflineMutation[]>(
    [],
  );
  const [isSyncingQueue, setIsSyncingQueue] = useState(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const routineCompletionDayRef = useRef(routineCompletionDay);
  const completedRoutineIdsRef = useRef(completedRoutineIds);
  const offlineMutationsRef = useRef<OfflineMutation[]>(offlineMutations);

  useEffect(() => {
    routineCompletionDayRef.current = routineCompletionDay;
  }, [routineCompletionDay]);

  useEffect(() => {
    completedRoutineIdsRef.current = completedRoutineIds;
  }, [completedRoutineIds]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    offlineMutationsRef.current = offlineMutations;
    if (typeof window === "undefined") return;
    if (!offlineMutations.length) {
      window.localStorage.removeItem(OFFLINE_MUTATIONS_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(
      OFFLINE_MUTATIONS_STORAGE_KEY,
      serializeOfflineMutations(offlineMutations),
    );
  }, [offlineMutations]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedMutations = parseOfflineMutations(
      window.localStorage.getItem(OFFLINE_MUTATIONS_STORAGE_KEY),
    );

    if (!storedMutations.length) return;

    offlineMutationsRef.current = storedMutations;
    setOfflineMutations(storedMutations);
    setItems((current) => applyOfflineMutations(current, storedMutations));

    const storedUserId =
      storedMutations.find((mutation) => "userId" in mutation)?.userId ?? null;
    if (storedUserId) {
      setUserId((current) => current ?? storedUserId);
    }
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const nextKey = getLocalDayKey(new Date());
      setRoutineCompletionDay((current) =>
        current === nextKey ? current : nextKey,
      );
    }, 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const enqueueMutation = useCallback((mutation: OfflineMutation) => {
    setOfflineMutations((current) => enqueueOfflineMutation(current, mutation));
    setItems((current) => applyOfflineMutation(current, mutation));
    setLastSyncError(null);
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
    async (input: { userId: string; now?: Date }) => {
      const now = input.now ?? new Date();
      const routineItems = itemsRef.current.filter(
        (item): item is ListItem => item.item_kind === "routine",
      );

      if (routineItems.length === 0) {
        applyRoutineCompletionSet(new Set());
        return;
      }

      const periodByRoutineId = new Map<
        string,
        { startDayKey: string; endDayKey: string }
      >();
      let earliestStartDayKey: string | null = null;

      for (const routine of routineItems) {
        const period = getRoutinePeriodInfo(routine, now);
        if (!period) continue;
        periodByRoutineId.set(routine.id, {
          startDayKey: period.startDayKey,
          endDayKey: period.endDayKey,
        });
        if (!earliestStartDayKey || period.startDayKey < earliestStartDayKey) {
          earliestStartDayKey = period.startDayKey;
        }
      }

      if (!earliestStartDayKey || periodByRoutineId.size === 0) {
        applyRoutineCompletionSet(new Set());
        return;
      }

      const routineIds = Array.from(periodByRoutineId.keys());
      const todayDayKey = getLocalDayKey(now);

      const { data, error } = await supabase
        .from("routine_logs")
        .select("routine_id, completed_day")
        .eq("user_id", input.userId)
        .in("routine_id", routineIds)
        .gte("completed_day", earliestStartDayKey)
        .lte("completed_day", todayDayKey);

      if (error) throw error;

      const nextSet = new Set<string>();
      (data ?? []).forEach((row) => {
        if (!row?.routine_id || !row?.completed_day) return;
        const routineId = String(row.routine_id);
        const completedDayKey = String(row.completed_day);
        const period = periodByRoutineId.get(routineId);
        if (!period) return;
        if (
          isDayKeyInRange(completedDayKey, period.startDayKey, period.endDayKey)
        ) {
          nextSet.add(routineId);
        }
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
            sync_status: "synced" as const,
            local_only: false,
          }
        : {
            ...nextItem,
            sync_status: "synced" as const,
            local_only: false,
          };
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

  const replaceOptimisticItem = useCallback(
    (tempId: string, nextItem: ListItem) => {
      const normalized =
        nextItem.item_kind === "routine"
          ? {
              ...nextItem,
              completed: completedRoutineIdsRef.current.has(nextItem.id),
              sync_status: "synced" as const,
              local_only: false,
            }
          : {
              ...nextItem,
              sync_status: "synced" as const,
              local_only: false,
            };

      setItems((current) =>
        sortItemsByPriority([
          ...current.filter(
            (item) => item.id !== tempId && item.id !== normalized.id,
          ),
          normalized,
        ]),
      );
    },
    [],
  );

  const flushPendingChanges = useCallback(async () => {
    if (
      !isOnline ||
      isSyncingQueue ||
      offlineMutationsRef.current.length === 0
    ) {
      return;
    }

    setIsSyncingQueue(true);
    setLastSyncError(null);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user)
        throw new Error("You must be signed in to sync offline changes.");

      setUserId(user.id);

      let shouldRefreshRoutines = false;
      const queueSnapshot = [...offlineMutationsRef.current];

      for (const mutation of queueSnapshot) {
        if (mutation.kind === "create_item") {
          const { data, error } =
            mutation.itemKind === "task"
              ? await supabase
                  .from("tasks")
                  .insert([
                    {
                      title: mutation.data.title,
                      completed: mutation.data.completed,
                      value: mutation.data.value,
                      urgency: mutation.data.urgency,
                      estimated_hours: mutation.data.estimated_hours,
                      category: mutation.data.category,
                      user_id: user.id,
                    },
                  ] as never)
                  .select()
                  .single()
              : await supabase
                  .from("routines")
                  .insert([
                    {
                      title: mutation.data.title,
                      value: mutation.data.value,
                      urgency: mutation.data.urgency,
                      estimated_hours: mutation.data.estimated_hours,
                      category: mutation.data.category,
                      user_id: user.id,
                      recurrence_type: mutation.data.recurrence_type,
                      recurrence_interval: mutation.data.recurrence_interval,
                    },
                  ] as never)
                  .select()
                  .single();

          if (error) throw error;
          if (data) {
            replaceOptimisticItem(
              mutation.tempId,
              mutation.itemKind === "task"
                ? taskRowToListItem(data as never)
                : routineRowToListItem(data as never),
            );
          }
        } else if (mutation.kind === "update_item") {
          const targetTable =
            mutation.itemKind === "routine" ? "routines" : "tasks";
          const { data, error } = await supabase
            .from(targetTable)
            .update(mutation.patch as never)
            .eq("id", mutation.itemId)
            .select()
            .single();

          if (error) throw error;
          if (data) {
            refreshItem(
              targetTable === "tasks"
                ? taskRowToListItem(data as never)
                : routineRowToListItem(data as never),
            );
          }
        } else if (mutation.kind === "delete_item") {
          const targetTable =
            mutation.itemKind === "routine" ? "routines" : "tasks";
          const { error } = await supabase
            .from(targetTable)
            .delete()
            .eq("id", mutation.itemId);

          if (error) throw error;
          removeItem(mutation.itemId);
        } else if (mutation.kind === "toggle_routine_completion") {
          if (mutation.completed) {
            const { error } = await supabase.from("routine_logs").upsert(
              [
                {
                  routine_id: mutation.itemId,
                  user_id: mutation.userId,
                  completed_day: mutation.actionDayKey,
                  completed_at: mutation.queuedAt,
                },
              ] as never,
              { onConflict: "routine_id,user_id,completed_day" },
            );

            if (error) throw error;
          } else {
            const deleteQuery = supabase
              .from("routine_logs")
              .delete()
              .eq("routine_id", mutation.itemId)
              .eq("user_id", mutation.userId);

            const { error } =
              mutation.periodStartDayKey && mutation.periodEndDayKey
                ? await deleteQuery
                    .gte("completed_day", mutation.periodStartDayKey)
                    .lte("completed_day", mutation.periodEndDayKey)
                : await deleteQuery.eq("completed_day", mutation.actionDayKey);

            if (error) throw error;
          }

          shouldRefreshRoutines = true;
          setItems((current) =>
            sortItemsByPriority(
              current.map((item) =>
                item.id === mutation.itemId
                  ? {
                      ...item,
                      completed: mutation.completed,
                      sync_status: "synced",
                      local_only: false,
                    }
                  : item,
              ),
            ),
          );
        }

        setOfflineMutations((current) =>
          current.filter((entry) => entry.id !== mutation.id),
        );
      }

      if (shouldRefreshRoutines) {
        await refreshRoutineCompletionsForDay({
          userId: user.id,
          now: new Date(),
        });
      }

      toast.success("Queued changes synced", {
        description: "Offline edits are now saved.",
      });
    } catch (error: unknown) {
      const message =
        getErrorMessage(error) || "Queued changes will retry when possible.";
      setLastSyncError(message);
      toast.error("Couldn't sync offline changes", {
        description: message,
      });
    } finally {
      setIsSyncingQueue(false);
    }
  }, [
    isOnline,
    isSyncingQueue,
    refreshItem,
    refreshRoutineCompletionsForDay,
    removeItem,
    replaceOptimisticItem,
    supabase,
  ]);

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

      const normalizedInput = buildNormalizedCreateInput({
        title: trimmedTitle,
        priority,
        urgency,
        hours,
        category,
        recurrenceType,
        recurrenceInterval,
      });

      if (normalizedInput.validationError) {
        toast.error(normalizedInput.validationError);
        return false;
      }

      setIsLoading(true);
      try {
        const itemKind = normalizedInput.itemKind;
        const fallbackUserId =
          userId ??
          itemsRef.current.find((item) => item.user_id)?.user_id ??
          null;

        if (!isOnline) {
          if (!fallbackUserId) {
            toast.error(
              "Reconnect once to restore your session before adding items offline.",
            );
            return false;
          }

          enqueueMutation({
            id: createMutationId(),
            kind: "create_item",
            itemKind,
            tempId: createLocalId(),
            userId: fallbackUserId,
            queuedAt: new Date().toISOString(),
            data: normalizedInput.normalized,
          });

          toast.info("Saved offline", {
            description:
              "This item will sync automatically when you're back online.",
          });
          return true;
        }

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user) {
          toast.error("You must be signed in to add items.");
          return false;
        }

        const { data, error } =
          itemKind === "task"
            ? await supabase
                .from("tasks")
                .insert([
                  {
                    title: trimmedTitle,
                    completed: false,
                    value: priority,
                    urgency,
                    estimated_hours: normalizedInput.normalized.estimated_hours,
                    category: normalizedInput.normalized.category,
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
                    estimated_hours: normalizedInput.normalized.estimated_hours,
                    category: normalizedInput.normalized.category,
                    user_id: user.id,
                    recurrence_type: normalizedInput.normalized.recurrence_type,
                    recurrence_interval:
                      normalizedInput.normalized.recurrence_interval,
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
    [enqueueMutation, isOnline, refreshItem, supabase, userId],
  );

  const toggleItemCompletion: ListStore["toggleItemCompletion"] = useCallback(
    async (item) => {
      if (!isOnline) {
        if (item.item_kind === "routine") {
          if (item.local_only || isTempId(item.id)) {
            toast.error(
              "Sync this new routine before tracking completions offline.",
            );
            return false;
          }

          const now = new Date();
          const nextCompleted = !item.completed;
          const dayKey = getLocalDayKey(now);
          const period = getRoutinePeriodInfo(item, now);

          if (dayKey !== routineCompletionDayRef.current) {
            setRoutineCompletionDay(dayKey);
          }

          enqueueMutation({
            id: createMutationId(),
            kind: "toggle_routine_completion",
            itemId: item.id,
            queuedAt: now.toISOString(),
            userId: item.user_id,
            completed: nextCompleted,
            actionDayKey: dayKey,
            periodStartDayKey: period?.startDayKey,
            periodEndDayKey: period?.endDayKey,
          });

          toast.info(
            nextCompleted
              ? "Routine queued as complete"
              : "Routine queued as active",
            {
              description:
                "We'll sync this completion change once you're back online.",
            },
          );
          return true;
        }

        enqueueMutation({
          id: createMutationId(),
          kind: "update_item",
          itemId: item.id,
          itemKind: "task",
          queuedAt: new Date().toISOString(),
          patch: { completed: !item.completed },
        });

        toast.info(
          !item.completed ? "Task queued as complete" : "Task queued as active",
          {
            description:
              "We'll sync this change automatically when your connection returns.",
          },
        );
        return true;
      }

      if (item.item_kind === "routine") {
        try {
          const now = new Date();
          const dayKey = getLocalDayKey(now);
          const period = getRoutinePeriodInfo(item, now);
          if (dayKey !== routineCompletionDayRef.current) {
            setRoutineCompletionDay(dayKey);
          }

          if (item.completed) {
            const deleteQuery = supabase
              .from("routine_logs")
              .delete()
              .eq("routine_id", item.id)
              .eq("user_id", item.user_id);

            const { error } = period
              ? await deleteQuery
                  .gte("completed_day", period.startDayKey)
                  .lte("completed_day", period.endDayKey)
              : await deleteQuery.eq("completed_day", dayKey);

            if (error) throw error;

            await refreshRoutineCompletionsForDay({
              userId: item.user_id,
              now,
            });
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

          await refreshRoutineCompletionsForDay({ userId: item.user_id, now });

          toast.success("Routine completed", {
            description: period
              ? `Tracked for this ${period.periodLabel}.`
              : "Tracked for today.",
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
    [
      enqueueMutation,
      isOnline,
      refreshItem,
      refreshRoutineCompletionsForDay,
      supabase,
    ],
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
      if (!isOnline) {
        toast.error("Reconnect to change recurrence patterns.");
        return false;
      }

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
    [isOnline, items, refreshItem, removeItem, supabase],
  );

  const updateItemDetails: ListStore["updateItemDetails"] = useCallback(
    async (itemId, updates) => {
      try {
        const existingItem = items.find((current) => current.id === itemId);
        if (!existingItem) {
          toast.error("Item not found");
          return false;
        }

        const { patch, hasChanges, validationError } = buildItemPatch(
          existingItem,
          updates,
        );

        if (validationError) {
          toast.error(validationError);
          return false;
        }

        if (!hasChanges) {
          toast.info("No changes to save");
          return true;
        }

        if (!isOnline) {
          enqueueMutation({
            id: createMutationId(),
            kind: "update_item",
            itemId,
            itemKind: existingItem.item_kind,
            queuedAt: new Date().toISOString(),
            patch,
          });

          toast.info("Changes queued offline", {
            description:
              "Your edits will sync once the connection is restored.",
          });
          return true;
        }

        const targetTable =
          existingItem.item_kind === "routine" ? "routines" : "tasks";

        const { data, error } = await supabase
          .from(targetTable)
          .update(patch as never)
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
    [enqueueMutation, isOnline, items, refreshItem, supabase],
  );

  const deleteItem: ListStore["deleteItem"] = useCallback(
    async (itemId) => {
      try {
        const existingItem = items.find((current) => current.id === itemId);
        if (!existingItem) {
          toast.error("Item not found");
          return false;
        }

        if (!isOnline) {
          enqueueMutation({
            id: createMutationId(),
            kind: "delete_item",
            itemId,
            itemKind: existingItem.item_kind,
            queuedAt: new Date().toISOString(),
          });

          toast.info("Delete queued offline", {
            description:
              "This item will be removed from the server once you're back online.",
          });
          return true;
        }

        const targetTable =
          existingItem.item_kind === "routine" ? "routines" : "tasks";

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
    [enqueueMutation, isOnline, items, supabase, removeItem],
  );

  useEffect(() => {
    if (!isOnline || offlineMutations.length === 0) return;

    void flushPendingChanges();
  }, [flushPendingChanges, isOnline, offlineMutations.length]);

  useEffect(() => {
    if (!isOnline) return;

    const handleOnline = () => {
      void flushPendingChanges();
    };

    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [flushPendingChanges, isOnline]);

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
      if (!isOnline) return;

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
              void refreshRoutineCompletionsForDay({
                userId: user.id,
                now: new Date(),
              }).catch((error: unknown) => {
                console.error("Failed to refresh routine completions", error);
              });
              return;
            }
            if (payload.new) {
              refreshItem(routineRowToListItem(payload.new as never));
              void refreshRoutineCompletionsForDay({
                userId: user.id,
                now: new Date(),
              }).catch((error: unknown) => {
                console.error("Failed to refresh routine completions", error);
              });
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
          () => {
            if (isCancelled) return;
            void refreshRoutineCompletionsForDay({
              userId: user.id,
              now: new Date(),
            }).catch((error: unknown) => {
              console.error("Failed to refresh routine completions", error);
            });
          },
        )
        .subscribe();
    };

    const restartRealtimeWhenVisible = () => {
      if (!isOnline) return;
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
  }, [
    isOnline,
    refreshItem,
    refreshRoutineCompletionsForDay,
    removeItem,
    supabase,
  ]);

  useEffect(() => {
    if (!userId || !isOnline) return;
    void refreshRoutineCompletionsForDay({
      userId,
      now: new Date(),
    }).catch((error: unknown) => {
      console.error("Failed to refresh routine completions", error);
    });
  }, [isOnline, refreshRoutineCompletionsForDay, routineCompletionDay, userId]);

  useEffect(() => {
    if (!userId || !isOnline) return;

    const refreshWhenVisible = () => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState !== "visible"
      ) {
        return;
      }
      void refreshRoutineCompletionsForDay({
        userId,
        now: new Date(),
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
  }, [isOnline, refreshRoutineCompletionsForDay, userId]);

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
      sync: {
        isCheckingConnection,
        isOnline,
        isSlowConnection,
        pendingChangesCount: offlineMutations.length,
        isSyncing: isSyncingQueue,
        lastSyncError,
        flushPendingChanges,
      },
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
      isCheckingConnection,
      isOnline,
      isSlowConnection,
      offlineMutations.length,
      isSyncingQueue,
      lastSyncError,
      flushPendingChanges,
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
