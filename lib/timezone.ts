const FALLBACK_TIME_ZONE = "UTC";

export const getLocalTimeZone = () => {
  if (typeof Intl === "undefined") {
    return FALLBACK_TIME_ZONE;
  }
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return FALLBACK_TIME_ZONE;
  }
};

export const formatTimeZoneDisplay = (timeZone: string) => {
  const partsFormatterOptions: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short",
  };
  let offsetLabel: string | null = null;
  try {
    offsetLabel =
      new Intl.DateTimeFormat(undefined, partsFormatterOptions)
        .formatToParts(new Date())
        .find((part) => part.type === "timeZoneName")?.value ?? null;
  } catch {
    offsetLabel = null;
  }

  if (typeof Intl !== "undefined" && "DisplayNames" in Intl) {
    try {
      const displayNames = new Intl.DisplayNames(undefined, {
        type: "timeZone" as unknown as Intl.DisplayNamesOptions["type"],
      });
      const displayName = displayNames.of(timeZone);
      if (displayName) {
        return offsetLabel ? `${displayName} (${offsetLabel})` : displayName;
      }
    } catch {
      // no-op; fall back to offset-based label
    }
  }

  return offsetLabel ? `${timeZone} (${offsetLabel})` : timeZone;
};

export const formatLocalDateTime = (
  input: string | Date,
  timeZone: string,
  options?: Intl.DateTimeFormatOptions,
) => {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone,
      timeZoneName: "short",
      ...options,
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
};

export const toLocalMidnight = (date: Date) => {
  const midnight = new Date(date);
  midnight.setHours(0, 0, 0, 0);
  return midnight;
};

export const getLocalDayBoundaries = (date: Date) => {
  const start = toLocalMidnight(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
};
