import { format } from "date-fns";

type CalendarEventInput = {
  title: string;
  start: Date;
  end: Date;
  timeZone?: string;
};

const formatCalendarDateTime = (value: Date) =>
  format(value, "yyyyMMdd'T'HHmmss");

export const buildGoogleCalendarUrl = ({
  title,
  start,
  end,
  timeZone,
}: CalendarEventInput) => {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${formatCalendarDateTime(start)}/${formatCalendarDateTime(end)}`,
  });

  if (timeZone) {
    params.set("ctz", timeZone);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};
