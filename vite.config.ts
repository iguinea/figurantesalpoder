import { defineConfig } from "vitest/config";

// Node por defecto (motor puro, rápido); los tests de UI declaran
// `// @vitest-environment jsdom` en su propio fichero.
export default defineConfig({
  // Rutas relativas: la PWA vive en un subpath de GitHub Pages
  // (iguinea.github.io/figurantesalpoder/) y también en Capacitor.
  base: "./",
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
