import type React from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import {
  priorityIcons,
  priorityLabels,
  urgencyIcons,
  urgencyLabels,
} from "@/components/dashboard/list-utils";
import type { RecurrenceType, TaskPriority, TaskUrgency } from "@/types";
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

type ParsedCsvRow = {
  lineNumber: number;
  rawLine: string;
  values: Record<string, string>;
};

const headerAliases: Record<string, string> = {
  title: "title",
  priority: "priority",
  urgency: "urgency",
  estimated_hours: "estimated_hours",
  estimated_hour: "estimated_hours",
  hours: "estimated_hours",
  category: "category",
  recurrence_type: "recurrence_type",
  recurrence_interval: "recurrence_interval",
};

const taskColumnOrder = [
  "title",
  "priority",
  "urgency",
  "estimated_hours",
  "category",
];

const routineColumnOrder = [
  "title",
  "priority",
  "urgency",
  "estimated_hours",
  "category",
  "recurrence_type",
  "recurrence_interval",
];

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function parseCsvLine(line: string) {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      const nextChar = line[index + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current);
  return result;
}

function parseCsvText(text: string, variant: "task" | "routine") {
  const trimmed = text.trim();
  if (!trimmed) {
    return { rows: [], preview: "", error: "CSV file is empty." };
  }

  const rawLines = trimmed.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (!rawLines.length) {
    return { rows: [], preview: "", error: "CSV file is empty." };
  }

  const parsedRows = rawLines.map(parseCsvLine);
  const normalizedHeaders = parsedRows[0].map(
    (cell) => headerAliases[normalizeHeader(cell)] ?? "",
  );
  const hasHeader = normalizedHeaders.some((header) =>
    taskColumnOrder.includes(header),
  );

  const dataRows = hasHeader ? parsedRows.slice(1) : parsedRows;
  const lineOffset = hasHeader ? 2 : 1;
  const columnOrder =
    variant === "routine" ? routineColumnOrder : taskColumnOrder;
  const headerMap = hasHeader ? normalizedHeaders : columnOrder;

  const rows: ParsedCsvRow[] = dataRows.map((row, index) => {
    const values: Record<string, string> = {};
    row.forEach((value, cellIndex) => {
      const header = headerMap[cellIndex];
      if (header) {
        values[header] = value.trim();
      }
    });
    const rawLine = rawLines[index + (hasHeader ? 1 : 0)] ?? "";
    return {
      lineNumber: index + lineOffset,
      rawLine,
      values,
    };
  });

  const preview = rows
    .map((row) => `${row.lineNumber}. ${row.rawLine}`)
    .join("\n");

  return { rows, preview, error: "" };
}

function normalizePriority(value: string) {
  const normalized = value.trim().toLowerCase() as TaskPriority;
  return normalized === "low" || normalized === "high" ? normalized : "medium";
}

function normalizeUrgency(value: string) {
  const normalized = value.trim().toLowerCase() as TaskUrgency;
  return normalized === "low" || normalized === "high" ? normalized : "medium";
}

function normalizeRecurrenceType(value: string): RecurrenceType {
  const normalized = value.trim().toLowerCase() as RecurrenceType;
  if (
    normalized === "daily" ||
    normalized === "weekly" ||
    normalized === "monthly" ||
    normalized === "yearly"
  ) {
    return normalized;
  }
  return "daily";
}

type NewItemCardProps = {
  variant: "task" | "routine";
  onAddItem: (input: {
    title: string;
    priority: TaskPriority;
    urgency: TaskUrgency;
    hours: string;
    category: string;
    recurrenceType: RecurrenceType;
    recurrenceInterval: number;
  }) => Promise<boolean>;
  onBulkAddItem?: (input: {
    title: string;
    priority: TaskPriority;
    urgency: TaskUrgency;
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
  variant,
  onAddItem,
  onBulkAddItem,
  isSubmitting,
  categoryOptions,
  defaultCategory,
}: NewItemCardProps) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [urgency, setUrgency] = useState<TaskUrgency>("medium");
  const [hours, setHours] = useState("");
  const [categorySelection, setCategorySelection] = useState(defaultCategory);
  const isRoutine = variant === "routine";
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importRows, setImportRows] = useState<ParsedCsvRow[]>([]);
  const [importPreview, setImportPreview] = useState("");
  const [importError, setImportError] = useState("");
  const [importFileName, setImportFileName] = useState("");
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>(
    isRoutine ? "daily" : "none",
  );
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

      const effectiveRecurrenceType: RecurrenceType = isRoutine
        ? recurrenceType
        : "none";
      const effectiveInterval = isRoutine ? normalizedInterval : 1;

      const success = await onAddItem({
        title,
        priority,
        urgency,
        hours,
        category: resolvedCategory,
        recurrenceType: effectiveRecurrenceType,
        recurrenceInterval: effectiveInterval,
      });

      if (success) {
        setTitle("");
        setPriority("medium");
        setUrgency("medium");
        setHours("");
        setCategorySelection(defaultCategory);
        setRecurrenceType(isRoutine ? "daily" : "none");
        setRecurrenceInterval("1");
      }
    },
    [
      resolvedCategory,
      defaultCategory,
      hours,
      onAddItem,
      priority,
      urgency,
      recurrenceInterval,
      recurrenceType,
      title,
      isRoutine,
    ],
  );

  const resetImportState = useCallback(() => {
    setImportRows([]);
    setImportPreview("");
    setImportError("");
    setImportFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleImportFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result ?? "");
        const { rows, preview, error } = parseCsvText(text, variant);
        setImportRows(rows);
        setImportPreview(preview);
        setImportError(error);
        setImportFileName(file.name);
      };
      reader.onerror = () => {
        setImportError("Failed to read the CSV file.");
      };
      reader.readAsText(file);
    },
    [variant],
  );

  const handleBulkImport = useCallback(async () => {
    if (!importRows.length) {
      toast.error("No CSV rows to import yet.");
      return;
    }

    const addHandler = onBulkAddItem ?? onAddItem;

    setIsBulkImporting(true);
    let successCount = 0;
    let failureCount = 0;

    for (const row of importRows) {
      const title = (row.values.title ?? "").trim();
      if (!title) {
        failureCount += 1;
        continue;
      }

      const priority = normalizePriority(row.values.priority ?? "medium");
      const urgency = normalizeUrgency(row.values.urgency ?? "medium");
      const hours = row.values.estimated_hours ?? "";
      const category = row.values.category?.trim() || defaultCategory;

      const recurrence = isRoutine
        ? normalizeRecurrenceType(row.values.recurrence_type ?? "daily")
        : "none";
      const intervalValue = Number.parseInt(
        row.values.recurrence_interval ?? "1",
        10,
      );
      const recurrenceIntervalValue =
        Number.isNaN(intervalValue) || intervalValue < 1 ? 1 : intervalValue;

      const success = await addHandler({
        title,
        priority,
        urgency,
        hours,
        category,
        recurrenceType: recurrence,
        recurrenceInterval: isRoutine ? recurrenceIntervalValue : 1,
      });

      if (success) {
        successCount += 1;
      } else {
        failureCount += 1;
      }
    }

    setIsBulkImporting(false);
    resetImportState();

    if (successCount) {
      toast.success(
        `Imported ${successCount} ${isRoutine ? "routines" : "tasks"}.`,
      );
    }
    if (failureCount) {
      toast.error(
        `Skipped ${failureCount} rows. Check for missing titles or invalid data.`,
      );
    }
  }, [
    defaultCategory,
    importRows,
    isRoutine,
    onAddItem,
    onBulkAddItem,
    resetImportState,
  ]);

  const recurrenceChoices = useMemo(() => {
    return isRoutine
      ? recurrenceOptions.filter((option) => option.value !== "none")
      : [];
  }, [isRoutine]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>
              {isRoutine ? "Create routine" : "Create task"}
            </CardTitle>
            <CardDescription>
              {isRoutine
                ? "Set a cadence to maintain habits and recurring responsibilities."
                : "Track one-off work with categories and priorities."}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleImportFileChange}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting || isBulkImporting}
            >
              Import CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {importFileName ? (
          <div className="mb-4 space-y-2 rounded-md border border-dashed p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">{importFileName}</p>
                <p className="text-xs text-muted-foreground">
                  {importRows.length
                    ? `Ready to import ${importRows.length} rows.`
                    : "No rows detected yet."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleBulkImport}
                  disabled={
                    isSubmitting || isBulkImporting || !importRows.length
                  }
                >
                  {isBulkImporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    "Run import"
                  )}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={resetImportState}
                >
                  Clear
                </Button>
              </div>
            </div>
            {importError ? (
              <p className="text-xs text-destructive">{importError}</p>
            ) : null}
            {importPreview ? (
              <pre className="max-h-40 overflow-auto rounded-md bg-muted px-3 py-2 text-xs">
                {importPreview}
              </pre>
            ) : null}
          </div>
        ) : null}
        <form onSubmit={handleSubmit} className="space-y-3 lg:space-y-2">
          <div className="space-y-2">
            <Label htmlFor="item-title">Title</Label>
            <Input
              id="item-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={
                isRoutine
                  ? "Ex. Morning workout, weekly review, call parents"
                  : "Ex. Renew passport, pick up groceries, watch The Office"
              }
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
                <PopoverContent className="w-60 p-0">
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
            <div className="space-y-2">
              <Label>Urgency</Label>
              <Select
                value={urgency}
                onValueChange={(value: TaskUrgency) => setUrgency(value)}
              >
                <SelectTrigger className="w-full capitalize">
                  <SelectValue placeholder="Select urgency" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(urgencyLabels) as TaskUrgency[]).map(
                    (option) => (
                      <SelectItem key={option} value={option}>
                        <div className="flex items-center gap-2">
                          {urgencyIcons[option]}
                          <span>{urgencyLabels[option]}</span>
                        </div>
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isRoutine ? (
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
                    <SelectValue placeholder="Choose cadence" />
                  </SelectTrigger>
                  <SelectContent>
                    {recurrenceChoices.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {
                    recurrenceChoices.find(
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
                  onChange={(event) =>
                    setRecurrenceInterval(event.target.value)
                  }
                />
              </div>
            </div>
          ) : null}

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
                disabled={!title.trim() || isSubmitting || isBulkImporting}
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
                    {isRoutine ? "Add routine" : "Add task"}
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
