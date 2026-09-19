import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const csvPath = path.join(process.cwd(), "data/syukujitsu.csv");
const outPath = path.join(process.cwd(), "src/holidays/bundled-csv-text.ts");
const text = await readFile(csvPath, "utf8");
const source = [
  "/** Generated from data/syukujitsu.csv. Do not edit by hand. */",
  `export const BUNDLED_CSV_TEXT = ${JSON.stringify(text)};`,
  "",
].join("\n");
await writeFile(outPath, source, "utf8");
console.log(`wrote ${outPath}`);
