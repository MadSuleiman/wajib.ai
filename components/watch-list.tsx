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
import type { WatchItem, TaskPriority } from "@/types";
import { priorityIcons, priorityLabels } from "./list-utils";
import { useWatchItems } from "@/hooks/use-supabase";

interface WatchListProps {
  initialItems: WatchItem[];
}

export function WatchList({ initialItems }: WatchListProps) {
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemPriority, setNewItemPriority] =
    useState<TaskPriority>("medium");
  const [newItemHours, setNewItemHours] = useState<string>("");
  const [showCompleted, setShowCompleted] = useState(true); // "completed" means "watched" here

  const {
    items,
    isLoading,
    addItem,
    toggleItemCompletion,
    updateItemPriority,
    updateItemHours,
    deleteItem,
  } = useWatchItems(initialItems);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await addItem(newItemTitle, newItemPriority, newItemHours);
    if (success) {
      setNewItemTitle("");
      setNewItemPriority("medium");
      setNewItemHours("");
    }
  };

  const filteredItems = useMemo(() => {
    if (showCompleted) {
      return items;
    }
    return items.filter((item) => !item.completed);
  }, [items, showCompleted]);

  return (
    <Card>
      <CardHeader className="p-4 pb-0">
        <div className="flex flex-col gap-4">
          <form onSubmit={handleAddItem} className="grid gap-4 sm:grid-cols-4">
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
                onValueChange={(value: TaskPriority) =>
                  setNewItemPriority(value)
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
          <div className="flex items-center justify-end space-x-2 py-2">
            <Switch
              id="show-watched-items"
              checked={showCompleted}
              onCheckedChange={setShowCompleted}
            />
            <Label htmlFor="show-watched-items">Show watched items</Label>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {filteredItems.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {items.length === 0
              ? "No items yet. Add your first one above."
              : "No items match your current filter."}
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
                {filteredItems.map((item) => (
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
        Showing {filteredItems.length} of {items.length} items. (
        {items.filter((item) => item.completed).length} watched)
      </CardFooter>
    </Card>
  );
}
