"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type Dispatch,
  type SetStateAction,
} from "react";

import type { ListItem, TaskPriority, TaskUrgency } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CategoryOption } from "./types";
import {
  priorityIcons,
  priorityLabels,
  urgencyIcons,
  urgencyLabels,
} from "@/components/dashboard/list-utils";

interface TaskEditorProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  item: ListItem | null;
  categoryOptions: CategoryOption[];
  onSave: (
    itemId: string,
    updates: {
      title?: string;
      priority?: TaskPriority;
      urgency?: TaskUrgency;
      hours?: string | null;
      category?: string;
    },
  ) => Promise<boolean>;
  isMobile: boolean;
}

interface FormState {
  title: string;
  category: string;
  priority: TaskPriority;
  urgency: TaskUrgency;
  hours: string;
}

const getInitialState = (item: ListItem | null): FormState => ({
  title: item?.title ?? "",
  category: item?.category ?? "task",
  priority: item?.priority ?? "medium",
  urgency: item?.urgency ?? "medium",
  hours:
    typeof item?.estimated_hours === "number"
      ? item.estimated_hours.toString()
      : "",
});

function TaskEditorForm({
  item,
  formState,
  setFormState,
  onSubmit,
  isSaving,
  categoryOptions,
}: {
  item: ListItem | null;
  formState: FormState;
  setFormState: Dispatch<SetStateAction<FormState>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isSaving: boolean;
  categoryOptions: CategoryOption[];
}) {
  const canEdit = Boolean(item);

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="task-title">
            Title
          </label>
          <Input
            id="task-title"
            value={formState.title}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, title: event.target.value }))
            }
            placeholder="What do you need to get done?"
            required
            disabled={!canEdit}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <Select
              value={formState.category}
              onValueChange={(value) =>
                setFormState((prev) => ({ ...prev, category: value }))
              }
              disabled={!canEdit}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Priority</label>
            <Select
              value={formState.priority}
              onValueChange={(value: TaskPriority) =>
                setFormState((prev) => ({ ...prev, priority: value }))
              }
              disabled={!canEdit}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(priorityLabels) as TaskPriority[]).map(
                  (priority) => (
                    <SelectItem key={priority} value={priority}>
                      <div className="flex items-center gap-2">
                        {priorityIcons[priority]}
                        {priorityLabels[priority]}
                      </div>
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Urgency</label>
            <Select
              value={formState.urgency}
              onValueChange={(value: TaskUrgency) =>
                setFormState((prev) => ({ ...prev, urgency: value }))
              }
              disabled={!canEdit}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select urgency" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(urgencyLabels) as TaskUrgency[]).map(
                  (urgency) => (
                    <SelectItem key={urgency} value={urgency}>
                      <div className="flex items-center gap-2">
                        {urgencyIcons[urgency]}
                        {urgencyLabels[urgency]}
                      </div>
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Estimated hours</label>
            <Input
              type="number"
              min="0"
              step="0.25"
              value={formState.hours}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, hours: event.target.value }))
              }
              placeholder="e.g. 2.5"
              disabled={!canEdit}
            />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2 md:flex-row md:justify-end">
        <Button type="submit" disabled={!canEdit || isSaving}>
          {isSaving ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

export function TaskEditor({
  isOpen,
  onOpenChange,
  item,
  categoryOptions,
  onSave,
  isMobile,
}: TaskEditorProps) {
  const [formState, setFormState] = useState<FormState>(() =>
    getInitialState(item),
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (item) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- rehydrate form values when switching tasks
      setFormState(getInitialState(item));
    }
  }, [item]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!item) return;
      if (!formState.title.trim()) {
        return;
      }
      setIsSaving(true);
      const updates: Parameters<TaskEditorProps["onSave"]>[1] = {
        title: formState.title,
        category: formState.category,
        priority: formState.priority,
        urgency: formState.urgency,
        hours: formState.hours,
      };

      const success = await onSave(item.id, updates);
      setIsSaving(false);
      if (success) {
        onOpenChange(false);
      }
    },
    [formState, item, onOpenChange, onSave],
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onOpenChange} direction="bottom">
        <DrawerContent className="max-h-[80vh] overflow-y-auto">
          <DrawerHeader>
            <DrawerTitle>Edit task</DrawerTitle>
            <DrawerDescription>
              Adjust details and estimates in one place.
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6">
            <TaskEditorForm
              item={item}
              formState={formState}
              setFormState={setFormState}
              onSubmit={handleSubmit}
              isSaving={isSaving}
              categoryOptions={categoryOptions}
            />
          </div>
          <DrawerFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit task</DialogTitle>
          <DialogDescription>
            Keep everything up to date without leaving your flow.
          </DialogDescription>
        </DialogHeader>
        <TaskEditorForm
          item={item}
          formState={formState}
          setFormState={setFormState}
          onSubmit={handleSubmit}
          isSaving={isSaving}
          categoryOptions={categoryOptions}
        />
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
