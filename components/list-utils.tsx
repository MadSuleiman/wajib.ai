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
