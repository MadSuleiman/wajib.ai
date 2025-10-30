import * as React from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type DataTableSortDirection = "asc" | "desc";

export interface DataTableSortState {
  columnId: string;
  direction: DataTableSortDirection;
}

export interface DataTableColumn<T> {
  id: string;
  header: React.ReactNode;
  cell: (item: T) => React.ReactNode;
  headerClassName?: string;
  cellClassName?: string;
  sortable?: boolean;
}

export interface DataTableGroup<T> {
  label: string;
  items: T[];
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  emptyState?: React.ReactNode;
  groups?: DataTableGroup<T>[];
  sortState?: DataTableSortState;
  onSortChange?: (state: DataTableSortState) => void;
}

export function DataTable<T>({
  columns,
  data,
  emptyState,
  groups,
  sortState,
  onSortChange,
}: DataTableProps<T>) {
  const [internalSort, setInternalSort] = React.useState<
    DataTableSortState | undefined
  >(sortState);

  React.useEffect(() => {
    setInternalSort(sortState);
  }, [sortState]);

  const activeSort = sortState ?? internalSort;

  const hasGroups = React.useMemo(
    () => Boolean(groups && groups.length > 0),
    [groups],
  );

  const resolvedGroups = React.useMemo(() => {
    if (hasGroups && groups) {
      return groups;
    }

    if (!data.length) {
      return [];
    }

    return [{ label: "", items: data }];
  }, [data, groups, hasGroups]);

  const handleSort = React.useCallback(
    (column: DataTableColumn<T>) => {
      if (!column.sortable) return;

      const isActive = activeSort?.columnId === column.id;
      const nextDirection: DataTableSortDirection = isActive
        ? activeSort.direction === "asc"
          ? "desc"
          : "asc"
        : "desc";

      const nextSort: DataTableSortState = {
        columnId: column.id,
        direction: nextDirection,
      };

      if (onSortChange) {
        onSortChange(nextSort);
      } else {
        setInternalSort(nextSort);
      }
    },
    [activeSort, onSortChange],
  );

  const renderSortIcon = (column: DataTableColumn<T>) => {
    if (!column.sortable) {
      return null;
    }

    if (activeSort?.columnId !== column.id) {
      return <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />;
    }

    return activeSort.direction === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5" />
    );
  };

  if (!data.length) {
    return (
      <div className="rounded-lg border bg-card/30 backdrop-blur-3xl">
        <div className="p-6 text-center text-sm text-muted-foreground">
          {emptyState ?? "No data available."}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card/30 backdrop-blur-3xl">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            {columns.map((column) => {
              const isActive = activeSort?.columnId === column.id;
              const ariaSort = column.sortable
                ? isActive
                  ? activeSort?.direction === "asc"
                    ? "ascending"
                    : "descending"
                  : "none"
                : undefined;

              return (
                <TableHead
                  key={column.id}
                  className={cn("whitespace-nowrap", column.headerClassName)}
                  aria-sort={ariaSort}
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      onClick={() => handleSort(column)}
                      className="flex w-full items-center gap-2 text-left font-medium transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <span>{column.header}</span>
                      {renderSortIcon(column)}
                    </button>
                  ) : (
                    column.header
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {resolvedGroups.map((group, groupIndex) => (
            <React.Fragment key={group.label || groupIndex}>
              {group.label ? (
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableCell
                    colSpan={columns.length}
                    className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    {group.label}
                  </TableCell>
                </TableRow>
              ) : null}
              {group.items.map((item, itemIndex) => (
                <TableRow key={(item as { id?: string }).id ?? itemIndex}>
                  {columns.map((column) => (
                    <TableCell key={column.id} className={column.cellClassName}>
                      {column.cell(item)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
