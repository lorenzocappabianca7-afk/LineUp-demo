import { type Express } from "express";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export async function setupVite(server: Server, app: Express) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server, path: "/vite-hmr" },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  // Non far passare /api dal middleware Vite: in alcuni ambienti risponde con HTML
  // (index) e rompe le POST JSON verso Express.
  app.use((req, res, next) => {
    const pathOnly = (req.originalUrl || "").split("?")[0] || "";
    if (pathOnly.startsWith("/api")) return next();
    return vite.middlewares(req, res, next);
  });

  app.use("/{*path}", async (req, res, next) => {
    const url = req.originalUrl;
    const pathOnly = url.split("?")[0] ?? url;
    if (pathOnly.startsWith("/api")) {
      res.status(404).type("application/json").json({
        message: `API non trovata: ${req.method} ${pathOnly}. Riavvia il server (npm run dev) con l'ultima versione del codice.`,
      });
      return;
    }

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      // Prima di qualsiasi module: togli SW e Cache API (stessa origine = stessa porta).
      // Altrimenti un SW registrato in precedenza su questa porta serve ancora HTML/JS vecchi
      // finché non cambi porta (nuova "origine" = niente SW → sembra che "funzioni").
      template = template.replace(
        /<body([^>]*)>/,
        `<body$1><script>
(function(){
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(regs){
      regs.forEach(function(r){ r.unregister(); });
    });
  }
  if ("caches" in window) {
    caches.keys().then(function(keys){ keys.forEach(function(k){ caches.delete(k); }); });
  }
})();
</script>`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res
        .status(200)
        .set({
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
        })
        .end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
