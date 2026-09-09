import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import {
  listHolidays,
  lookupBusinessDay,
  lookupDate,
  lookupToday,
  nextHolidays,
} from "./holidays/lookup.js";
import { searchHolidays } from "./holidays/search.js";
import type { HolidayStore } from "./holidays/store.js";
import { HttpError } from "./holidays/types.js";
import {
  holidaysQuerySchema,
  nextQuerySchema,
  ymdQuerySchema,
} from "./http/schemas.js";
import { handleMcpRequest } from "./mcp/server.js";
import { openApiDocument } from "./openapi.js";
import { renderSwaggerHtml } from "./swagger-html.js";

function parseQuery<T>(schema: z.ZodType<T>, raw: Record<string, string>): T {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new HttpError(400, {
      error: "invalid_query",
      details: parsed.error.flatten(),
    });
  }
  return parsed.data;
}

export function createApp(store: HolidayStore, options?: { ready?: Promise<void> }): Hono {
  const app = new Hono();
  if (options?.ready) {
    app.use(async (_c, next) => {
      await options.ready;
      await next();
    });
  }
  app.use("*", cors());

  app.onError((error, c) => {
    if (error instanceof HttpError) {
      return c.json(error.body, error.status as 400);
    }
    if (error instanceof HTTPException) {
      return error.getResponse();
    }
    console.error(error);
    return c.json({ error: "internal_error" }, 500);
  });

  app.get("/health", (c) => c.json(store.health()));

  app.get("/openapi.json", (c) => c.json(openApiDocument(store)));
  app.get("/docs", (c) => c.html(renderSwaggerHtml(openApiDocument(store))));
  app.get("/swagger", (c) => c.html(renderSwaggerHtml(openApiDocument(store))));

  app.get("/v1/lookup", (c) => {
    const query = parseQuery(ymdQuerySchema, c.req.query());
    return c.json(lookupDate(store, query.year, query.month, query.day));
  });

  app.get("/v1/today", (c) => c.json(lookupToday(store)));

  app.get("/v1/next", (c) => {
    const query = parseQuery(nextQuerySchema, c.req.query());
    return c.json(nextHolidays(store, query.from, query.count ?? 1));
  });

  app.get("/v1/business-day", (c) => {
    const query = parseQuery(ymdQuerySchema, c.req.query());
    return c.json(lookupBusinessDay(store, query.year, query.month, query.day));
  });

  app.get("/v1/holidays", (c) => {
    const query = parseQuery(holidaysQuerySchema, c.req.query());
    const filters = {
      year: query.year,
      month: query.month,
      from: query.from,
      to: query.to,
    };
    if (query.q) {
      return c.json(searchHolidays(store, query.q, filters, query.limit ?? 20));
    }
    const holidays = listHolidays(store, filters);
    return c.json({ holidays, total: holidays.length });
  });

  app.all("/mcp", (c) => handleMcpRequest(store, c));

  return app;
}
