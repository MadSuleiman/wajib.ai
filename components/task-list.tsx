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
import type { Task, TaskPriority } from "@/types";
import { priorityIcons, priorityLabels, getErrorMessage } from "./list-utils";

interface TaskListProps {
  initialTasks: Task[];
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
