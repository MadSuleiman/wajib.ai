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
import type { WatchItem, TaskPriority } from "@/types";
import { priorityIcons, priorityLabels, getErrorMessage } from "./list-utils";

interface WatchListProps {
  initialItems: WatchItem[];
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
