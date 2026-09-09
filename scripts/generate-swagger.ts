import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { openApiDocument } from "../src/openapi.js";
import { HolidayStore } from "../src/holidays/store.js";
import { renderSwaggerHtml } from "../src/swagger-html.js";

process.env.HOLIDAYS_SKIP_FETCH ??= "1";

const store = new HolidayStore();
await store.init();
const spec = openApiDocument(store);
const outDir = path.join(process.cwd(), "docs");
await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, "openapi.json"), `${JSON.stringify(spec, null, 2)}\n`, "utf8");
await writeFile(path.join(outDir, "swagger.html"), renderSwaggerHtml(spec), "utf8");
console.log(`wrote ${path.join(outDir, "swagger.html")} and openapi.json`);
