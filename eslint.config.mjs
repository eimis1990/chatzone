import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // The React Compiler lint rules (eslint-plugin-react-hooks v6) ship as errors
  // in this Next version, but the codebase predates them and relies on several
  // intentional patterns they flag — setState-in-effect for SSR/first-render
  // agreement, refs read during render, etc. Keep them visible as warnings until
  // a dedicated React Compiler adoption pass. The classic, battle-tested
  // rules-of-hooks and exhaustive-deps stay as errors.
  {
    rules: {
      "react-hooks/purity": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/refs": "warn",
    },
  },
]);

export default eslintConfig;
