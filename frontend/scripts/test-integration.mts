// npm run test:integration: seeds the Firestore emulator (npm run seed; it
// wipes the emulator's data), starts the app on it with a throwaway session
// secret, runs the integration and rules tests (tests/integration,
// tests/rules), then stops the app. Needs the emulator running (or run
// under `firebase emulators:exec`, as CI does). Never touches production.
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error("Start the Firestore emulator first (npm run emulator) and set FIRESTORE_EMULATOR_HOST=127.0.0.1:8080.");
  process.exit(1);
}
const port = Number(process.env.TEST_PORT ?? 3210);
const env = {
  ...process.env,
  NEXT_PUBLIC_USE_EMULATOR: "true",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "yims-125a2",
  JWT_SECRET: randomBytes(32).toString("hex"),
  BASE_URL: `http://localhost:${port}`,
  NEXT_TELEMETRY_DISABLED: "1",
};

const seeded = spawnSync("npm", ["run", "-s", "seed"], { env, stdio: "inherit" });
if (seeded.status !== 0) process.exit(seeded.status ?? 1);

// A separate build directory, so it runs next to your own `next dev`.
const server = spawn("npx", ["next", "dev", "-p", String(port)], { env: { ...env, NEXT_DIST_DIR: ".next-test" }, stdio: ["ignore", "pipe", "inherit"] });
server.stdout.on("data", () => {});
const stop = () => server.kill("SIGTERM");
process.on("exit", stop);

let ready = false;
for (let i = 0; i < 90 && !ready; i++) {
  try {
    ready = (await fetch(`${env.BASE_URL}/api/seasons`)).ok;
  } catch {
    // not listening yet
  }
  if (!ready) await new Promise((r) => setTimeout(r, 1000));
}
if (!ready) {
  console.error(`The app didn't answer on ${env.BASE_URL} within 90s.`);
  process.exit(1);
}

const tests = spawnSync("npx", ["vitest", "run", "--project", "integration", ...process.argv.slice(2)], {
  env: { ...env, BASE: env.BASE_URL, TEST_JWT_SECRET: env.JWT_SECRET },
  stdio: "inherit",
});
process.exit(tests.status ?? 1);
