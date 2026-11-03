// npm run test:integration: seeds the Firestore emulator (npm run seed; it
// wipes the emulator's data), starts the app on it with a throwaway session
// secret, runs the integration and rules tests (tests/integration,
// tests/rules), then stops the app. Needs the emulator running (or run
// under `firebase emulators:exec`, as CI does). Never touches production.
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { serveFakeYalies } from "../tests/integration/fakeYalies";

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error("Start the Firestore emulator first (npm run emulator) and set FIRESTORE_EMULATOR_HOST=127.0.0.1:8080.");
  process.exit(1);
}
const port = Number(process.env.TEST_PORT ?? 3210);
// The app looks people up in a fake Yale directory, never the real one.
const yaliesPort = port + 1;
const yalies = await serveFakeYalies(yaliesPort);
const env = {
  ...process.env,
  NEXT_PUBLIC_USE_EMULATOR: "true",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "yims-125a2",
  JWT_SECRET: randomBytes(32).toString("hex"),
  BASE_URL: `http://localhost:${port}`,
  YALIES_API_URL: `http://127.0.0.1:${yaliesPort}`,
  YALIES_API_KEY: "fake",
  NEXT_TELEMETRY_DISABLED: "1",
};

const seeded = spawnSync("npm", ["run", "-s", "seed"], { env, stdio: "inherit" });
if (seeded.status !== 0) process.exit(seeded.status ?? 1);

// A separate build directory, so it runs next to your own `next dev`. Next
// itself, not through npx: npx doesn't pass the SIGTERM on, which on Linux
// leaves the server running after the tests. Its request log is discarded,
// not piped: a pipe nobody reads fills up, and on Linux a full pipe blocks
// the server (CI hung after a few hundred requests).
const server = spawn("node_modules/.bin/next", ["dev", "-p", String(port)], { env: { ...env, NEXT_DIST_DIR: ".next-test" }, stdio: ["ignore", "ignore", "inherit"] });
const stop = () => {
  server.kill("SIGTERM");
  yalies.close();
};
process.on("exit", stop);

let ready = false;
const deadline = Date.now() + 90_000;
while (!ready && Date.now() < deadline) {
  try {
    // The first answer waits for the route's first compile (slow on a cold cache): only the deadline cuts it off.
    ready = (await fetch(`${env.BASE_URL}/api/seasons`, { signal: AbortSignal.timeout(Math.max(1000, deadline - Date.now())) })).ok;
  } catch {
    // not listening yet (or not answering)
  }
  if (!ready) await new Promise((r) => setTimeout(r, 1000));
}
if (!ready) {
  console.error(`The app didn't answer on ${env.BASE_URL} within 90s.`);
  process.exit(1);
}

// Async, so this process keeps serving the fake directory while the tests run.
const tests = spawn("npx", ["vitest", "run", "--project", "integration", ...process.argv.slice(2)], {
  env: { ...env, BASE: env.BASE_URL, TEST_JWT_SECRET: env.JWT_SECRET },
  stdio: "inherit",
});
const status = await new Promise<number | null>((resolve) => tests.on("exit", resolve));
process.exit(status ?? 1);
