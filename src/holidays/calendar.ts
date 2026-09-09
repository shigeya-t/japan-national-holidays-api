import type { Ymd } from "./types.js";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

export function padDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseIsoDate(value: string): Ymd | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!isValidDate(year, month, day)) {
    return null;
  }
  return { year, month, day };
}

export function isValidDate(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const utc = new Date(Date.UTC(year, month - 1, day));
  return (
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === day
  );
}

export function weekdayJa(year: number, month: number, day: number): string {
  return WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

export function isWeekday(weekday: string): boolean {
  return weekday !== "土" && weekday !== "日";
}

export function tokyoToday(): Ymd {
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const parsed = parseIsoDate(formatted);
  if (!parsed) {
    throw new Error(`failed to resolve Tokyo date: ${formatted}`);
  }
  return parsed;
}

export function addDays(date: string, days: number): string {
  const parsed = parseIsoDate(date);
  if (!parsed) {
    throw new Error(`invalid date: ${date}`);
  }
  const utc = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + days));
  return padDate(utc.getUTCFullYear(), utc.getUTCMonth() + 1, utc.getUTCDate());
}

export function lastDayOfMonth(year: number, month: number): string {
  const utc = new Date(Date.UTC(year, month, 0));
  return padDate(utc.getUTCFullYear(), utc.getUTCMonth() + 1, utc.getUTCDate());
}

export function ymdFromDate(date: string): Ymd {
  const parsed = parseIsoDate(date);
  if (!parsed) {
    throw new Error(`invalid date: ${date}`);
  }
  return parsed;
}
