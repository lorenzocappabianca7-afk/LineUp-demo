import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist (mai HTML per /api)
  app.use("/{*path}", (req, res) => {
    const pathOnly = (req.originalUrl || "").split("?")[0] || "";
    if (pathOnly.startsWith("/api")) {
      res.status(404).type("application/json").json({
        message: `API non trovata: ${req.method} ${pathOnly}`,
      });
      return;
    }
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
