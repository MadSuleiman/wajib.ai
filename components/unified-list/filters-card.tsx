import type React from "react";
import type { ItemGroupMode, SortOptionValue } from "@/components/list-utils";
import { Filter } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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

type ToolbarButtonProps = React.ComponentProps<typeof Button> & {
  icon: typeof Filter;
};

const ToolbarButton = ({
  icon: Icon,
  children,
  ...props
}: ToolbarButtonProps) => (
  <Button variant="secondary" size="sm" {...props}>
    <Icon className="mr-2 h-4 w-4" />
    {children}
  </Button>
);

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
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        <ToolbarButton type="button" icon={Filter} onClick={onReset}>
          Reset filters
        </ToolbarButton>
      </CardFooter>
    </Card>
  );
}
