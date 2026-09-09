import {
  isValidDate,
  isWeekday,
  lastDayOfMonth,
  padDate,
  parseIsoDate,
  tokyoToday,
  weekdayJa,
} from "./calendar.js";
import { classifyKind } from "./kind.js";
import type { HolidayStore } from "./store.js";
import type { DateInfo, HolidayRecord, Ymd } from "./types.js";
import { HttpError } from "./types.js";

export type ListQuery = {
  year?: number;
  month?: number;
  from?: string;
  to?: string;
};

function requireValidYmd(year: number, month: number, day: number): Ymd {
  if (!isValidDate(year, month, day)) {
    throw new HttpError(400, {
      error: "invalid_date",
      year,
      month,
      day,
    });
  }
  return { year, month, day };
}

export function toDateInfo(store: HolidayStore, record: HolidayRecord): DateInfo {
  const weekday = weekdayJa(record.year, record.month, record.day);
  return {
    date: record.date,
    holiday: true,
    name: record.name,
    kind: classifyKind(record.date, record.name, store.dateSet),
    weekday,
    businessDay: false,
    available: true,
  };
}

export function lookupDate(store: HolidayStore, year: number, month: number, day: number): DateInfo {
  requireValidYmd(year, month, day);
  const date = padDate(year, month, day);
  const weekday = weekdayJa(year, month, day);

  if (date < store.coverageFrom || date > store.coverageUntil) {
    return {
      date,
      holiday: null,
      name: null,
      kind: null,
      weekday,
      businessDay: null,
      available: false,
    };
  }

  const record = store.byDate.get(date);
  if (!record) {
    return {
      date,
      holiday: false,
      name: null,
      kind: null,
      weekday,
      businessDay: isWeekday(weekday),
      available: true,
    };
  }

  return toDateInfo(store, record);
}

export function lookupToday(store: HolidayStore): DateInfo {
  const today = tokyoToday();
  return lookupDate(store, today.year, today.month, today.day);
}

export function lookupBusinessDay(
  store: HolidayStore,
  year: number,
  month: number,
  day: number,
): DateInfo {
  return lookupDate(store, year, month, day);
}

export function nextHolidays(
  store: HolidayStore,
  from: string | undefined,
  count: number,
): { holidays: DateInfo[]; total: number; until?: string } {
  if (!Number.isInteger(count) || count < 1 || count > 20) {
    throw new HttpError(400, { error: "invalid_count", count });
  }

  let fromDate = from;
  if (fromDate === undefined) {
    const today = tokyoToday();
    fromDate = padDate(today.year, today.month, today.day);
  } else if (!parseIsoDate(fromDate)) {
    throw new HttpError(400, { error: "invalid_from", from: fromDate });
  }

  const holidays = store.records
    .filter((row) => row.date >= fromDate)
    .slice(0, count)
    .map((row) => toDateInfo(store, row));

  const result: { holidays: DateInfo[]; total: number; until?: string } = {
    holidays,
    total: holidays.length,
  };
  if (holidays.length < count) {
    result.until = store.coverageUntil;
  }
  return result;
}

function intersectRange(
  store: HolidayStore,
  query: ListQuery,
): { start: string; end: string } | null {
  if (query.month !== undefined && query.year === undefined) {
    throw new HttpError(400, { error: "month_requires_year" });
  }
  if (query.from !== undefined && !parseIsoDate(query.from)) {
    throw new HttpError(400, { error: "invalid_from", from: query.from });
  }
  if (query.to !== undefined && !parseIsoDate(query.to)) {
    throw new HttpError(400, { error: "invalid_to", to: query.to });
  }
  if (query.from && query.to && query.from > query.to) {
    throw new HttpError(400, { error: "from_after_to", from: query.from, to: query.to });
  }

  let start = store.coverageFrom;
  let end = store.coverageUntil;

  if (query.year !== undefined && query.month !== undefined) {
    start = maxDate(start, padDate(query.year, query.month, 1));
    end = minDate(end, lastDayOfMonth(query.year, query.month));
  } else if (query.year !== undefined) {
    start = maxDate(start, `${query.year}-01-01`);
    end = minDate(end, `${query.year}-12-31`);
  }

  if (query.from) {
    start = maxDate(start, query.from);
  }
  if (query.to) {
    end = minDate(end, query.to);
  }

  if (start > end) {
    return null;
  }
  return { start, end };
}

function maxDate(a: string, b: string): string {
  return a > b ? a : b;
}

function minDate(a: string, b: string): string {
  return a < b ? a : b;
}

export function listHolidays(store: HolidayStore, query: ListQuery): DateInfo[] {
  const range = intersectRange(store, query);
  if (!range) {
    return [];
  }
  return store.records
    .filter((row) => row.date >= range.start && row.date <= range.end)
    .map((row) => toDateInfo(store, row));
}

export function filterRecords(store: HolidayStore, query: ListQuery): HolidayRecord[] {
  const range = intersectRange(store, query);
  if (!range) {
    return [];
  }
  return store.records.filter((row) => row.date >= range.start && row.date <= range.end);
}
