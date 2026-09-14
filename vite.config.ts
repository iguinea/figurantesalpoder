import { defineConfig } from "vitest/config";

// Node por defecto (motor puro, rápido); los tests de UI declaran
// `// @vitest-environment jsdom` en su propio fichero.
export default defineConfig({
  test: {
    environment: "node",
    environmentOptions: {
      // Origen válido para que jsdom exponga localStorage (opaque origin no lo permite).
      jsdom: {
        url: "http://localhost/",
      },
    },
  },
});
