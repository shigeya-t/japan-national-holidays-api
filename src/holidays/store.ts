import path from "node:path";
import { fetchOfficialCsv, parseHolidayCsv, readBundledCsv } from "./csv.js";
import type { DataSource, HolidayRecord } from "./types.js";

const REFRESH_MS = 24 * 60 * 60 * 1000;

export function bundledCsvPath(): string {
  return process.env.BUNDLED_CSV_PATH ?? path.join(process.cwd(), "data/syukujitsu.csv");
}

export class HolidayStore {
  records: HolidayRecord[] = [];
  byDate = new Map<string, HolidayRecord>();
  dateSet = new Set<string>();
  coverageFrom = "";
  coverageUntil = "";
  source: DataSource = "bundled";
  updatedAt = "";
  count = 0;
  #timer: ReturnType<typeof setInterval> | undefined;

  load(records: HolidayRecord[], source: DataSource): void {
    this.records = [...records].sort((a, b) => a.date.localeCompare(b.date));
    this.byDate = new Map(this.records.map((row) => [row.date, row]));
    this.dateSet = new Set(this.byDate.keys());
    const years = this.records.map((row) => row.year);
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    this.coverageFrom = `${minYear}-01-01`;
    this.coverageUntil = `${maxYear}-12-31`;
    this.source = source;
    this.updatedAt = new Date().toISOString();
    this.count = this.records.length;
  }

  async init(): Promise<void> {
    const skipFetch = process.env.HOLIDAYS_SKIP_FETCH === "1";
    if (!skipFetch) {
      try {
        const text = await fetchOfficialCsv();
        this.load(parseHolidayCsv(text), "official");
        return;
      } catch (error) {
        console.warn("official CSV fetch failed, using bundled snapshot", error);
      }
    }
    const text = await readBundledCsv(bundledCsvPath());
    this.load(parseHolidayCsv(text), "bundled");
  }

  startRefresh(): void {
    this.#timer = setInterval(() => {
      void this.refresh();
    }, REFRESH_MS);
    this.#timer.unref();
  }

  async refresh(): Promise<void> {
    if (process.env.HOLIDAYS_SKIP_FETCH === "1") {
      return;
    }
    try {
      const text = await fetchOfficialCsv();
      this.load(parseHolidayCsv(text), "official");
    } catch (error) {
      console.warn("official CSV refresh failed", error);
    }
  }

  health() {
    return {
      ok: this.records.length > 0,
      source: this.source,
      count: this.count,
      updatedAt: this.updatedAt,
      from: this.coverageFrom,
      until: this.coverageUntil,
    };
  }
}
