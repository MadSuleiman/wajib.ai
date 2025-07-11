"use client";

import React, { useState, useMemo } from "react";
import {
  CheckCircle2,
  Circle,
  Loader2,
  Plus,
  Trash2,
  Clock,
} from "lucide-react";

import { cn } from "@/lib/utils";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { Task, TaskPriority } from "@/types";
import { priorityIcons, priorityLabels } from "./list-utils";
import { useTasks } from "@/hooks/use-supabase";

interface TaskListProps {
  initialTasks: Task[];
}

export function TaskList({ initialTasks }: TaskListProps) {
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] =
    useState<TaskPriority>("medium");
  const [newTaskHours, setNewTaskHours] = useState<string>("");
  const [showCompleted, setShowCompleted] = useState(false);

  const {
    tasks,
    isLoading,
    addTask,
    toggleTaskCompletion,
    updateTaskPriority,
    updateTaskHours,
    deleteTask,
  } = useTasks(initialTasks);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await addTask(newTaskTitle, newTaskPriority, newTaskHours);
    if (success) {
      setNewTaskTitle("");
      setNewTaskPriority("medium");
      setNewTaskHours("");
    }
  };

  const filteredTasks = useMemo(() => {
    if (showCompleted) {
      return tasks;
    }
    return tasks.filter((task) => !task.completed);
  }, [tasks, showCompleted]);

  return (
    <Card>
      <CardHeader className="p-4 pb-0">
        <div className="flex flex-col gap-4">
          <form onSubmit={handleAddTask} className="grid gap-4 sm:grid-cols-4">
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
                onValueChange={(value: TaskPriority) =>
                  setNewTaskPriority(value)
                }
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
          <div className="flex items-center justify-end space-x-2 py-2">
            <Switch
              id="show-completed-tasks"
              checked={showCompleted}
              onCheckedChange={setShowCompleted}
            />
            <Label htmlFor="show-completed-tasks">Show completed tasks</Label>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {filteredTasks.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {tasks.length === 0
              ? "No tasks yet. Add your first one above."
              : "No tasks match your current filter."}
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
                {filteredTasks.map((task) => (
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
        Showing {filteredTasks.length} of {tasks.length} tasks. (
        {tasks.filter((task) => task.completed).length} completed)
      </CardFooter>
    </Card>
  );
}
