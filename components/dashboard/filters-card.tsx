import type React from "react";
import type {
  ItemGroupMode,
  SortOptionValue,
} from "@/components/dashboard/list-utils";
import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { groupingOptions, sortOptions, statusOptions } from "./constants";
import type { CategoryOption, StatusFilter } from "./types";

type FiltersCardProps = {
  statusFilter: StatusFilter;
  onStatusChange: (value: StatusFilter) => void;
  categoryFilter: string;
  onCategoryChange: (value: string) => void;
  categoryOptions: CategoryOption[];
  groupMode: ItemGroupMode;
  onGroupModeChange: (value: ItemGroupMode) => void;
  sortValue: SortOptionValue;
  onSortValueChange: (value: SortOptionValue) => void;
  onReset: () => void;
};

export function FiltersCard({
  statusFilter,
  onStatusChange,
  categoryFilter,
  onCategoryChange,
  categoryOptions,
  groupMode,
  onGroupModeChange,
  sortValue,
  onSortValueChange,
  onReset,
}: FiltersCardProps) {
  return (
    <Card className="border bg-card/50 backdrop-blur w-full">
      <CardHeader>
        <CardTitle>Filters &amp; grouping</CardTitle>
        <CardDescription>
          Focus on just the items you care about.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2 pb-0">
        <div className="space-y-1">
          <Label>Status</Label>
          <Select
            value={statusFilter}
            onValueChange={(value: StatusFilter) => onStatusChange(value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Category</Label>
          <Select
            value={categoryFilter}
            onValueChange={(value) => onCategoryChange(value)}
          >
            <SelectTrigger className="capitalize">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categoryOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Grouping</Label>
          <Select
            value={groupMode}
            onValueChange={(value: ItemGroupMode) => onGroupModeChange(value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {groupingOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Sort</Label>
          <Select
            value={sortValue}
            onValueChange={(value: SortOptionValue) => onSortValueChange(value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col justify-end space-y-1">
          <Label>Reset</Label>
          <Button
            variant="outline"
            size="default"
            className="w-full justify-start gap-2"
            onClick={onReset}
          >
            <RotateCcw className="h-4 w-4" />
            Reset filters
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
