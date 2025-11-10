import type { ListItem } from "@/types";

export type StatusFilter = "active" | "completed" | "all";
export type DerivedStatus = Exclude<StatusFilter, "all">;

export interface CategoryOption {
  value: string;
  label: string;
  color?: string | null;
}

export interface ItemGroup {
  label: string;
  items: ListItem[];
}
