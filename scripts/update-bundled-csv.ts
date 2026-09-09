import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fetchOfficialCsv, validateHolidayCsv } from "../src/holidays/csv.js";

const dest = path.join(process.cwd(), "data/syukujitsu.csv");
const text = await fetchOfficialCsv();
const records = validateHolidayCsv(text);
const utf8 = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
const normalized = utf8.endsWith("\n") ? utf8 : `${utf8}\n`;
await writeFile(dest, normalized, "utf8");
console.log(`wrote ${records.length} holidays to ${dest} (${records[0]?.date} .. ${records.at(-1)?.date})`);
