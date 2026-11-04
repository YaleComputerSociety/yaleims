// Read-only checks for the supported local setup. Never prints environment values or secrets.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

let failures = 0;
function check(ok, message, remedy) {
  console.log(`${ok ? "OK" : "FAIL"} ${message}${!ok ? ` — ${remedy}` : ""}`);
  if (!ok) failures++;
}

const [major, minor] = process.versions.node.split(".").map(Number);
check(major === 22 && minor >= 9, "Node 22.9+ (22.x)", "Run nvm use from the repository, or select Node 22 in your version manager.");
const java = spawnSync("java", ["-version"], { encoding: "utf8", timeout: 10_000 });
const javaVersion = `${java.stdout ?? ""}\n${java.stderr ?? ""}`.match(/version "(\d+)/)?.[1];
check(java.status === 0 && Number(javaVersion) >= 21, "Java 21+ on PATH", "Install JDK 21 and add its bin directory to PATH.");
check(existsSync(new URL("../.env.local", import.meta.url)), "frontend/.env.local exists", "Run npm run dev:setup.");
check(!!process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32, "Local JWT_SECRET has at least 32 characters", "Set a long random local secret in .env.local and restart the app.");
check(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID === "demo-yims", "Local project matches npm run emulator (demo-yims)", "Set NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-yims in .env.local and remove conflicting shell overrides.");
check(process.env.NEXT_PUBLIC_USE_EMULATOR === "true", "Browser and server use emulator mode", "Set NEXT_PUBLIC_USE_EMULATOR=true in .env.local.");
const host = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST ?? "127.0.0.1";
const port = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT ?? "8080";
check(host === "127.0.0.1" && port === "8080" && process.env.FIRESTORE_EMULATOR_HOST === `${host}:${port}`,
  "Browser, server and scripts agree on 127.0.0.1:8080", "Use the addresses in .env.example (custom ports require matching database/firebase.json too).");
check(existsSync(new URL("../../database/firestore.rules", import.meta.url)), "Firestore rules available", "Run from the full repository checkout, not a copy of frontend/ alone.");

console.log(failures ? `${failures} check(s) need attention.` : "Ready. Start npm run emulator, then npm run seed and npm run dev:emulator in another terminal.");
process.exitCode = failures ? 1 : 0;
