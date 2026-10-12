// Fails if any code outside sidelined/ imports from it. Sidelined code is
// switched off on purpose (see ../README.md); importing it would quietly
// pull it back into the app.
import { readdirSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const SKIP = new Set(["node_modules", ".next", ".git", "sidelined"]);
const IMPORT_FROM_SIDELINED = /(?:from|import\(|require\()\s*["'][^"']*sidelined\//;

const offenders = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP.has(entry.name)) walk(path);
    } else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) {
      readFileSync(path, "utf8").split("\n").forEach((line, i) => {
        if (IMPORT_FROM_SIDELINED.test(line)) offenders.push(`${path}:${i + 1}: ${line.trim()}`);
      });
    }
  }
};
walk(REPO);

if (offenders.length) {
  console.error("Imports from sidelined/ are not allowed:\n" + offenders.join("\n"));
  process.exit(1);
}
console.log("OK: nothing imports from sidelined/");
