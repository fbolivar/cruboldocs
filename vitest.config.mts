import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

// Pruebas unitarias de la lógica pura (src/lib, validaciones y parámetros de URL).
// Las de RLS van aparte (`npm run test:rls`) y las E2E con Playwright (`npm run test:e2e`).
export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\/(.*)$/, replacement: fileURLToPath(new URL("./src/$1", import.meta.url)) },
      // `server-only` falla fuera de Next.js; en las pruebas es un módulo vacío.
      { find: "server-only", replacement: fileURLToPath(new URL("./tests/unit/server-only.ts", import.meta.url)) },
    ],
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
  },
})
