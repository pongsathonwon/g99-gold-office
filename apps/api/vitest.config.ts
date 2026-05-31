import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    projects: [
      {
        // Tier 1 — Pure Logic: no infra, instant
        test: {
          name: "domain",
          include: ["src/core/**/domain/**/*.test.ts"],
        },
      },
      {
        // Tier 2 — Adapter tests: real Postgres via testcontainers
        test: {
          name: "adapters",
          include: ["src/adapters/**/*.test.ts"],
          testTimeout: 60_000,
        },
      },
      {
        // Tier 3 — Use-case orchestration: mocked Effect Layers
        test: {
          name: "use-cases",
          include: ["src/core/**/use-cases/**/*.test.ts"],
        },
      },
    ],
  },
})
