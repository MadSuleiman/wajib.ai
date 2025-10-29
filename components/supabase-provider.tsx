"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { createClientSupabaseClient } from "@/lib/supabase-client";
import { sortItemsByPriority } from "@/components/list-utils";
import type { Task, TaskPriority, ShoppingItem, WatchItem } from "@/types";

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

interface TaskStore {
  tasks: Task[];
  isLoading: boolean;
  addTask: (
    title: string,
    priority: TaskPriority,
    hours: string,
  ) => Promise<boolean>;
  toggleTaskCompletion: (
    taskId: string,
    completed: boolean,
  ) => Promise<boolean>;
  updateTaskPriority: (
    taskId: string,
    priority: TaskPriority,
  ) => Promise<boolean>;
  updateTaskHours: (taskId: string, hours: string) => Promise<boolean>;
  deleteTask: (taskId: string) => Promise<boolean>;
}

interface ShoppingStore {
  items: ShoppingItem[];
  isLoading: boolean;
  addItem: (title: string, priority: TaskPriority) => Promise<boolean>;
  toggleItemCompletion: (
    itemId: string,
    completed: boolean,
  ) => Promise<boolean>;
  updateItemPriority: (
    itemId: string,
    priority: TaskPriority,
  ) => Promise<boolean>;
  deleteItem: (itemId: string) => Promise<boolean>;
}

interface WatchStore {
  items: WatchItem[];
  isLoading: boolean;
  addItem: (
    title: string,
    priority: TaskPriority,
    hours: string,
  ) => Promise<boolean>;
  toggleItemCompletion: (
    itemId: string,
    completed: boolean,
  ) => Promise<boolean>;
  updateItemPriority: (
    itemId: string,
    priority: TaskPriority,
  ) => Promise<boolean>;
  updateItemHours: (itemId: string, hours: string) => Promise<boolean>;
  deleteItem: (itemId: string) => Promise<boolean>;
}

interface SupabaseContextValue {
  tasks: TaskStore;
  shopping: ShoppingStore;
  watch: WatchStore;
}

const SupabaseContext = createContext<SupabaseContextValue | null>(null);

interface SupabaseProviderProps {
  initialTasks: Task[];
  initialShoppingItems: ShoppingItem[];
  initialWatchItems: WatchItem[];
  children: ReactNode;
}

export function SupabaseProvider({
  initialTasks,
  initialShoppingItems,
  initialWatchItems,
  children,
}: SupabaseProviderProps) {
  const supabase = useMemo(() => createClientSupabaseClient(), []);
  const [tasks, setTasks] = useState<Task[]>(() =>
    sortItemsByPriority(initialTasks),
  );
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>(() =>
    sortItemsByPriority(initialShoppingItems),
  );
  const [watchItems, setWatchItems] = useState<WatchItem[]>(() =>
    sortItemsByPriority(initialWatchItems),
  );
  const [tasksLoading, setTasksLoading] = useState(false);
  const [shoppingLoading, setShoppingLoading] = useState(false);
  const [watchLoading, setWatchLoading] = useState(false);

  const addTask: TaskStore["addTask"] = useCallback(
    async (title, priority, hours) => {
      const trimmed = title.trim();
      if (!trimmed) return false;

      setTasksLoading(true);
      try {
        const estimatedHours = hours ? Number.parseFloat(hours) : null;
        const { data, error } = await supabase
          .from("tasks")
          .insert([
            {
              title: trimmed,
              completed: false,
              priority,
              estimated_hours: estimatedHours,
            },
          ] as never)
          .select()
          .single();

        if (error) throw error;

        if (data) {
          setTasks((current) =>
            sortItemsByPriority([
              ...current.filter((task) => task.id !== (data as Task).id),
              data as Task,
            ]),
          );
        }

        toast.success("Task added", {
          description: "Your task has been added successfully.",
        });

        return true;
      } catch (error: unknown) {
        toast.error("Failed to add task", {
          description:
            getErrorMessage(error) || "Something went wrong. Please try again.",
        });
        return false;
      } finally {
        setTasksLoading(false);
      }
    },
    [supabase],
  );

  const toggleTaskCompletion: TaskStore["toggleTaskCompletion"] = useCallback(
    async (taskId, completed) => {
      try {
        const { data, error } = await supabase
          .from("tasks")
          .update({ completed: !completed } as never)
          .eq("id", taskId)
          .select()
          .single();

        if (error) throw error;

        if (data) {
          setTasks((current) =>
            sortItemsByPriority(
              current.map((task) =>
                task.id === taskId ? (data as Task) : task,
              ),
            ),
          );
        }

        return true;
      } catch (error: unknown) {
        toast.error("Failed to update task", {
          description:
            getErrorMessage(error) || "Something went wrong. Please try again.",
        });
        return false;
      }
    },
    [supabase],
  );

  const updateTaskPriority: TaskStore["updateTaskPriority"] = useCallback(
    async (taskId, priority) => {
      try {
        const { data, error } = await supabase
          .from("tasks")
          .update({ priority } as never)
          .eq("id", taskId)
          .select()
          .single();

        if (error) throw error;

        if (data) {
          setTasks((current) =>
            sortItemsByPriority(
              current.map((task) =>
                task.id === taskId ? (data as Task) : task,
              ),
            ),
          );
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
    [supabase],
  );

  const updateTaskHours: TaskStore["updateTaskHours"] = useCallback(
    async (taskId, hoursStr) => {
      const hours = hoursStr ? Number.parseFloat(hoursStr) : null;

      try {
        const { data, error } = await supabase
          .from("tasks")
          .update({ estimated_hours: hours } as never)
          .eq("id", taskId)
          .select()
          .single();

        if (error) throw error;

        if (data) {
          setTasks((current) =>
            sortItemsByPriority(
              current.map((task) =>
                task.id === taskId ? (data as Task) : task,
              ),
            ),
          );
        }

        toast.success("Estimated hours updated");
        return true;
      } catch (error: unknown) {
        toast.error("Failed to update hours", {
          description:
            getErrorMessage(error) || "Something went wrong. Please try again.",
        });
        return false;
      }
    },
    [supabase],
  );

  const deleteTask: TaskStore["deleteTask"] = useCallback(
    async (taskId) => {
      try {
        const { error } = await supabase
          .from("tasks")
          .delete()
          .eq("id", taskId);

        if (error) throw error;

        setTasks((current) => current.filter((task) => task.id !== taskId));

        toast.success("Task deleted", {
          description: "Your task has been deleted successfully.",
        });
        return true;
      } catch (error: unknown) {
        toast.error("Failed to delete task", {
          description:
            getErrorMessage(error) || "Something went wrong. Please try again.",
        });
        return false;
      }
    },
    [supabase],
  );

  const addShoppingItem: ShoppingStore["addItem"] = useCallback(
    async (title, priority) => {
      const trimmed = title.trim();
      if (!trimmed) return false;

      setShoppingLoading(true);
      try {
        const { data, error } = await supabase
          .from("shopping_items")
          .insert([{ title: trimmed, completed: false, priority }] as never)
          .select()
          .single();

        if (error) throw error;

        if (data) {
          setShoppingItems((current) =>
            sortItemsByPriority([
              ...current.filter(
                (item) => item.id !== (data as ShoppingItem).id,
              ),
              data as ShoppingItem,
            ]),
          );
        }

        toast.success("Item added", {
          description: "Your shopping item has been added successfully.",
        });
        return true;
      } catch (error: unknown) {
        toast.error("Failed to add item", {
          description:
            getErrorMessage(error) || "Something went wrong. Please try again.",
        });
        return false;
      } finally {
        setShoppingLoading(false);
      }
    },
    [supabase],
  );

  const toggleShoppingItem: ShoppingStore["toggleItemCompletion"] = useCallback(
    async (itemId, completed) => {
      try {
        const { data, error } = await supabase
          .from("shopping_items")
          .update({ completed: !completed } as never)
          .eq("id", itemId)
          .select()
          .single();

        if (error) throw error;

        if (data) {
          setShoppingItems((current) =>
            sortItemsByPriority(
              current.map((item) =>
                item.id === itemId ? (data as ShoppingItem) : item,
              ),
            ),
          );
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
    [supabase],
  );

  const updateShoppingPriority: ShoppingStore["updateItemPriority"] =
    useCallback(
      async (itemId, priority) => {
        try {
          const { data, error } = await supabase
            .from("shopping_items")
            .update({ priority } as never)
            .eq("id", itemId)
            .select()
            .single();

          if (error) throw error;

          if (data) {
            setShoppingItems((current) =>
              sortItemsByPriority(
                current.map((item) =>
                  item.id === itemId ? (data as ShoppingItem) : item,
                ),
              ),
            );
          }

          toast.success("Priority updated");
          return true;
        } catch (error: unknown) {
          toast.error("Failed to update priority", {
            description:
              getErrorMessage(error) ||
              "Something went wrong. Please try again.",
          });
          return false;
        }
      },
      [supabase],
    );

  const deleteShoppingItem: ShoppingStore["deleteItem"] = useCallback(
    async (itemId) => {
      try {
        const { error } = await supabase
          .from("shopping_items")
          .delete()
          .eq("id", itemId);

        if (error) throw error;

        setShoppingItems((current) =>
          current.filter((item) => item.id !== itemId),
        );

        toast.success("Item deleted", {
          description: "Your shopping item has been deleted successfully.",
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
    [supabase],
  );

  const addWatchItem: WatchStore["addItem"] = useCallback(
    async (title, priority, hours) => {
      const trimmed = title.trim();
      if (!trimmed) return false;

      setWatchLoading(true);
      try {
        const estimatedHours = hours ? Number.parseFloat(hours) : null;
        const { data, error } = await supabase
          .from("watch_items")
          .insert([
            {
              title: trimmed,
              completed: false,
              priority,
              estimated_hours: estimatedHours,
            },
          ] as never)
          .select()
          .single();

        if (error) throw error;

        if (data) {
          setWatchItems((current) =>
            sortItemsByPriority([
              ...current.filter((item) => item.id !== (data as WatchItem).id),
              data as WatchItem,
            ]),
          );
        }

        toast.success("Item added", {
          description: "Your watch item has been added successfully.",
        });
        return true;
      } catch (error: unknown) {
        toast.error("Failed to add item", {
          description:
            getErrorMessage(error) || "Something went wrong. Please try again.",
        });
        return false;
      } finally {
        setWatchLoading(false);
      }
    },
    [supabase],
  );

  const toggleWatchItem: WatchStore["toggleItemCompletion"] = useCallback(
    async (itemId, completed) => {
      try {
        const { data, error } = await supabase
          .from("watch_items")
          .update({ completed: !completed } as never)
          .eq("id", itemId)
          .select()
          .single();

        if (error) throw error;

        if (data) {
          setWatchItems((current) =>
            sortItemsByPriority(
              current.map((item) =>
                item.id === itemId ? (data as WatchItem) : item,
              ),
            ),
          );
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
    [supabase],
  );

  const updateWatchPriority: WatchStore["updateItemPriority"] = useCallback(
    async (itemId, priority) => {
      try {
        const { data, error } = await supabase
          .from("watch_items")
          .update({ priority } as never)
          .eq("id", itemId)
          .select()
          .single();

        if (error) throw error;

        if (data) {
          setWatchItems((current) =>
            sortItemsByPriority(
              current.map((item) =>
                item.id === itemId ? (data as WatchItem) : item,
              ),
            ),
          );
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
    [supabase],
  );

  const updateWatchHours: WatchStore["updateItemHours"] = useCallback(
    async (itemId, hoursStr) => {
      const hours = hoursStr ? Number.parseFloat(hoursStr) : null;

      try {
        const { data, error } = await supabase
          .from("watch_items")
          .update({ estimated_hours: hours } as never)
          .eq("id", itemId)
          .select()
          .single();

        if (error) throw error;

        if (data) {
          setWatchItems((current) =>
            sortItemsByPriority(
              current.map((item) =>
                item.id === itemId ? (data as WatchItem) : item,
              ),
            ),
          );
        }

        toast.success("Estimated hours updated");
        return true;
      } catch (error: unknown) {
        toast.error("Failed to update hours", {
          description:
            getErrorMessage(error) || "Something went wrong. Please try again.",
        });
        return false;
      }
    },
    [supabase],
  );

  const deleteWatchItem: WatchStore["deleteItem"] = useCallback(
    async (itemId) => {
      try {
        const { error } = await supabase
          .from("watch_items")
          .delete()
          .eq("id", itemId);

        if (error) throw error;

        setWatchItems((current) =>
          current.filter((item) => item.id !== itemId),
        );

        toast.success("Item deleted", {
          description: "Your watch item has been deleted successfully.",
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
    [supabase],
  );

  const value = useMemo<SupabaseContextValue>(
    () => ({
      tasks: {
        tasks,
        isLoading: tasksLoading,
        addTask,
        toggleTaskCompletion,
        updateTaskPriority,
        updateTaskHours,
        deleteTask,
      },
      shopping: {
        items: shoppingItems,
        isLoading: shoppingLoading,
        addItem: addShoppingItem,
        toggleItemCompletion: toggleShoppingItem,
        updateItemPriority: updateShoppingPriority,
        deleteItem: deleteShoppingItem,
      },
      watch: {
        items: watchItems,
        isLoading: watchLoading,
        addItem: addWatchItem,
        toggleItemCompletion: toggleWatchItem,
        updateItemPriority: updateWatchPriority,
        updateItemHours: updateWatchHours,
        deleteItem: deleteWatchItem,
      },
    }),
    [
      tasks,
      tasksLoading,
      addTask,
      toggleTaskCompletion,
      updateTaskPriority,
      updateTaskHours,
      deleteTask,
      shoppingItems,
      shoppingLoading,
      addShoppingItem,
      toggleShoppingItem,
      updateShoppingPriority,
      deleteShoppingItem,
      watchItems,
      watchLoading,
      addWatchItem,
      toggleWatchItem,
      updateWatchPriority,
      updateWatchHours,
      deleteWatchItem,
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
