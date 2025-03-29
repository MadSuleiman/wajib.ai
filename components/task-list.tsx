"use client";

import type React from "react";

import { useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Circle,
  Loader2,
  Plus,
  Trash2,
  Clock,
  ArrowUp,
  Minus,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { createClientSupabaseClient } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Task, ShoppingItem, WatchItem, TaskPriority } from "@/types";

export interface BaseItem {
  id: string;
  title: string;
  completed: boolean;
  created_at: string;
}

interface TaskListProps {
  initialTasks: Task[];
}

interface ShoppingListProps {
  initialItems: ShoppingItem[];
}

interface WatchListProps {
  initialItems: WatchItem[];
}

const priorityIcons = {
  low: <Minus className="h-4 w-4 text-muted-foreground" />,
  medium: <Minus className="h-4 w-4 text-amber-500" />,
  high: <ArrowUp className="h-4 w-4 text-destructive" />,
};

const priorityLabels = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

interface ErrorWithMessage {
  message: string;
}

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as Record<string, unknown>).message === "string"
  );
}

function toErrorWithMessage(error: unknown): ErrorWithMessage {
  if (isErrorWithMessage(error)) return error;
  try {
    return new Error(JSON.stringify(error));
  } catch {
    // fallback in case there's an error stringifying the error
    return new Error(String(error));
  }
}

function getErrorMessage(error: unknown): string {
  return toErrorWithMessage(error).message;
}

export function TaskList({ initialTasks }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] =
    useState<TaskPriority>("medium");
  const [newTaskHours, setNewTaskHours] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClientSupabaseClient();

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newTaskTitle.trim()) return;

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          title: newTaskTitle,
          completed: false,
          priority: newTaskPriority,
          estimated_hours: newTaskHours
            ? Number.parseFloat(newTaskHours)
            : null,
        })
        .select()
        .single();

      if (error) throw error;

      setTasks([data, ...tasks]);
      setNewTaskTitle("");
      setNewTaskPriority("medium");
      setNewTaskHours("");

      toast.success("Task added", {
        description: "Your task has been added successfully.",
      });
    } catch (error: unknown) {
      toast.error("Failed to add task", {
        description:
          getErrorMessage(error) || "Something went wrong. Please try again.",
      });
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

      setTasks(
        tasks.map((task) =>
          task.id === taskId ? { ...task, completed: !completed } : task,
        ),
      );
    } catch (error: unknown) {
      toast.error("Failed to update task", {
        description:
          getErrorMessage(error) || "Something went wrong. Please try again.",
      });
    }
  };

  const updateTaskPriority = async (taskId: string, priority: TaskPriority) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ priority })
        .eq("id", taskId);

      if (error) throw error;

      setTasks(
        tasks.map((task) =>
          task.id === taskId ? { ...task, priority } : task,
        ),
      );

      toast.success("Priority updated");
    } catch (error: unknown) {
      toast.error("Failed to update priority", {
        description:
          getErrorMessage(error) || "Something went wrong. Please try again.",
      });
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

      setTasks(
        tasks.map((task) =>
          task.id === taskId ? { ...task, estimated_hours: hours } : task,
        ),
      );

      toast.success("Estimated hours updated");
    } catch (error: unknown) {
      toast.error("Failed to update hours", {
        description:
          getErrorMessage(error) || "Something went wrong. Please try again.",
      });
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);

      if (error) throw error;

      setTasks(tasks.filter((task) => task.id !== taskId));

      toast.success("Task deleted", {
        description: "Your task has been deleted successfully.",
      });
    } catch (error: unknown) {
      toast.error("Failed to delete task", {
        description:
          getErrorMessage(error) || "Something went wrong. Please try again.",
      });
    }
  };

  return (
    <Card>
      <CardHeader className="p-4 pb-0">
        <form onSubmit={addTask} className="grid gap-4 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <Input
              placeholder="Add a new task..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div>
            <Select
              value={newTaskPriority}
              onValueChange={(value: TaskPriority) => setNewTaskPriority(value)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Hours"
              type="number"
              min="0.1"
              step="0.1"
              value={newTaskHours}
              onChange={(e) => setNewTaskHours(e.target.value)}
              disabled={isLoading}
            />
            <Button type="submit" size="icon" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </CardHeader>
      <CardContent className="p-4">
        {tasks.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No tasks yet. Add your first one above.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Status</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead className="w-[120px]">Priority</TableHead>
                  <TableHead className="w-[100px]">Hours</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow
                    key={task.id}
                    className={cn(task.completed && "bg-muted")}
                  >
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() =>
                          toggleTaskCompletion(task.id, task.completed)
                        }
                      >
                        {task.completed ? (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                        <span className="sr-only">
                          {task.completed
                            ? "Mark as incomplete"
                            : "Mark as complete"}
                        </span>
                      </Button>
                    </TableCell>
                    <TableCell
                      className={cn(
                        "font-medium",
                        task.completed && "text-muted-foreground line-through",
                      )}
                    >
                      {task.title}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={task.priority}
                        onValueChange={(value: TaskPriority) =>
                          updateTaskPriority(task.id, value)
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue>
                            <div className="flex items-center gap-2">
                              {priorityIcons[task.priority]}
                              <span>{priorityLabels[task.priority]}</span>
                            </div>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">
                            <div className="flex items-center gap-2">
                              {priorityIcons.low}
                              <span>Low</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="medium">
                            <div className="flex items-center gap-2">
                              {priorityIcons.medium}
                              <span>Medium</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="high">
                            <div className="flex items-center gap-2">
                              {priorityIcons.high}
                              <span>High</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <Input
                          className="h-8 w-16"
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={task.estimated_hours || ""}
                          onChange={(e) =>
                            updateTaskHours(task.id, e.target.value)
                          }
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteTask(task.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete task</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <CardFooter className="border-t p-4 text-sm text-muted-foreground">
        {tasks.filter((task) => task.completed).length} of {tasks.length}{" "}
        completed
      </CardFooter>
    </Card>
  );
}

export function ShoppingList({ initialItems }: ShoppingListProps) {
  const [items, setItems] = useState<ShoppingItem[]>(initialItems);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemPriority, setNewItemPriority] =
    useState<TaskPriority>("medium");
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClientSupabaseClient();

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newItemTitle.trim()) return;

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from("shopping_items")
        .insert({
          title: newItemTitle,
          completed: false,
          priority: newItemPriority,
        })
        .select()
        .single();

      if (error) throw error;

      setItems([data, ...items]);
      setNewItemTitle("");
      setNewItemPriority("medium");

      toast.success("Item added", {
        description: "Your shopping item has been added successfully.",
      });
    } catch (error: unknown) {
      toast.error("Failed to add item", {
        description:
          getErrorMessage(error) || "Something went wrong. Please try again.",
      });
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

      setItems(
        items.map((item) =>
          item.id === itemId ? { ...item, completed: !completed } : item,
        ),
      );
    } catch (error: unknown) {
      toast.error("Failed to update item", {
        description:
          getErrorMessage(error) || "Something went wrong. Please try again.",
      });
    }
  };

  const updateItemPriority = async (itemId: string, priority: TaskPriority) => {
    try {
      const { error } = await supabase
        .from("shopping_items")
        .update({ priority })
        .eq("id", itemId);

      if (error) throw error;

      setItems(
        items.map((item) =>
          item.id === itemId ? { ...item, priority } : item,
        ),
      );

      toast.success("Priority updated");
    } catch (error: unknown) {
      toast.error("Failed to update priority", {
        description:
          getErrorMessage(error) || "Something went wrong. Please try again.",
      });
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from("shopping_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;

      setItems(items.filter((item) => item.id !== itemId));

      toast.success("Item deleted", {
        description: "Your shopping item has been deleted successfully.",
      });
    } catch (error: unknown) {
      toast.error("Failed to delete item", {
        description:
          getErrorMessage(error) || "Something went wrong. Please try again.",
      });
    }
  };

  return (
    <Card>
      <CardHeader className="p-4 pb-0">
        <form onSubmit={addItem} className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Input
              placeholder="Add a shopping item..."
              value={newItemTitle}
              onChange={(e) => setNewItemTitle(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="flex gap-2">
            <Select
              value={newItemPriority}
              onValueChange={(value: TaskPriority) => setNewItemPriority(value)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" size="icon" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </CardHeader>
      <CardContent className="p-4">
        {items.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No items yet. Add your first one above.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Status</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="w-[120px]">Priority</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow
                    key={item.id}
                    className={cn(item.completed && "bg-muted")}
                  >
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() =>
                          toggleItemCompletion(item.id, item.completed)
                        }
                      >
                        {item.completed ? (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                        <span className="sr-only">
                          {item.completed
                            ? "Mark as incomplete"
                            : "Mark as complete"}
                        </span>
                      </Button>
                    </TableCell>
                    <TableCell
                      className={cn(
                        "font-medium",
                        item.completed && "text-muted-foreground line-through",
                      )}
                    >
                      {item.title}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={item.priority}
                        onValueChange={(value: TaskPriority) =>
                          updateItemPriority(item.id, value)
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue>
                            <div className="flex items-center gap-2">
                              {priorityIcons[item.priority]}
                              <span>{priorityLabels[item.priority]}</span>
                            </div>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">
                            <div className="flex items-center gap-2">
                              {priorityIcons.low}
                              <span>Low</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="medium">
                            <div className="flex items-center gap-2">
                              {priorityIcons.medium}
                              <span>Medium</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="high">
                            <div className="flex items-center gap-2">
                              {priorityIcons.high}
                              <span>High</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete item</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <CardFooter className="border-t p-4 text-sm text-muted-foreground">
        {items.filter((item) => item.completed).length} of {items.length}{" "}
        completed
      </CardFooter>
    </Card>
  );
}

export function WatchList({ initialItems }: WatchListProps) {
  const [items, setItems] = useState<WatchItem[]>(initialItems);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemPriority, setNewItemPriority] =
    useState<TaskPriority>("medium");
  const [newItemHours, setNewItemHours] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClientSupabaseClient();

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newItemTitle.trim()) return;

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from("watch_items")
        .insert({
          title: newItemTitle,
          completed: false,
          priority: newItemPriority,
          estimated_hours: newItemHours
            ? Number.parseFloat(newItemHours)
            : null,
        })
        .select()
        .single();

      if (error) throw error;

      setItems([data, ...items]);
      setNewItemTitle("");
      setNewItemPriority("medium");
      setNewItemHours("");

      toast.success("Item added", {
        description: "Your watch item has been added successfully.",
      });
    } catch (error: unknown) {
      toast.error("Failed to add item", {
        description:
          getErrorMessage(error) || "Something went wrong. Please try again.",
      });
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

      setItems(
        items.map((item) =>
          item.id === itemId ? { ...item, completed: !completed } : item,
        ),
      );
    } catch (error: unknown) {
      toast.error("Failed to update item", {
        description:
          getErrorMessage(error) || "Something went wrong. Please try again.",
      });
    }
  };

  const updateItemPriority = async (itemId: string, priority: TaskPriority) => {
    try {
      const { error } = await supabase
        .from("watch_items")
        .update({ priority })
        .eq("id", itemId);

      if (error) throw error;

      setItems(
        items.map((item) =>
          item.id === itemId ? { ...item, priority } : item,
        ),
      );

      toast.success("Priority updated");
    } catch (error: unknown) {
      toast.error("Failed to update priority", {
        description:
          getErrorMessage(error) || "Something went wrong. Please try again.",
      });
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

      setItems(
        items.map((item) =>
          item.id === itemId ? { ...item, estimated_hours: hours } : item,
        ),
      );

      toast.success("Estimated hours updated");
    } catch (error: unknown) {
      toast.error("Failed to update hours", {
        description:
          getErrorMessage(error) || "Something went wrong. Please try again.",
      });
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from("watch_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;

      setItems(items.filter((item) => item.id !== itemId));

      toast.success("Item deleted", {
        description: "Your watch item has been deleted successfully.",
      });
    } catch (error: unknown) {
      toast.error("Failed to delete item", {
        description:
          getErrorMessage(error) || "Something went wrong. Please try again.",
      });
    }
  };

  return (
    <Card>
      <CardHeader className="p-4 pb-0">
        <form onSubmit={addItem} className="grid gap-4 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <Input
              placeholder="Add a movie or show to watch..."
              value={newItemTitle}
              onChange={(e) => setNewItemTitle(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div>
            <Select
              value={newItemPriority}
              onValueChange={(value: TaskPriority) => setNewItemPriority(value)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Hours"
              type="number"
              min="0.1"
              step="0.1"
              value={newItemHours}
              onChange={(e) => setNewItemHours(e.target.value)}
              disabled={isLoading}
            />
            <Button type="submit" size="icon" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </CardHeader>
      <CardContent className="p-4">
        {items.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No items yet. Add your first one above.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Status</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-[120px]">Priority</TableHead>
                  <TableHead className="w-[100px]">Hours</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow
                    key={item.id}
                    className={cn(item.completed && "bg-muted")}
                  >
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() =>
                          toggleItemCompletion(item.id, item.completed)
                        }
                      >
                        {item.completed ? (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                        <span className="sr-only">
                          {item.completed
                            ? "Mark as unwatched"
                            : "Mark as watched"}
                        </span>
                      </Button>
                    </TableCell>
                    <TableCell
                      className={cn(
                        "font-medium",
                        item.completed && "text-muted-foreground line-through",
                      )}
                    >
                      {item.title}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={item.priority}
                        onValueChange={(value: TaskPriority) =>
                          updateItemPriority(item.id, value)
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue>
                            <div className="flex items-center gap-2">
                              {priorityIcons[item.priority]}
                              <span>{priorityLabels[item.priority]}</span>
                            </div>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">
                            <div className="flex items-center gap-2">
                              {priorityIcons.low}
                              <span>Low</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="medium">
                            <div className="flex items-center gap-2">
                              {priorityIcons.medium}
                              <span>Medium</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="high">
                            <div className="flex items-center gap-2">
                              {priorityIcons.high}
                              <span>High</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <Input
                          className="h-8 w-16"
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={item.estimated_hours || ""}
                          onChange={(e) =>
                            updateItemHours(item.id, e.target.value)
                          }
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete item</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <CardFooter className="border-t p-4 text-sm text-muted-foreground">
        {items.filter((item) => item.completed).length} of {items.length}{" "}
        completed
      </CardFooter>
    </Card>
  );
}
