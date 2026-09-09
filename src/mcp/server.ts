import { StreamableHTTPTransport } from "@hono/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Context } from "hono";
import { z } from "zod";
import {
  listHolidays,
  lookupBusinessDay,
  lookupDate,
  lookupToday,
  nextHolidays,
} from "../holidays/lookup.js";
import { searchHolidays } from "../holidays/search.js";
import type { HolidayStore } from "../holidays/store.js";
import { HttpError } from "../holidays/types.js";

const ymd = {
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
};

function jsonResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data) }],
  };
}

function errorResult(error: unknown) {
  if (error instanceof HttpError) {
    return {
      isError: true,
      content: [{ type: "text" as const, text: JSON.stringify(error.body) }],
    };
  }
  const message = error instanceof Error ? error.message : "unknown_error";
  return {
    isError: true,
    content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }],
  };
}

export function buildMcpServer(store: HolidayStore): McpServer {
  const server = new McpServer({
    name: "japan-national-holidays",
    version: "1.0.0",
  });

  server.registerTool(
    "lookup_holiday",
    {
      description: "指定した年月日が日本の祝日かどうかを返す",
      inputSchema: ymd,
    },
    async ({ year, month, day }) => {
      try {
        return jsonResult(lookupDate(store, year, month, day));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "lookup_today",
    { description: "Asia/Tokyo の今日が祝日かどうかを返す" },
    async () => {
      try {
        return jsonResult(lookupToday(store));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "next_holidays",
    {
      description: "指定日（省略時は今日）以降の祝日を返す",
      inputSchema: {
        from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        count: z.number().int().min(1).max(20).optional(),
      },
    },
    async ({ from, count }) => {
      try {
        return jsonResult(nextHolidays(store, from, count ?? 1));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "is_business_day",
    {
      description: "指定日が営業日（月〜金かつ非祝日）かどうかを返す。会社独自の休日は含まない",
      inputSchema: ymd,
    },
    async ({ year, month, day }) => {
      try {
        return jsonResult(lookupBusinessDay(store, year, month, day));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "search_holidays",
    {
      description: "祝日名の部分一致・曖昧検索",
      inputSchema: {
        query: z.string().min(1),
        year: z.number().int().optional(),
        month: z.number().int().min(1).max(12).optional(),
        from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        limit: z.number().int().min(1).max(100).optional(),
      },
    },
    async ({ query, year, month, from, to, limit }) => {
      try {
        return jsonResult(searchHolidays(store, query, { year, month, from, to }, limit ?? 20));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "list_holidays",
    {
      description: "年・月、または from/to で祝日一覧を返す",
      inputSchema: {
        year: z.number().int().optional(),
        month: z.number().int().min(1).max(12).optional(),
        from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      },
    },
    async ({ year, month, from, to }) => {
      try {
        if (year === undefined && from === undefined && to === undefined) {
          throw new HttpError(400, { error: "year_or_range_required" });
        }
        const holidays = listHolidays(store, { year, month, from, to });
        return jsonResult({ holidays, total: holidays.length });
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  return server;
}

export async function handleMcpRequest(store: HolidayStore, c: Context) {
  const server = buildMcpServer(store);
  const transport = new StreamableHTTPTransport({
    sessionIdGenerator: undefined,
  });
  await server.connect(transport);
  const response = await transport.handleRequest(c);
  return response ?? c.body(null, 204);
}
