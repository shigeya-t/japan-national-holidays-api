import type { HolidayStore } from "./holidays/store.js";

const dateInfoRef = { $ref: "#/components/schemas/DateInfo" };
const errorRef = { $ref: "#/components/schemas/Error" };

function jsonContent(schema: Record<string, unknown>) {
  return { content: { "application/json": { schema } } };
}

export function openApiDocument(store: HolidayStore) {
  const health = store.health();
  return {
    openapi: "3.1.0",
    info: {
      title: "日本の祝日 API",
      version: "1.0.0",
      description: [
        "内閣府の国民の祝日 CSV をデータ源とする REST API。",
        "タイムゾーンは Asia/Tokyo。kind は推定値。会社独自の休日は含まない。",
        `収録期間: ${health.from} 〜 ${health.until}`,
        "参照先: [https://github.com/shigeya-t/japan-national-holidays-api](https://github.com/shigeya-t/japan-national-holidays-api)",
      ].join("\n\n"),
      contact: {
        name: "GitHub",
        url: "https://github.com/shigeya-t/japan-national-holidays-api",
      },
    },
    externalDocs: {
      description: "参照先",
      url: "https://github.com/shigeya-t/japan-national-holidays-api",
    },
    servers: [
      { url: "/", description: "このサーバー" },
      { url: "https://japan-national-holidays-api.vercel.app", description: "公開" },
      { url: "http://localhost:3000", description: "ローカル" },
      {
        url: "{url}",
        description: "任意の URL",
        variables: {
          url: {
            default: "http://localhost:3000",
          },
        },
      },
    ],
    tags: [
      { name: "health", description: "稼働状況" },
      { name: "holidays", description: "祝日・営業日" },
    ],
    paths: {
      "/health": {
        get: {
          tags: ["health"],
          summary: "件数・ソース・収録期間",
          operationId: "getHealth",
          responses: {
            "200": {
              description: "OK",
              ...jsonContent({ $ref: "#/components/schemas/Health" }),
            },
          },
        },
      },
      "/v1/lookup": {
        get: {
          tags: ["holidays"],
          summary: "指定日の祝日判定",
          operationId: "lookupHoliday",
          parameters: [
            { name: "year", in: "query", required: true, schema: { type: "integer", example: 2026 } },
            { name: "month", in: "query", required: true, schema: { type: "integer", minimum: 1, maximum: 12, example: 1 } },
            { name: "day", in: "query", required: true, schema: { type: "integer", minimum: 1, maximum: 31, example: 1 } },
          ],
          responses: {
            "200": { description: "判定結果", ...jsonContent(dateInfoRef) },
            "400": { description: "不正な日付またはクエリ", ...jsonContent(errorRef) },
          },
        },
      },
      "/v1/today": {
        get: {
          tags: ["holidays"],
          summary: "東京の今日",
          operationId: "lookupToday",
          responses: {
            "200": { description: "今日の判定", ...jsonContent(dateInfoRef) },
          },
        },
      },
      "/v1/next": {
        get: {
          tags: ["holidays"],
          summary: "次の祝日",
          description: "from 当日が祝日ならそれを含める。count は 1〜20。",
          operationId: "nextHolidays",
          parameters: [
            {
              name: "from",
              in: "query",
              required: false,
              schema: { type: "string", format: "date", example: "2026-09-09" },
            },
            {
              name: "count",
              in: "query",
              required: false,
              schema: { type: "integer", minimum: 1, maximum: 20, default: 1 },
            },
          ],
          responses: {
            "200": {
              description: "祝日一覧。件数が足りないときは until を付ける",
              ...jsonContent({ $ref: "#/components/schemas/NextHolidays" }),
            },
            "400": { description: "不正なパラメータ", ...jsonContent(errorRef) },
          },
        },
      },
      "/v1/business-day": {
        get: {
          tags: ["holidays"],
          summary: "営業日判定",
          description: "月〜金かつ非祝日。会社独自の休日は対象外。",
          operationId: "isBusinessDay",
          parameters: [
            { name: "year", in: "query", required: true, schema: { type: "integer", example: 2026 } },
            { name: "month", in: "query", required: true, schema: { type: "integer", minimum: 1, maximum: 12, example: 9 } },
            { name: "day", in: "query", required: true, schema: { type: "integer", minimum: 1, maximum: 31, example: 9 } },
          ],
          responses: {
            "200": { description: "判定結果（businessDay が主結果）", ...jsonContent(dateInfoRef) },
            "400": { description: "不正な日付またはクエリ", ...jsonContent(errorRef) },
          },
        },
      },
      "/v1/holidays": {
        get: {
          tags: ["holidays"],
          summary: "祝日一覧・名称検索",
          description: "year/month と from/to は AND（交差）。q があるときは部分一致のあと曖昧検索。",
          operationId: "listOrSearchHolidays",
          parameters: [
            { name: "year", in: "query", schema: { type: "integer", example: 2026 } },
            { name: "month", in: "query", schema: { type: "integer", minimum: 1, maximum: 12 } },
            { name: "from", in: "query", schema: { type: "string", format: "date", example: "2026-01-01" } },
            { name: "to", in: "query", schema: { type: "string", format: "date", example: "2026-03-31" } },
            { name: "q", in: "query", schema: { type: "string", example: "成人" } },
            { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
          ],
          responses: {
            "200": {
              description: "一覧。検索時は score が付くことがある",
              ...jsonContent({ $ref: "#/components/schemas/HolidaysEnvelope" }),
            },
            "400": { description: "不正なパラメータ", ...jsonContent(errorRef) },
          },
        },
      },
    },
    components: {
      schemas: {
        DateInfo: {
          type: "object",
          required: ["date", "holiday", "name", "kind", "weekday", "businessDay", "available"],
          properties: {
            date: { type: "string", format: "date", example: "2026-01-01" },
            holiday: { type: ["boolean", "null"] },
            name: { type: ["string", "null"], example: "元日" },
            kind: {
              type: ["string", "null"],
              enum: ["国民の祝日", "振替休日", "国民の休日", "祝日扱い", "皇室行事", null],
            },
            weekday: { type: "string", enum: ["日", "月", "火", "水", "木", "金", "土"], example: "木" },
            businessDay: { type: ["boolean", "null"] },
            available: { type: "boolean" },
            score: { type: "number", description: "曖昧検索時のみ。0 が最良" },
          },
        },
        Health: {
          type: "object",
          required: ["ok", "source", "count", "updatedAt", "from", "until"],
          properties: {
            ok: { type: "boolean" },
            source: { type: "string", enum: ["official", "bundled"] },
            count: { type: "integer", example: 1067 },
            updatedAt: { type: "string", format: "date-time" },
            from: { type: "string", format: "date", example: "1955-01-01" },
            until: { type: "string", format: "date", example: "2027-12-31" },
          },
        },
        HolidaysEnvelope: {
          type: "object",
          required: ["holidays", "total"],
          properties: {
            holidays: { type: "array", items: dateInfoRef },
            total: { type: "integer" },
          },
        },
        NextHolidays: {
          type: "object",
          required: ["holidays", "total"],
          properties: {
            holidays: { type: "array", items: dateInfoRef },
            total: { type: "integer" },
            until: { type: "string", format: "date", description: "件数が足りないときに収録終端" },
          },
        },
        Error: {
          type: "object",
          required: ["error"],
          additionalProperties: true,
          properties: {
            error: { type: "string", example: "invalid_date" },
          },
        },
      },
    },
  };
}
