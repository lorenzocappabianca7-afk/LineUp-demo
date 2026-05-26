import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { registerMaintenanceHandling } from "./maintenance";
import { createServer } from "http";

const app = express();
app.set("trust proxy", 1);
const httpServer = createServer(app);

registerMaintenanceHandling(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

// ── Rate limiting ──
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,       // 1 minuto
  max: 120,                   // max 120 richieste per IP al minuto
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Troppe richieste, riprova tra poco." },
  skip: (req) => req.path.startsWith("/api/app/events") && req.method === "GET",
});

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,                    // max 30 scritture per IP al minuto
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Troppe richieste, riprova tra poco." },
});

app.use("/api", apiLimiter);
app.use("/api/app/events/:id/messages", writeLimiter);
app.use("/api/app/events/:id/votes", writeLimiter);
app.use("/api/app/events", (req, _res, next) => {
  if (req.method === "POST") return writeLimiter(req, _res, next);
  next();
});
app.use("/api/app/pianifica-demo/feedback", writeLimiter);

// ── Request timeout (30s per AI, 10s per tutto il resto) ──
app.use((req: Request, res: Response, next: NextFunction) => {
  const timeout =
    req.path.startsWith("/api/scopri") || req.path.startsWith("/api/app/venues/ai-search")
      ? 30_000
      : req.path === "/api/app/pianifica-demo/feedback" ||
          req.path === "/api/app/pianifica-demo/admin/smtp-test"
        ? 25_000
        : 10_000;
  res.setTimeout(timeout, () => {
    if (!res.headersSent) res.status(503).json({ message: "Richiesta scaduta, riprova." });
  });
  next();
});

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT.
  // Default 5174: evita 5000 (spesso AirPlay su macOS) e 5001 se usata da altre istanze / anteprime.
  const port = parseInt(process.env.PORT || "5174", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`serving on port ${port}`);
      if (process.env.LINEUP_DEV_SIM === "1") {
        log(
          `modalità simulazione (seconda istanza): stesso codice su porta diversa — apri http://localhost:${port} · dev principale di solito su http://localhost:5174`,
        );
      }
    },
  );
})();
