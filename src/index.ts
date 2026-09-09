import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { HolidayStore } from "./holidays/store.js";

const port = Number(process.env.PORT ?? 3000);
const store = new HolidayStore();
await store.init();
store.startRefresh();

const app = createApp(store);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`listening on http://localhost:${info.port}`);
});
