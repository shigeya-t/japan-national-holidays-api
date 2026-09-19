import { Hono } from "hono";
import { createApp } from "./create-app.js";
import { BUNDLED_CSV_TEXT } from "./holidays/bundled-csv-text.js";
import { parseHolidayCsv } from "./holidays/csv.js";
import { HolidayStore } from "./holidays/store.js";

function isCloudflareWorker(): boolean {
  return typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";
}

const store = new HolidayStore();
let initPromise: Promise<void> | undefined;

export function ready(): Promise<void> {
  initPromise ??= isCloudflareWorker()
    ? Promise.resolve().then(() => {
        store.load(parseHolidayCsv(BUNDLED_CSV_TEXT), "bundled");
      })
    : store.init().then(() => {
        if (!process.env.VITEST) {
          store.startRefresh();
        }
      });
  return initPromise;
}

const app: Hono = createApp(store, { ready });
export default app;
