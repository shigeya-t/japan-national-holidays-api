import { addDays, weekdayJa, ymdFromDate } from "./calendar.js";
import type { HolidayKind } from "./types.js";

const IMPERIAL_NAMES = new Set(["結婚の儀", "大喪の礼", "即位礼正殿の儀"]);

function previousSunday(date: string): string {
  const { year, month, day } = ymdFromDate(date);
  const weekday = weekdayJa(year, month, day);
  const offset = ["日", "月", "火", "水", "木", "金", "土"].indexOf(weekday);
  return addDays(date, -offset);
}

function isSubstituteHoliday(date: string, dates: Set<string>): boolean {
  const sunday = previousSunday(date);
  if (!dates.has(sunday)) {
    return false;
  }
  let cursor = sunday;
  while (cursor <= date) {
    if (!dates.has(cursor)) {
      return false;
    }
    cursor = addDays(cursor, 1);
  }
  return true;
}

export function classifyKind(
  date: string,
  name: string,
  dates: Set<string>,
): HolidayKind {
  if (name.startsWith("休日") && name !== "休日") {
    return "祝日扱い";
  }
  if (name === "休日") {
    if (isSubstituteHoliday(date, dates)) {
      return "振替休日";
    }
    const prev = addDays(date, -1);
    const next = addDays(date, 1);
    if (dates.has(prev) && dates.has(next)) {
      return "国民の休日";
    }
    return "振替休日";
  }
  if (IMPERIAL_NAMES.has(name)) {
    return "皇室行事";
  }
  return "国民の祝日";
}
