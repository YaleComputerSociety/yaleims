// Fails if any code outside src/sidelined/ imports from it. Sidelined code is
// switched off on purpose (see src/sidelined/elo/README.md); importing it
// would quietly pull it back into the deployed build.
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const IMPORT_FROM_SIDELINED = /(?:from|import\()\s*["'][^"']*\/sidelined\//;

const offenders = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "sidelined") walk(path);
    } else if (/\.(ts|js|mjs)$/.test(entry.name)) {
      readFileSync(path, "utf8").split("\n").forEach((line, i) => {
        if (IMPORT_FROM_SIDELINED.test(line)) offenders.push(`${path}:${i + 1}: ${line.trim()}`);
      });
    }
  }
};
walk("src");

if (offenders.length) {
  console.error("Imports from src/sidelined/ are not allowed:\n" + offenders.join("\n"));
  process.exit(1);
}
console.log("OK: nothing imports from src/sidelined/");
