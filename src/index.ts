import { serve } from "@hono/node-server";
import app, { ready } from "./app.js";

export default app;

if (!process.env.VERCEL) {
  void ready
    .then(() => {
      const port = Number(process.env.PORT ?? 3000);
      serve({ fetch: app.fetch, port }, (info) => {
        console.log(`listening on http://localhost:${info.port}`);
      });
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
