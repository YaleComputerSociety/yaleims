// Create local settings once, without printing a secret or changing an existing file.
import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const target = new URL("../.env.local", import.meta.url);
const example = await readFile(new URL("../.env.example", import.meta.url), "utf8");
try {
  await writeFile(target, example.replace(/^JWT_SECRET=$/m, `JWT_SECRET=${randomBytes(32).toString("hex")}`), {
    flag: "wx",
    mode: 0o600,
  });
  console.log("Created frontend/.env.local with a generated local session secret and demo-yims settings.");
} catch (error) {
  if (error.code !== "EEXIST") throw error;
  console.log("Kept existing frontend/.env.local. Compare its emulator settings with .env.example if upgrading.");
}
console.log("Next: npm run dev:doctor, then npm run emulator.");
