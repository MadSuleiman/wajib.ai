import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { createClientSupabaseClient } from "@/lib/supabase-client";
import type { Task, ShoppingItem, WatchItem, TaskPriority } from "@/types";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { sortItemsByPriority } from "@/components/list-utils";

// Helper function for error handling
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

// Hook for task operations
export function useTasks(initialTasks: Task[]) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClientSupabaseClient();

  const handleRealtimeUpdate = useCallback((updatedTasks: Task[]) => {
    setTasks(sortItemsByPriority(updatedTasks));
  }, []);

  useEffect(() => {
    setTasks(sortItemsByPriority(initialTasks));
  }, [initialTasks]);

  useEffect(() => {
    const channel: RealtimeChannel = supabase
      .channel("realtime-tasks")
      .on<Task>(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        async (payload) => {
          // Refetch all tasks and let the handleRealtimeUpdate sort them
          const { data } = await supabase.from("tasks").select("*");
          if (data) {
            handleRealtimeUpdate(data as Task[]);
          }
        },
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          console.log("Subscribed to tasks changes");
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          toast.error("Realtime connection error", {
            description: err?.message || "Could not connect to task updates.",
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, handleRealtimeUpdate]);

  const addTask = async (
    title: string,
    priority: TaskPriority,
    hours: string,
  ) => {
    if (!title.trim()) return;

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          title,
          completed: false,
          priority,
          estimated_hours: hours ? Number.parseFloat(hours) : null,
        })
        .select()
        .single();

      if (error) throw error;

      // No local state update needed here, realtime will handle it.
      // setTasks([data, ...tasks]);

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
      setIsLoading(false);
    }
  };

  const toggleTaskCompletion = async (taskId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ completed: !completed })
        .eq("id", taskId);

      if (error) throw error;
      // No local state update needed here, realtime will handle it.
      // setTasks(
      //   tasks.map((task) =>
      //     task.id === taskId ? { ...task, completed: !completed } : task,
      //   ),
      // );

      return true;
    } catch (error: unknown) {
      toast.error("Failed to update task", {
        description:
          getErrorMessage(error) || "Something went wrong. Please try again.",
      });
      return false;
    }
  };

  const updateTaskPriority = async (taskId: string, priority: TaskPriority) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ priority })
        .eq("id", taskId);

      if (error) throw error;
      // No local state update needed here, realtime will handle it.
      // setTasks(
      //   tasks.map((task) =>
      //     task.id === taskId ? { ...task, priority } : task,
      //   ),
      // );

      toast.success("Priority updated");
      return true;
    } catch (error: unknown) {
      toast.error("Failed to update priority", {
        description:
          getErrorMessage(error) || "Something went wrong. Please try again.",
      });
      return false;
    }
  };

  const updateTaskHours = async (taskId: string, hoursStr: string) => {
    const hours = hoursStr ? Number.parseFloat(hoursStr) : null;

    try {
      const { error } = await supabase
        .from("tasks")
        .update({ estimated_hours: hours })
        .eq("id", taskId);

      if (error) throw error;
      // No local state update needed here, realtime will handle it.
      // setTasks(
      //   tasks.map((task) =>
      //     task.id === taskId ? { ...task, estimated_hours: hours } : task,
      //   ),
      // );

      toast.success("Estimated hours updated");
      return true;
    } catch (error: unknown) {
      toast.error("Failed to update hours", {
        description:
          getErrorMessage(error) || "Something went wrong. Please try again.",
      });
      return false;
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);

      if (error) throw error;
      // No local state update needed here, realtime will handle it.
      // setTasks(tasks.filter((task) => task.id !== taskId));

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
  };

  return {
    tasks,
    isLoading,
    addTask,
    toggleTaskCompletion,
    updateTaskPriority,
    updateTaskHours,
    deleteTask,
  };
}

// Hook for shopping item operations
export function useShoppingItems(initialItems: ShoppingItem[]) {
  const [items, setItems] = useState<ShoppingItem[]>(initialItems);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClientSupabaseClient();

  const handleRealtimeUpdate = useCallback((updatedItems: ShoppingItem[]) => {
    setItems(sortItemsByPriority(updatedItems));
  }, []);

  useEffect(() => {
    setItems(sortItemsByPriority(initialItems));
  }, [initialItems]);

  useEffect(() => {
    const channel: RealtimeChannel = supabase
      .channel("realtime-shopping-items")
      .on<ShoppingItem>(
        "postgres_changes",
        { event: "*", schema: "public", table: "shopping_items" },
        async (payload) => {
          // Refetch all items and let the handleRealtimeUpdate sort them
          const { data } = await supabase.from("shopping_items").select("*");
          if (data) {
            handleRealtimeUpdate(data as ShoppingItem[]);
          }
        },
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          console.log("Subscribed to shopping_items changes");
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          toast.error("Realtime connection error", {
            description:
              err?.message || "Could not connect to shopping item updates.",
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, handleRealtimeUpdate]);

  const addItem = async (title: string, priority: TaskPriority) => {
    if (!title.trim()) return;

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from("shopping_items")
        .insert({
          title,
          completed: false,
          priority,
        })
        .select()
        .single();

      if (error) throw error;

      // No local state update needed here, realtime will handle it.
      // setItems([data, ...items]);

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
      setIsLoading(false);
    }
  };

  const toggleItemCompletion = async (itemId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from("shopping_items")
        .update({ completed: !completed })
        .eq("id", itemId);

      if (error) throw error;
      // No local state update needed here, realtime will handle it.
      // setItems(
      //   items.map((item) =>
      //     item.id === itemId ? { ...item, completed: !completed } : item,
      //   ),
      // );
      return true;
    } catch (error: unknown) {
      toast.error("Failed to update item", {
        description:
          getErrorMessage(error) || "Something went wrong. Please try again.",
      });
      return false;
    }
  };

  const updateItemPriority = async (itemId: string, priority: TaskPriority) => {
    try {
      const { error } = await supabase
        .from("shopping_items")
        .update({ priority })
        .eq("id", itemId);

      if (error) throw error;
      // No local state update needed here, realtime will handle it.
      // setItems(
      //   items.map((item) =>
      //     item.id === itemId ? { ...item, priority } : item,
      //   ),
      // );

      toast.success("Priority updated");
      return true;
    } catch (error: unknown) {
      toast.error("Failed to update priority", {
        description:
          getErrorMessage(error) || "Something went wrong. Please try again.",
      });
      return false;
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from("shopping_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;
      // No local state update needed here, realtime will handle it.
      // setItems(items.filter((item) => item.id !== itemId));

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
  };

  return {
    items,
    isLoading,
    addItem,
    toggleItemCompletion,
    updateItemPriority,
    deleteItem,
  };
}

// Hook for watch item operations
export function useWatchItems(initialItems: WatchItem[]) {
  const [items, setItems] = useState<WatchItem[]>(initialItems);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClientSupabaseClient();

  const handleRealtimeUpdate = useCallback((updatedItems: WatchItem[]) => {
    setItems(sortItemsByPriority(updatedItems));
  }, []);

  useEffect(() => {
    setItems(sortItemsByPriority(initialItems));
  }, [initialItems]);

  useEffect(() => {
    const channel: RealtimeChannel = supabase
      .channel("realtime-watch-items")
      .on<WatchItem>(
        "postgres_changes",
        { event: "*", schema: "public", table: "watch_items" },
        async (payload) => {
          // Refetch all items and let the handleRealtimeUpdate sort them
          const { data } = await supabase.from("watch_items").select("*");
          if (data) {
            handleRealtimeUpdate(data as WatchItem[]);
          }
        },
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          console.log("Subscribed to watch_items changes");
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          toast.error("Realtime connection error", {
            description:
              err?.message || "Could not connect to watch item updates.",
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, handleRealtimeUpdate]);

  const addItem = async (
    title: string,
    priority: TaskPriority,
    hours: string,
  ) => {
    if (!title.trim()) return;

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from("watch_items")
        .insert({
          title,
          completed: false,
          priority,
          estimated_hours: hours ? Number.parseFloat(hours) : null,
        })
        .select()
        .single();

      if (error) throw error;

      // No local state update needed here, realtime will handle it.
      // setItems([data, ...items]);

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
      setIsLoading(false);
    }
  };

  const toggleItemCompletion = async (itemId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from("watch_items")
        .update({ completed: !completed })
        .eq("id", itemId);

      if (error) throw error;
      // No local state update needed here, realtime will handle it.
      // setItems(
      //   items.map((item) =>
      //     item.id === itemId ? { ...item, completed: !completed } : item,
      //   ),
      // );
      return true;
    } catch (error: unknown) {
      toast.error("Failed to update item", {
        description:
          getErrorMessage(error) || "Something went wrong. Please try again.",
      });
      return false;
    }
  };

  const updateItemPriority = async (itemId: string, priority: TaskPriority) => {
    try {
      const { error } = await supabase
        .from("watch_items")
        .update({ priority })
        .eq("id", itemId);

      if (error) throw error;
      // No local state update needed here, realtime will handle it.
      // setItems(
      //   items.map((item) =>
      //     item.id === itemId ? { ...item, priority } : item,
      //   ),
      // );

      toast.success("Priority updated");
      return true;
    } catch (error: unknown) {
      toast.error("Failed to update priority", {
        description:
          getErrorMessage(error) || "Something went wrong. Please try again.",
      });
      return false;
    }
  };

  const updateItemHours = async (itemId: string, hoursStr: string) => {
    const hours = hoursStr ? Number.parseFloat(hoursStr) : null;

    try {
      const { error } = await supabase
        .from("watch_items")
        .update({ estimated_hours: hours })
        .eq("id", itemId);

      if (error) throw error;
      // No local state update needed here, realtime will handle it.
      // setItems(
      //   items.map((item) =>
      //     item.id === itemId ? { ...item, estimated_hours: hours } : item,
      //   ),
      // );

      toast.success("Estimated hours updated");
      return true;
    } catch (error: unknown) {
      toast.error("Failed to update hours", {
        description:
          getErrorMessage(error) || "Something went wrong. Please try again.",
      });
      return false;
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from("watch_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;
      // No local state update needed here, realtime will handle it.
      // setItems(items.filter((item) => item.id !== itemId));

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
  };

  return {
    items,
    isLoading,
    addItem,
    toggleItemCompletion,
    updateItemPriority,
    updateItemHours,
    deleteItem,
  };
}
