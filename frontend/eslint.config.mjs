// ESLint (npm run lint): Next's core-web-vitals rules (React, hooks, a11y,
// Next) everywhere; `any` is an error in the server code and the API routes,
// where every value crossing a boundary has a type.
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import tseslint from "typescript-eslint";

export default defineConfig([
  ...nextVitals,
  {
    // Three of the React Compiler rules (react-hooks 7) flag patterns the
    // pages use in about 40 places: state set in an effect, components
    // declared during render, a ref read during render. Off until those are
    // rewritten (NEXT-STEPS "Ideas for improvement"); the other compiler
    // rules stay on.
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components": "off",
      "react-hooks/refs": "off",
    },
  },
  {
    files: ["src/server/**", "src/app/api/**"],
    plugins: { "@typescript-eslint": tseslint.plugin },
    rules: { "@typescript-eslint/no-explicit-any": "error" },
  },
  globalIgnores([".next*/**", "next-env.d.ts"]),
]);
