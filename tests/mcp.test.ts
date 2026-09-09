import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { HolidayStore } from "../src/holidays/store.js";

const store = new HolidayStore();
let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  await store.init();
  app = createApp(store);
});

async function mcp(body: unknown): Promise<unknown> {
  const res = await app.request("/mcp", {
    method: "POST",
    headers: {
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (text.startsWith("event:")) {
    const dataLine = text.split("\n").find((line) => line.startsWith("data:"));
    return JSON.parse(dataLine?.slice(5).trim() ?? "{}");
  }
  return JSON.parse(text);
}

describe("MCP", () => {
  it("initialize / tools/list / tools/call", async () => {
    const initialized = (await mcp({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "0.0.1" },
      },
    })) as { result?: { serverInfo?: { name: string } } };
    expect(initialized.result?.serverInfo?.name).toBe("japan-national-holidays");

    const listed = (await mcp({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
    })) as { result?: { tools?: { name: string }[] } };
    const names = (listed.result?.tools ?? []).map((tool) => tool.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "lookup_holiday",
        "lookup_today",
        "next_holidays",
        "is_business_day",
        "search_holidays",
        "list_holidays",
      ]),
    );

    const called = (await mcp({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "lookup_holiday",
        arguments: { year: 2026, month: 1, day: 1 },
      },
    })) as { result?: { content?: { text: string }[] } };
    const payload = JSON.parse(called.result?.content?.[0]?.text ?? "{}");
    expect(payload.name).toBe("元日");
  });
});
