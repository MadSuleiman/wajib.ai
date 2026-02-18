import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  differenceInCalendarWeeks,
  differenceInCalendarYears,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subSeconds,
} from "date-fns";

import type { RecurrenceType } from "@/types";

const WEEK_OPTIONS = { weekStartsOn: 1 as const };

type RoutineLike = {
  created_at: string;
  recurrence_type: RecurrenceType;
  recurrence_interval?: number | null;
};

type RoutineUnit = "daily" | "weekly" | "monthly" | "yearly";

const DAY_KEY_FORMAT = "yyyy-MM-dd";

const normalizeInterval = (value?: number | null) => {
  if (!value || Number.isNaN(value) || value < 1) return 1;
  return Math.floor(value);
};

const getPeriodStartForDate = (date: Date, unit: RoutineUnit) => {
  switch (unit) {
    case "daily":
      return startOfDay(date);
    case "weekly":
      return startOfWeek(date, WEEK_OPTIONS);
    case "monthly":
      return startOfMonth(date);
    case "yearly":
      return startOfYear(date);
  }
};

const getElapsedUnits = (anchor: Date, cursor: Date, unit: RoutineUnit) => {
  switch (unit) {
    case "daily":
      return differenceInCalendarDays(cursor, anchor);
    case "weekly":
      return differenceInCalendarWeeks(cursor, anchor, WEEK_OPTIONS);
    case "monthly":
      return differenceInCalendarMonths(cursor, anchor);
    case "yearly":
      return differenceInCalendarYears(cursor, anchor);
  }
};

const addUnits = (date: Date, amount: number, unit: RoutineUnit) => {
  switch (unit) {
    case "daily":
      return addDays(date, amount);
    case "weekly":
      return addWeeks(date, amount);
    case "monthly":
      return addMonths(date, amount);
    case "yearly":
      return addYears(date, amount);
  }
};

const unitLabel = (unit: RoutineUnit, interval: number) => {
  if (interval <= 1) {
    switch (unit) {
      case "daily":
        return "day";
      case "weekly":
        return "week";
      case "monthly":
        return "month";
      case "yearly":
        return "year";
    }
  }

  switch (unit) {
    case "daily":
      return `${interval}-day period`;
    case "weekly":
      return `${interval}-week period`;
    case "monthly":
      return `${interval}-month period`;
    case "yearly":
      return `${interval}-year period`;
  }
};

const asRoutineUnit = (
  recurrenceType: RecurrenceType,
): RoutineUnit | undefined => {
  if (recurrenceType === "none") return undefined;
  return recurrenceType;
};

export type RoutinePeriodInfo = {
  start: Date;
  end: Date;
  startDayKey: string;
  endDayKey: string;
  periodLabel: string;
};

export const getLocalDayKey = (date: Date) => format(date, DAY_KEY_FORMAT);

export const isDayKeyInRange = (
  dayKey: string,
  rangeStartDayKey: string,
  rangeEndDayKey: string,
) => dayKey >= rangeStartDayKey && dayKey <= rangeEndDayKey;

export const getRoutinePeriodInfo = (
  item: RoutineLike,
  now: Date,
): RoutinePeriodInfo | null => {
  const routineUnit = asRoutineUnit(item.recurrence_type);
  if (!routineUnit) return null;

  const interval = normalizeInterval(item.recurrence_interval);
  const anchorDate = getPeriodStartForDate(
    new Date(item.created_at),
    routineUnit,
  );
  const cursor = getPeriodStartForDate(now, routineUnit);
  const elapsedUnits = Math.max(
    0,
    getElapsedUnits(anchorDate, cursor, routineUnit),
  );
  const bucketIndex = Math.floor(elapsedUnits / interval);

  const start = addUnits(anchorDate, bucketIndex * interval, routineUnit);
  const endExclusive = addUnits(start, interval, routineUnit);
  const end = subSeconds(endExclusive, 1);

  return {
    start,
    end,
    startDayKey: getLocalDayKey(start),
    endDayKey: getLocalDayKey(end),
    periodLabel: unitLabel(routineUnit, interval),
  };
};
