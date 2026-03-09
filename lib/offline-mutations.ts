import { sortItemsByPriority } from "@/components/dashboard/list-utils";
import type {
  ItemKind,
  ListItem,
  RecurrenceType,
  TaskPriority,
  TaskUrgency,
} from "@/types";

export const OFFLINE_MUTATIONS_STORAGE_KEY = "wajib:offline-mutations";

export type ItemSyncStatus = "synced" | "pending";

export interface NormalizedCreateInput {
  title: string;
  value: TaskPriority;
  urgency: TaskUrgency;
  estimated_hours: number | null;
  category: string;
  recurrence_type: RecurrenceType;
  recurrence_interval: number;
  completed: boolean;
}

export interface ItemPatch {
  title?: string;
  value?: TaskPriority;
  urgency?: TaskUrgency;
  estimated_hours?: number | null;
  category?: string;
  recurrence_type?: RecurrenceType;
  recurrence_interval?: number;
  completed?: boolean;
}

export type OfflineMutation =
  | {
      id: string;
      kind: "create_item";
      itemKind: ItemKind;
      tempId: string;
      userId: string;
      queuedAt: string;
      data: NormalizedCreateInput;
    }
  | {
      id: string;
      kind: "update_item";
      itemId: string;
      itemKind: ItemKind;
      queuedAt: string;
      patch: ItemPatch;
    }
  | {
      id: string;
      kind: "delete_item";
      itemId: string;
      itemKind: ItemKind;
      queuedAt: string;
    }
  | {
      id: string;
      kind: "toggle_routine_completion";
      itemId: string;
      queuedAt: string;
      userId: string;
      completed: boolean;
      actionDayKey: string;
      periodStartDayKey?: string;
      periodEndDayKey?: string;
    };

export const isTempId = (itemId: string) => itemId.startsWith("local-");

const withPendingSync = (item: ListItem): ListItem => ({
  ...item,
  local_only: item.local_only ?? isTempId(item.id),
  sync_status: "pending",
});

const applyPatchToItem = (item: ListItem, patch: ItemPatch): ListItem =>
  withPendingSync({
    ...item,
    ...(typeof patch.title === "string" ? { title: patch.title } : {}),
    ...(typeof patch.category === "string" ? { category: patch.category } : {}),
    ...(patch.value ? { value: patch.value, priority: patch.value } : {}),
    ...(patch.urgency ? { urgency: patch.urgency } : {}),
    ...(typeof patch.estimated_hours !== "undefined"
      ? { estimated_hours: patch.estimated_hours }
      : {}),
    ...(typeof patch.completed === "boolean"
      ? { completed: patch.completed }
      : {}),
    ...(patch.recurrence_type
      ? { recurrence_type: patch.recurrence_type }
      : {}),
    ...(typeof patch.recurrence_interval === "number"
      ? { recurrence_interval: patch.recurrence_interval }
      : {}),
  });

const buildOptimisticItem = (
  mutation: Extract<OfflineMutation, { kind: "create_item" }>,
): ListItem =>
  withPendingSync({
    id: mutation.tempId,
    created_at: mutation.queuedAt,
    title: mutation.data.title,
    completed:
      mutation.itemKind === "task" ? mutation.data.completed : false,
    item_kind: mutation.itemKind,
    value: mutation.data.value,
    priority: mutation.data.value,
    urgency: mutation.data.urgency,
    estimated_hours: mutation.data.estimated_hours,
    user_id: mutation.userId,
    category: mutation.data.category,
    recurrence_type:
      mutation.itemKind === "routine"
        ? mutation.data.recurrence_type
        : "none",
    recurrence_interval:
      mutation.itemKind === "routine"
        ? mutation.data.recurrence_interval
        : 1,
    local_only: true,
    sync_status: "pending",
  });

const mergeCreatePatch = (
  mutation: Extract<OfflineMutation, { kind: "create_item" }>,
  patch: ItemPatch,
) => {
  mutation.data = {
    ...mutation.data,
    ...(typeof patch.title === "string" ? { title: patch.title } : {}),
    ...(typeof patch.category === "string" ? { category: patch.category } : {}),
    ...(patch.value ? { value: patch.value } : {}),
    ...(patch.urgency ? { urgency: patch.urgency } : {}),
    ...(typeof patch.estimated_hours !== "undefined"
      ? { estimated_hours: patch.estimated_hours }
      : {}),
    ...(typeof patch.completed === "boolean"
      ? { completed: patch.completed }
      : {}),
    ...(patch.recurrence_type
      ? { recurrence_type: patch.recurrence_type }
      : {}),
    ...(typeof patch.recurrence_interval === "number"
      ? { recurrence_interval: patch.recurrence_interval }
      : {}),
  };
};

const cloneMutation = (mutation: OfflineMutation): OfflineMutation => {
  switch (mutation.kind) {
    case "create_item":
      return {
        ...mutation,
        data: { ...mutation.data },
      };
    case "update_item":
      return {
        ...mutation,
        patch: { ...mutation.patch },
      };
    default:
      return { ...mutation };
  }
};

export const serializeOfflineMutations = (mutations: OfflineMutation[]) =>
  JSON.stringify(mutations);

export const parseOfflineMutations = (raw: string | null): OfflineMutation[] => {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as OfflineMutation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export function enqueueOfflineMutation(
  currentQueue: OfflineMutation[],
  mutation: OfflineMutation,
) {
  const queue = currentQueue.map(cloneMutation);

  if (mutation.kind === "create_item") {
    return [...queue, cloneMutation(mutation)];
  }

  if (mutation.kind === "update_item") {
    const createIndex = queue.findIndex(
      (entry) =>
        entry.kind === "create_item" && entry.tempId === mutation.itemId,
    );
    if (createIndex >= 0) {
      mergeCreatePatch(
        queue[createIndex] as Extract<OfflineMutation, { kind: "create_item" }>,
        mutation.patch,
      );
      return queue;
    }

    if (
      queue.some(
        (entry) =>
          entry.kind === "delete_item" && entry.itemId === mutation.itemId,
      )
    ) {
      return queue;
    }

    const updateIndex = queue.findIndex(
      (entry) =>
        entry.kind === "update_item" && entry.itemId === mutation.itemId,
    );

    if (updateIndex >= 0) {
      queue[updateIndex] = {
        ...queue[updateIndex],
        patch: {
          ...(queue[updateIndex] as Extract<
            OfflineMutation,
            { kind: "update_item" }
          >).patch,
          ...mutation.patch,
        },
      } as Extract<OfflineMutation, { kind: "update_item" }>;
      return queue;
    }

    return [...queue, cloneMutation(mutation)];
  }

  if (mutation.kind === "delete_item") {
    const nextQueue = queue.filter((entry) => {
      if (entry.kind === "create_item" && entry.tempId === mutation.itemId) {
        return false;
      }
      if (
        "itemId" in entry &&
        entry.itemId === mutation.itemId &&
        (entry.kind === "update_item" ||
          entry.kind === "delete_item" ||
          entry.kind === "toggle_routine_completion")
      ) {
        return false;
      }
      return true;
    });

    if (isTempId(mutation.itemId)) {
      return nextQueue;
    }

    return [...nextQueue, cloneMutation(mutation)];
  }

  const filteredQueue = queue.filter(
    (entry) =>
      !(
        entry.kind === "toggle_routine_completion" &&
        entry.itemId === mutation.itemId
      ),
  );
  return [...filteredQueue, cloneMutation(mutation)];
}

export function applyOfflineMutations(
  baseItems: ListItem[],
  mutations: OfflineMutation[],
) {
  const normalizedBase = baseItems.map((item) => ({
    ...item,
    sync_status: item.sync_status ?? "synced",
    local_only: item.local_only ?? false,
  }));

  const nextItems = mutations.reduce<ListItem[]>((items, mutation) => {
    switch (mutation.kind) {
      case "create_item":
        return [...items, buildOptimisticItem(mutation)];
      case "update_item":
        return items.map((item) =>
          item.id === mutation.itemId ? applyPatchToItem(item, mutation.patch) : item,
        );
      case "delete_item":
        return items.filter((item) => item.id !== mutation.itemId);
      case "toggle_routine_completion":
        return items.map((item) =>
          item.id === mutation.itemId
            ? withPendingSync({ ...item, completed: mutation.completed })
            : item,
        );
      default:
        return items;
    }
  }, normalizedBase);

  return sortItemsByPriority(nextItems);
}

export function applyOfflineMutation(
  items: ListItem[],
  mutation: OfflineMutation,
): ListItem[] {
  return applyOfflineMutations(items, [mutation]);
}
