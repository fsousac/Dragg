import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";
import sonarjs from "eslint-plugin-sonarjs";
import * as cleanCode from "eslint-plugin-clean-code";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  sonarjs.configs.recommended,
  {
    plugins: { "clean-code": cleanCode },
    rules: {
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
      complexity: ["warn", { max: 10 }],
      "max-depth": ["warn", { max: 4 }],
      "max-lines-per-function": [
        "warn",
        { max: 50, skipBlankLines: true, skipComments: true },
      ],
      "max-params": ["warn", { max: 3 }],
      "max-statements": ["warn", { max: 15 }],
      "sonarjs/cognitive-complexity": ["warn", 15],
      "clean-code/feature-envy": "off",
      "clean-code/exception-handling": "off",
    },
  },
  {
    files: ["tests/**", "e2e/**", "**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "sonarjs/no-hardcoded-passwords": "off",
      "max-lines-per-function": "off",
      "max-statements": "off",
      "max-params": "off",
    },
  },
  globalIgnores([
    ".v0-export/**",
    ".agents/**",
    ".next/**",
    "coverage/**",
    "next-env.d.ts",
    "node_modules/**",
    "out/**",
  ]),
]);
