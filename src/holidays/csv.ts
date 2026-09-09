import { readFile } from "node:fs/promises";
import iconv from "iconv-lite";
import { isValidDate, padDate } from "./calendar.js";
import type { HolidayRecord } from "./types.js";

export const OFFICIAL_CSV_URL =
  "https://www8.cao.go.jp/chosei/shukujitsu/syukujitsu.csv";

const USER_AGENT = "japan-national-holidays-api/1.0";

export function decodeCsv(buffer: Buffer): string {
  const utf8 = buffer.toString("utf8");
  if (!utf8.includes("\uFFFD") && utf8.includes("国民の祝日")) {
    return utf8;
  }
  return iconv.decode(buffer, "shift_jis");
}

export function parseHolidayCsv(text: string): HolidayRecord[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  const records: HolidayRecord[] = [];
  const seen = new Set<string>();

  for (const raw of lines.slice(1)) {
    const line = raw.trim();
    if (!line) {
      continue;
    }
    const comma = line.indexOf(",");
    if (comma < 0) {
      continue;
    }
    const datePart = line.slice(0, comma).trim();
    const name = line.slice(comma + 1).trim();
    const match = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(datePart);
    if (!match || !name) {
      continue;
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (!isValidDate(year, month, day)) {
      continue;
    }
    const date = padDate(year, month, day);
    if (seen.has(date)) {
      continue;
    }
    seen.add(date);
    records.push({ year, month, day, date, name });
  }

  records.sort((a, b) => a.date.localeCompare(b.date));
  return records;
}

export async function fetchOfficialCsv(timeoutMs = 10_000): Promise<string> {
  const response = await fetch(OFFICIAL_CSV_URL, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { "User-Agent": USER_AGENT },
  });
  if (!response.ok) {
    throw new Error(`official CSV fetch failed: HTTP ${response.status}`);
  }
  return decodeCsv(Buffer.from(await response.arrayBuffer()));
}

export async function readBundledCsv(filePath: string): Promise<string> {
  return decodeCsv(await readFile(filePath));
}

export function validateHolidayCsv(text: string): HolidayRecord[] {
  const header = text.replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0]?.replace(/\r$/, "") ?? "";
  if (!header.includes("国民の祝日")) {
    throw new Error(`unexpected CSV header: ${header}`);
  }
  const records = parseHolidayCsv(text);
  if (records.length < 500) {
    throw new Error(`too few holiday rows: ${records.length}`);
  }
  const dates = records.map((row) => row.date);
  if (new Set(dates).size !== dates.length) {
    throw new Error("duplicate dates in CSV");
  }
  const lastYear = records.at(-1)?.year;
  if (!lastYear) {
    throw new Error("could not parse last year");
  }
  return records;
}
