#!/usr/bin/env node
/**
 * Copies mutual fund JSON data from the repo root into public/ so Vite
 * can serve them as static assets during dev and build.
 */
import { copyFileSync, mkdirSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "../..");          // /vanguard
const pub  = join(__dir, "../public");      // /mf-overlap-ui/public

mkdirSync(join(pub, "holdings"), { recursive: true });

// Copy top-level fund list
copyFileSync(join(root, "mutual-funds.json"), join(pub, "mutual-funds.json"));
console.log("Copied mutual-funds.json");

// Copy holdings (mutual fund files only — not etfs/ subdir)
const holdingsDir = join(root, "holdings");
let count = 0;
for (const file of readdirSync(holdingsDir)) {
  if (!file.endsWith(".json")) continue;
  copyFileSync(join(holdingsDir, file), join(pub, "holdings", file));
  count++;
}
console.log(`Copied ${count} holdings files`);
