import { Hono } from "hono";
import { createApp } from "./create-app.js";
import { HolidayStore } from "./holidays/store.js";

if (process.env.VERCEL && process.env.HOLIDAYS_SKIP_FETCH !== "0") {
  process.env.HOLIDAYS_SKIP_FETCH ??= "1";
}

const store = new HolidayStore();
export const ready = store.init().then(() => {
  if (!process.env.VERCEL && !process.env.VITEST) {
    store.startRefresh();
  }
});

const app: Hono = createApp(store, { ready });
export default app;
