import Fuse from "fuse.js";
import { filterRecords, toDateInfo } from "./lookup.js";
import type { HolidayStore } from "./store.js";
import type { DateInfo } from "./types.js";
import { HttpError } from "./types.js";
import { aliasesFor } from "./yomi.js";
import type { ListQuery } from "./lookup.js";

export function normalizeName(value: string): string {
  return value.normalize("NFKC").toLowerCase();
}

export function searchHolidays(
  store: HolidayStore,
  query: string,
  filters: ListQuery,
  limit = 20,
): { holidays: DateInfo[]; total: number } {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new HttpError(400, { error: "invalid_limit", limit });
  }

  const needle = normalizeName(query.trim());
  if (!needle) {
    throw new HttpError(400, { error: "empty_query" });
  }

  const records = filterRecords(store, filters);
  const indexed = records.map((record) => ({
    record,
    name: record.name,
    haystack: normalizeName([record.name, ...aliasesFor(record.name)].join(" ")),
  }));

  const seen = new Set<string>();
  const holidays: DateInfo[] = [];

  for (const item of indexed) {
    if (item.haystack.includes(needle)) {
      seen.add(item.record.date);
      holidays.push(toDateInfo(store, item.record));
    }
  }

  if (holidays.length < limit) {
    const fuse = new Fuse(indexed, {
      keys: ["name", "haystack"],
      ignoreLocation: true,
      threshold: 0.4,
      includeScore: true,
    });
    for (const hit of fuse.search(query)) {
      const date = hit.item.record.date;
      if (seen.has(date)) {
        continue;
      }
      seen.add(date);
      holidays.push({
        ...toDateInfo(store, hit.item.record),
        score: hit.score ?? 0,
      });
      if (holidays.length >= limit) {
        break;
      }
    }
  }

  const sliced = holidays.slice(0, limit);
  return { holidays: sliced, total: sliced.length };
}
