import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(fileURLToPath(new URL(".", import.meta.url)), "client", "src"),
      "@shared": path.resolve(fileURLToPath(new URL(".", import.meta.url)), "shared"),
      "@assets": path.resolve(fileURLToPath(new URL(".", import.meta.url)), "attached_assets"),
    },
  },
  root: path.resolve(fileURLToPath(new URL(".", import.meta.url)), "client"),
  build: {
    outDir: path.resolve(fileURLToPath(new URL(".", import.meta.url)), "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    /** In dev evita che browser/anteprima IDE servano moduli o asset da cache HTTP. */
    headers: {
      "Cache-Control": "no-store",
    },
  },
});
