import type React from "react";
import { useCallback, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { priorityIcons, priorityLabels } from "@/components/list-utils";
import type { RecurrenceType, TaskPriority } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { recurrenceOptions } from "./constants";
import type { CategoryOption } from "./types";

type NewItemCardProps = {
  onAddItem: (input: {
    title: string;
    priority: TaskPriority;
    hours: string;
    category: string;
    recurrenceType: RecurrenceType;
    recurrenceInterval: number;
  }) => Promise<boolean>;
  isSubmitting: boolean;
  categoryOptions: CategoryOption[];
  defaultCategory: string;
};

export function NewItemCard({
  onAddItem,
  isSubmitting,
  categoryOptions,
  defaultCategory,
}: NewItemCardProps) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [hours, setHours] = useState("");
  const [categorySelection, setCategorySelection] = useState(defaultCategory);
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>("none");
  const [recurrenceInterval, setRecurrenceInterval] = useState("1");
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);

  const resolvedCategory = useMemo(() => {
    if (!categoryOptions.length) {
      return defaultCategory;
    }
    const exists = categoryOptions.some(
      (option) => option.value === categorySelection,
    );
    return exists ? categorySelection : defaultCategory;
  }, [categoryOptions, categorySelection, defaultCategory]);

  const selectedCategoryLabel = useMemo(() => {
    return (
      categoryOptions.find((option) => option.value === resolvedCategory)
        ?.label ?? "Select category"
    );
  }, [categoryOptions, resolvedCategory]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      const parsedInterval = Number.parseInt(recurrenceInterval, 10);
      const normalizedInterval = Number.isNaN(parsedInterval)
        ? 1
        : Math.max(1, parsedInterval);

      const success = await onAddItem({
        title,
        priority,
        hours,
        category: resolvedCategory,
        recurrenceType,
        recurrenceInterval: normalizedInterval,
      });

      if (success) {
        setTitle("");
        setPriority("medium");
        setHours("");
        setCategorySelection(defaultCategory);
        setRecurrenceType("none");
        setRecurrenceInterval("1");
      }
    },
    [
      resolvedCategory,
      defaultCategory,
      hours,
      onAddItem,
      priority,
      recurrenceInterval,
      recurrenceType,
      title,
    ],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Capture an item</CardTitle>
        <CardDescription>
          Track everything in one place and label items with a category that
          makes sense to you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3 lg:space-y-2">
          <div className="space-y-2">
            <Label htmlFor="item-title">Title</Label>
            <Input
              id="item-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ex. Renew passport, pick up groceries, watch The Office"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 md:gap-2">
            <div className="space-y-2">
              <Label htmlFor="item-category">Category</Label>
              <Popover
                open={categoryPopoverOpen}
                onOpenChange={setCategoryPopoverOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    id="item-category"
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={categoryPopoverOpen}
                    className="w-full justify-between"
                    disabled={!categoryOptions.length}
                  >
                    {selectedCategoryLabel}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[240px] p-0">
                  <Command>
                    <CommandInput
                      placeholder="Search category..."
                      className="h-9"
                    />
                    <CommandList>
                      <CommandEmpty>No category found.</CommandEmpty>
                      <CommandGroup>
                        {categoryOptions.map((option) => (
                          <CommandItem
                            key={option.value}
                            value={option.value}
                            onSelect={(currentValue) => {
                              setCategorySelection(currentValue);
                              setCategoryPopoverOpen(false);
                            }}
                          >
                            {option.label}
                            <Check
                              className={cn(
                                "ml-auto h-4 w-4",
                                resolvedCategory === option.value
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={priority}
                onValueChange={(value: TaskPriority) => setPriority(value)}
              >
                <SelectTrigger className="w-full capitalize">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(priorityLabels) as TaskPriority[]).map(
                    (option) => (
                      <SelectItem key={option} value={option}>
                        <div className="flex items-center gap-2">
                          {priorityIcons[option]}
                          <span>{priorityLabels[option]}</span>
                        </div>
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:gap-2">
            <div className="space-y-2">
              <Label>Recurrence</Label>
              <Select
                value={recurrenceType}
                onValueChange={(value: RecurrenceType) =>
                  setRecurrenceType(value)
                }
              >
                <SelectTrigger className="w-full capitalize">
                  <SelectValue placeholder="Does not repeat" />
                </SelectTrigger>
                <SelectContent>
                  {recurrenceOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {
                  recurrenceOptions.find(
                    (option) => option.value === recurrenceType,
                  )?.description
                }
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-recurrence-interval">Every</Label>
              <Input
                id="item-recurrence-interval"
                type="number"
                min={1}
                value={recurrenceInterval}
                onChange={(event) => setRecurrenceInterval(event.target.value)}
                disabled={recurrenceType === "none"}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:gap-2">
            <div className="space-y-2">
              <Label htmlFor="item-hours">Estimated hours</Label>
              <Input
                id="item-hours"
                inputMode="decimal"
                value={hours}
                onChange={(event) => setHours(event.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="flex items-end">
              <Button
                type="submit"
                disabled={!title.trim() || isSubmitting}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Add
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
