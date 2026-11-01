// Tests (npm test): unit tests of the pure shared code run anywhere; the
// integration and rules tests need the Firestore emulator and run through
// `npm run test:integration` (tests/README.md).
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const src = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  resolve: { alias: { "@src": src, "@": src } },
  test: {
    // The integration tests share one server and one emulator: files run one
    // after another (the unit tests are fast either way).
    fileParallelism: false,
    projects: [
      { extends: true, test: { name: "unit", include: ["tests/unit/**/*.test.ts"], environment: "node" } },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts", "tests/rules/**/*.test.ts"],
          environment: "node",
          testTimeout: 30_000,
        },
      },
    ],
  },
});
