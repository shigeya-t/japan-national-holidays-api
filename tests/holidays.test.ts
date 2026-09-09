import { readFile } from "node:fs/promises";
import iconv from "iconv-lite";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/create-app.js";
import { decodeCsv, parseHolidayCsv } from "../src/holidays/csv.js";
import { classifyKind } from "../src/holidays/kind.js";
import { lookupDate, nextHolidays } from "../src/holidays/lookup.js";
import { searchHolidays } from "../src/holidays/search.js";
import { HolidayStore } from "../src/holidays/store.js";

const store = new HolidayStore();

beforeAll(async () => {
  await store.init();
});

describe("csv decode", () => {
  it("reads UTF-8 and Shift_JIS", async () => {
    const utf8 = await readFile("data/syukujitsu.csv");
    const fromUtf8 = parseHolidayCsv(decodeCsv(utf8));
    const sjis = iconv.encode(utf8.toString("utf8"), "shift_jis");
    const fromSjis = parseHolidayCsv(decodeCsv(sjis));
    expect(fromUtf8.length).toBeGreaterThan(500);
    expect(fromSjis).toEqual(fromUtf8);
  });
});

describe("lookup", () => {
  it("2026-01-01 is 元日", () => {
    expect(lookupDate(store, 2026, 1, 1)).toMatchObject({
      date: "2026-01-01",
      holiday: true,
      name: "元日",
      kind: "国民の祝日",
      weekday: "木",
      businessDay: false,
      available: true,
    });
  });

  it("2026-01-02 is not a holiday", () => {
    expect(lookupDate(store, 2026, 1, 2)).toMatchObject({
      date: "2026-01-02",
      holiday: false,
      name: null,
      kind: null,
      weekday: "金",
      businessDay: true,
      available: true,
    });
  });

  it("2026-05-06 is 振替休日", () => {
    expect(lookupDate(store, 2026, 5, 6)).toMatchObject({
      name: "休日",
      kind: "振替休日",
      holiday: true,
      businessDay: false,
    });
  });

  it("2026-09-22 is 国民の休日", () => {
    expect(lookupDate(store, 2026, 9, 22)).toMatchObject({
      name: "休日",
      kind: "国民の休日",
    });
  });

  it("2026-09-09 is a business day", () => {
    expect(lookupDate(store, 2026, 9, 9)).toMatchObject({
      holiday: false,
      weekday: "水",
      businessDay: true,
      available: true,
    });
  });

  it("1981-05-04 is 振替休日 even with holidays on both sides", () => {
    expect(lookupDate(store, 1981, 5, 4)).toMatchObject({
      kind: "振替休日",
    });
    expect(classifyKind("1981-05-04", "休日", store.dateSet)).toBe("振替休日");
  });

  it("2027-12-01 is an in-coverage non-holiday", () => {
    expect(lookupDate(store, 2027, 12, 1)).toMatchObject({
      holiday: false,
      available: true,
      weekday: "水",
      businessDay: true,
    });
  });

  it("2028-01-01 is out of coverage", () => {
    expect(lookupDate(store, 2028, 1, 1)).toMatchObject({
      date: "2028-01-01",
      available: false,
      holiday: null,
      name: null,
      kind: null,
      businessDay: null,
      weekday: "土",
    });
  });

  it("2019-05-01 is 祝日扱い", () => {
    expect(lookupDate(store, 2019, 5, 1)).toMatchObject({
      name: "休日（祝日扱い）",
      kind: "祝日扱い",
    });
  });

  it("1959-04-10 is 皇室行事", () => {
    expect(lookupDate(store, 1959, 4, 10)).toMatchObject({
      name: "結婚の儀",
      kind: "皇室行事",
    });
  });

  it("rejects impossible dates", () => {
    expect(() => lookupDate(store, 2026, 2, 30)).toThrowError();
  });
});

describe("search", () => {
  it("finds 成人の日 by partial and yomi", () => {
    const partial = searchHolidays(store, "成人", { year: 2026 });
    expect(partial.holidays.some((row) => row.name === "成人の日")).toBe(true);
    const yomi = searchHolidays(store, "せいじん", { year: 2026 });
    expect(yomi.holidays.some((row) => row.name === "成人の日")).toBe(true);
  });
});

describe("next", () => {
  it("includes from if it is a holiday", () => {
    const result = nextHolidays(store, "2026-01-01", 1);
    expect(result.holidays[0]?.date).toBe("2026-01-01");
  });

  it("rejects count outside 1-20", () => {
    expect(() => nextHolidays(store, "2026-01-01", 0)).toThrowError();
    expect(() => nextHolidays(store, "2026-01-01", 21)).toThrowError();
  });
});

describe("REST", () => {
  const app = createApp(store);

  it("GET /v1/lookup", async () => {
    const res = await app.request("/v1/lookup?year=2026&month=1&day=1");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ name: "元日", weekday: "木" });
  });

  it("GET /v1/business-day", async () => {
    const res = await app.request("/v1/business-day?year=2026&month=9&day=9");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ businessDay: true });
  });

  it("GET /v1/holidays by year", async () => {
    const res = await app.request("/v1/holidays?year=2026");
    const body = (await res.json()) as { total: number };
    expect(res.status).toBe(200);
    expect(body.total).toBeGreaterThan(10);
  });

  it("GET /v1/holidays from>to is 400", async () => {
    const res = await app.request("/v1/holidays?from=2026-12-01&to=2026-01-01");
    expect(res.status).toBe(400);
  });

  it("GET /v1/holidays?q=成人", async () => {
    const res = await app.request("/v1/holidays?q=成人&year=2026");
    const body = (await res.json()) as { holidays: { name: string }[] };
    expect(body.holidays.some((row) => row.name === "成人の日")).toBe(true);
  });

  it("GET /v1/next invalid count", async () => {
    const res = await app.request("/v1/next?count=21");
    expect(res.status).toBe(400);
  });

  it("GET /v1/lookup invalid date", async () => {
    const res = await app.request("/v1/lookup?year=2026&month=2&day=30");
    expect(res.status).toBe(400);
  });

  it("GET /health", async () => {
    const res = await app.request("/health");
    const body = (await res.json()) as { ok: boolean; from: string; until: string };
    expect(body.ok).toBe(true);
    expect(body.from).toBe("1955-01-01");
    expect(body.until).toBe("2027-12-31");
  });

  it("GET /openapi.json", async () => {
    const res = await app.request("/openapi.json");
    const body = (await res.json()) as {
      openapi: string;
      paths: Record<string, unknown>;
      servers?: { url: string }[];
      info?: { description?: string; contact?: unknown };
      externalDocs?: unknown;
    };
    expect(res.status).toBe(200);
    expect(body.openapi).toBe("3.1.0");
    expect(body.paths["/v1/lookup"]).toBeDefined();
    expect(body.paths["/v1/holidays"]).toBeDefined();
    expect(body.servers?.some((server: { url: string }) => server.url === "{url}")).toBe(true);
    expect(body.servers?.some((server: { url: string }) => server.url === "https://japan-national-holidays-api.vercel.app")).toBe(true);
    expect(body.servers?.some((server: { url: string }) => server.url === "http://localhost:3000")).toBe(true);
    expect(body.info?.description).toContain("参照先: [https://github.com/shigeya-t/japan-national-holidays-api](https://github.com/shigeya-t/japan-national-holidays-api)");
    expect(body.info?.contact).toBeUndefined();
    expect(body.externalDocs).toBeUndefined();
  });

  it("GET /docs serves Swagger UI", async () => {
    const res = await app.request("/docs");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/html/);
    const html = await res.text();
    expect(html).toContain("swagger-ui");
    expect(html).toContain("日本の祝日 API");
    expect(html).toContain('id="server-url"');
    expect(html).toContain("参照先: [https://github.com/shigeya-t/japan-national-holidays-api](https://github.com/shigeya-t/japan-national-holidays-api)");
    expect(html).not.toContain('"contact"');
    expect(html).not.toContain('"externalDocs"');
    expect(html).toContain("https://japan-national-holidays-api.vercel.app");
    expect(html).toContain("http://localhost:3000");
  });
});

describe("Vercel default export", () => {
  it("src/app.ts default export serves /health", async () => {
    const { default: vercelApp } = await import("../src/app.js");
    const res = await vercelApp.request("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true });
  });
});
