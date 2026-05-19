import type { Express, Request, Response, NextFunction } from "express";
import { LINEUP_MAINTENANCE_COPY } from "@shared/maintenanceCopy";

export function isMaintenanceMode(): boolean {
  const v = (process.env.MAINTENANCE_MODE ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export function getMaintenanceHtml(): string {
  const { title, lead, team } = LINEUP_MAINTENANCE_COPY;
  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="theme-color" content="#e8c41e" />
  <title>LineUp — ${title}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100dvh;
      font-family: "Plus Jakarta Sans", system-ui, sans-serif;
      background: linear-gradient(165deg, #f4faff 0%, #fff9e6 45%, #fff 100%);
      color: #111827;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: max(1.5rem, env(safe-area-inset-top)) 1.25rem max(1.5rem, env(safe-area-inset-bottom));
    }
    .card {
      width: 100%;
      max-width: 22rem;
      text-align: center;
      border-radius: 1.25rem;
      border: 2px solid rgba(124, 185, 232, 0.35);
      background: #fff;
      padding: 2rem 1.5rem;
      box-shadow: 0 12px 40px rgba(17, 24, 39, 0.08);
    }
    .logo {
      font-size: 1.75rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: #4a9bd9;
      margin: 0 0 1rem;
    }
    h1 {
      font-size: 1.125rem;
      font-weight: 800;
      margin: 0 0 0.75rem;
      line-height: 1.35;
    }
    p {
      margin: 0;
      font-size: 0.9375rem;
      line-height: 1.55;
      color: #4b5563;
    }
    p + p { margin-top: 0.75rem; }
    .team { font-weight: 600; color: #1f2937; }
  </style>
</head>
<body>
  <main class="card" role="alert">
    <p class="logo">LineUp</p>
    <h1>${title}</h1>
    <p>${lead}</p>
    <p class="team">${team}</p>
  </main>
</body>
</html>`;
}

const maintenanceJson = () => ({
  ok: false as const,
  maintenance: true as const,
  message: LINEUP_MAINTENANCE_COPY.lead,
});

/**
 * Solo se imposti MAINTENANCE_MODE=true su Render (deploy manuale).
 * Non si attiva per errori di rete o API lente: l’app client parte sempre.
 */
export function registerMaintenanceHandling(app: Express): void {
  app.get("/api/health", (_req, res) => {
    if (isMaintenanceMode()) {
      return res.status(503).json(maintenanceJson());
    }
    return res.json({ ok: true });
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!isMaintenanceMode()) return next();

    const pathOnly = (req.originalUrl || req.path || "").split("?")[0] || "";
    if (pathOnly === "/api/health") return next();

    if (pathOnly.startsWith("/api")) {
      return res.status(503).json(maintenanceJson());
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      return res.status(503).json(maintenanceJson());
    }

    res.status(200).type("html").send(getMaintenanceHtml());
  });
}
