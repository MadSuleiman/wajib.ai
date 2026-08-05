import type { RecurrenceType } from "@/types";

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

export const detectLocalTimeZone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

export const dateToDayKey = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
};

export const parseDayKey = (value: string) => {
  if (!DAY_KEY.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10) === value ? date : null;
};

const formatUtcDay = (date: Date) => date.toISOString().slice(0, 10);
const addUtcDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};
const startOfUtcWeek = (date: Date) => {
  const day = date.getUTCDay();
  return addUtcDays(date, -((day + 6) % 7));
};

export type RoutinePeriod = {
  startDay: string;
  endDay: string;
};

export const getRoutinePeriodForDay = (
  routine: {
    created_at: string;
    recurrence_type: RecurrenceType;
    recurrence_interval: number;
  },
  day: string,
  timeZone: string,
): RoutinePeriod | null => {
  const cursorDay = parseDayKey(day);
  if (!cursorDay || routine.recurrence_type === "none") return null;
  const created = new Date(routine.created_at);
  if (Number.isNaN(created.getTime())) return null;
  const createdDay = parseDayKey(dateToDayKey(created, timeZone));
  if (!createdDay) return null;
  const interval = Math.max(1, Math.floor(routine.recurrence_interval || 1));

  if (routine.recurrence_type === "daily") {
    const elapsed = Math.max(
      0,
      Math.floor((cursorDay.getTime() - createdDay.getTime()) / 86_400_000),
    );
    const start = addUtcDays(
      createdDay,
      Math.floor(elapsed / interval) * interval,
    );
    return {
      startDay: formatUtcDay(start),
      endDay: formatUtcDay(addUtcDays(start, interval - 1)),
    };
  }

  if (routine.recurrence_type === "weekly") {
    const anchor = startOfUtcWeek(createdDay);
    const cursor = startOfUtcWeek(cursorDay);
    const elapsedWeeks = Math.max(
      0,
      Math.floor((cursor.getTime() - anchor.getTime()) / (7 * 86_400_000)),
    );
    const start = addUtcDays(
      anchor,
      Math.floor(elapsedWeeks / interval) * interval * 7,
    );
    return {
      startDay: formatUtcDay(start),
      endDay: formatUtcDay(addUtcDays(start, interval * 7 - 1)),
    };
  }

  const anchorYear = createdDay.getUTCFullYear();
  const cursorYear = cursorDay.getUTCFullYear();
  if (routine.recurrence_type === "yearly") {
    const startYear =
      anchorYear +
      Math.floor(Math.max(0, cursorYear - anchorYear) / interval) * interval;
    return {
      startDay: `${startYear}-01-01`,
      endDay: `${startYear + interval - 1}-12-31`,
    };
  }

  const anchorMonth = anchorYear * 12 + createdDay.getUTCMonth();
  const cursorMonth = cursorYear * 12 + cursorDay.getUTCMonth();
  const startMonth =
    anchorMonth +
    Math.floor(Math.max(0, cursorMonth - anchorMonth) / interval) * interval;
  const startYear = Math.floor(startMonth / 12);
  const startMonthIndex = startMonth % 12;
  const start = new Date(Date.UTC(startYear, startMonthIndex, 1));
  const end = new Date(Date.UTC(startYear, startMonthIndex + interval, 0));
  return { startDay: formatUtcDay(start), endDay: formatUtcDay(end) };
};
