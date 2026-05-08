import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": new URL(".", import.meta.url).pathname,
    },
  },
  test: {
    coverage: {
      // @ts-expect-error Vitest supports this V8 coverage option at runtime.
      all: true,
      exclude: [
        "**/*.test.{ts,tsx}",
        "**/*.config.{ts,tsx,mjs}",
        "**/*.d.ts",
        ".next/**",
        "coverage/**",
        "i18n.tsx",
        "next-env.d.ts",
        "node_modules/**",
      ],
      include: ["*.tsx", "*.ts"],
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "coverage",
      thresholds: {
        branches: 90,
        functions: 90,
        lines: 90,
        statements: 90,
      },
    },
    environment: "node",
    globals: true,
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
  },
});
