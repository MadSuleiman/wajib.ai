"use client";

import React, { useState, useMemo } from "react";
import { CheckCircle2, Circle, Loader2, Plus, Trash2 } from "lucide-react";

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
import type { ShoppingItem, TaskPriority } from "@/types";
import { priorityIcons, priorityLabels } from "./list-utils";
import { useShoppingItems } from "@/hooks/use-supabase";

interface ShoppingListProps {
  initialItems: ShoppingItem[];
}

export function ShoppingList({ initialItems }: ShoppingListProps) {
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemPriority, setNewItemPriority] =
    useState<TaskPriority>("medium");
  const [showCompleted, setShowCompleted] = useState(true);

  const {
    items,
    isLoading,
    addItem,
    toggleItemCompletion,
    updateItemPriority,
    deleteItem,
  } = useShoppingItems(initialItems);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await addItem(newItemTitle, newItemPriority);
    if (success) {
      setNewItemTitle("");
      setNewItemPriority("medium");
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
          <form onSubmit={handleAddItem} className="grid gap-4 sm:grid-cols-3">
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
              id="show-completed-shopping"
              checked={showCompleted}
              onCheckedChange={setShowCompleted}
            />
            <Label htmlFor="show-completed-shopping">Show completed items</Label>
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
                  <TableHead>Item</TableHead>
                  <TableHead className="w-[120px]">Priority</TableHead>
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
        Showing {filteredItems.length} of {items.length} items. (
        {items.filter((item) => item.completed).length} completed)
      </CardFooter>
    </Card>
  );
}
