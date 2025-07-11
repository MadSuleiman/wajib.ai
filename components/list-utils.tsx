import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";

export interface BaseItem {
  id: string;
  title: string;
  completed: boolean;
  created_at: string;
}

export const priorityIcons = {
  low: <ArrowDown className="h-4 w-4 text-blue-500" />,
  medium: <ArrowRight className="h-4 w-4 text-yellow-500" />,
  high: <ArrowUp className="h-4 w-4 text-red-500" />,
};

export const priorityLabels = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const priorityOrder: Record<TaskPriority, number> = {
  high: 1,
  medium: 2,
  low: 3,
};

import type { TaskPriority } from "@/types";

export const sortItemsByPriority = <T extends { priority: TaskPriority; created_at: string }>(
  items: T[],
): T[] => {
  return [...items].sort((a, b) => {
    const priorityComparison = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityComparison !== 0) {
      return priorityComparison;
    }
    // If priorities are the same, sort by creation date (newest first)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
};
