
import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import OpenAI from "openai";

const aiVenueSchema = z.object({
  name: z.string().min(2),
  address: z.string().min(6),
  description: z.string().min(10),
  rating: z.number().min(0).max(5),
  priceRange: z.string().min(1),
  bookingUrl: z.string().url(),
  websiteUrl: z.string().url(),
  mapsUrl: z.string().url(),
  safariUrl: z.string().url().optional(),
});

const aiVenueResponseSchema = z.object({
  venues: z.array(aiVenueSchema).min(1).max(12),
});

type AiVenue = z.infer<typeof aiVenueSchema>;

const TORINO_FALLBACK_VENUES: AiVenue[] = [
  {
    name: "Piazza Vittorio Veneto",
    address: "Piazza Vittorio Veneto, Torino",
    description: "Una delle piazze porticate piu grandi d'Europa, ideale per aperitivo e vita serale.",
    rating: 4.6,
    priceRange: "€€",
    bookingUrl: "https://www.thefork.it/",
    websiteUrl: "https://www.turismotorino.org/",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Piazza+Vittorio+Veneto+Torino",
  },
  {
    name: "Mercato Centrale Torino",
    address: "Piazza della Repubblica 25, Torino",
    description: "Hub gastronomico nel cuore del centro con diverse cucine e opzioni per gruppi.",
    rating: 4.4,
    priceRange: "€€",
    bookingUrl: "https://www.mercatocentrale.it/torino/",
    websiteUrl: "https://www.mercatocentrale.it/torino/",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Mercato+Centrale+Torino",
  },
  {
    name: "Museo Egizio",
    address: "Via Accademia delle Scienze 6, Torino",
    description: "Museo iconico di Torino, perfetto per un'esperienza culturale completa.",
    rating: 4.7,
    priceRange: "€€",
    bookingUrl: "https://museoegizio.it/",
    websiteUrl: "https://museoegizio.it/",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Museo+Egizio+Torino",
  },
  {
    name: "Museo Nazionale del Cinema",
    address: "Via Montebello 20, Torino",
    description: "All'interno della Mole Antonelliana, un percorso immersivo tra storia e tecnologia del cinema.",
    rating: 4.6,
    priceRange: "€€",
    bookingUrl: "https://www.museocinema.it/",
    websiteUrl: "https://www.museocinema.it/",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Museo+Nazionale+del+Cinema+Torino",
  },
  {
    name: "Parco del Valentino",
    address: "Corso Massimo d'Azeglio, Torino",
    description: "Grande area verde sul Po, ottima per passeggiate, running e relax all'aperto.",
    rating: 4.6,
    priceRange: "€",
    bookingUrl: "https://www.turismotorino.org/",
    websiteUrl: "https://www.turismotorino.org/",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Parco+del+Valentino+Torino",
  },
  {
    name: "Pala Alpitour",
    address: "Corso Sebastopoli 123, Torino",
    description: "Arena principale per concerti e grandi eventi indoor in citta.",
    rating: 4.5,
    priceRange: "€€€",
    bookingUrl: "https://www.ticketone.it/",
    websiteUrl: "https://www.palaalpitour.it/",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Pala+Alpitour+Torino",
  },
  {
    name: "OGR Torino",
    address: "Corso Castelfidardo 22, Torino",
    description: "Spazio culturale contemporaneo con mostre, musica e format innovativi.",
    rating: 4.6,
    priceRange: "€€",
    bookingUrl: "https://ogrtorino.it/",
    websiteUrl: "https://ogrtorino.it/",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=OGR+Torino",
  },
  {
    name: "Jolly Joker Club",
    address: "Corso San Maurizio 52, Torino",
    description: "Club sportivo noto per campi da padel, tennis e servizi per gruppi.",
    rating: 4.4,
    priceRange: "€€",
    bookingUrl: "https://www.playtomic.io/",
    websiteUrl: "https://www.jollyjokertorino.it/",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Jolly+Joker+Club+Torino",
  },
  {
    name: "QC Termetorino",
    address: "Corso Vittorio Emanuele II 77, Torino",
    description: "Spa urbana con percorsi benessere, adatta a relax di coppia o piccoli gruppi.",
    rating: 4.4,
    priceRange: "€€€",
    bookingUrl: "https://www.qcterme.com/it/torino/qc-termetorino",
    websiteUrl: "https://www.qcterme.com/it/torino/qc-termetorino",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=QC+Termetorino",
  },
];

function normalizePriceRange(value: string): string {
  const cleaned = value.trim();
  if (cleaned.includes("€€€")) return "€€€";
  if (cleaned.includes("€€")) return "€€";
  return "€";
}

function isTorinoAddress(address: string): boolean {
  const a = address.toLowerCase();
  return a.includes("torino");
}

function buildMapsUrl(name: string, address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${address} Torino`)}`;
}

function sanitizeAiVenues(rawVenues: unknown[]): AiVenue[] {
  const unique = new Map<string, AiVenue>();
  for (const item of rawVenues) {
    const parsed = aiVenueSchema.safeParse(item);
    if (!parsed.success) continue;
    const venue = parsed.data;
    if (!isTorinoAddress(venue.address)) continue;
    const key = venue.name.trim().toLowerCase();
    if (unique.has(key)) continue;
    unique.set(key, {
      ...venue,
      priceRange: normalizePriceRange(venue.priceRange),
      mapsUrl: venue.mapsUrl || buildMapsUrl(venue.name, venue.address),
    });
  }
  return [...unique.values()];
}

function getFallbackVenuesForSubcategory(subcategory: string): AiVenue[] {
  const sub = String(subcategory).toLowerCase();
  const filtered = TORINO_FALLBACK_VENUES.filter((v) => {
    const name = v.name.toLowerCase();
    const desc = v.description.toLowerCase();
    if (sub.includes("aperitivo") || sub.includes("cena") || sub.includes("brunch") || sub.includes("colazione")) {
      return name.includes("mercato") || name.includes("piazza");
    }
    if (sub.includes("cinema") || sub.includes("museo") || sub.includes("mostra") || sub.includes("teatro")) {
      return name.includes("museo") || name.includes("ogr");
    }
    if (sub.includes("padel") || sub.includes("sport") || sub.includes("running") || sub.includes("yoga")) {
      return name.includes("jolly") || name.includes("parco");
    }
    if (sub.includes("concerto") || sub.includes("festival") || sub.includes("evento") || sub.includes("fiera")) {
      return name.includes("pala") || name.includes("ogr");
    }
    return desc.includes("torino");
  });

  const merged = [...filtered];
  for (const venue of TORINO_FALLBACK_VENUES) {
    if (merged.length >= 5) break;
    if (!merged.some((v) => v.name.toLowerCase() === venue.name.toLowerCase())) {
      merged.push(venue);
    }
  }
  return merged.slice(0, 8);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`${label} timeout`)), timeoutMs);
  });
  return Promise.race([promise, timeout]);
}

async function isUrlReachable(url: string): Promise<boolean> {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  } catch {
    return false;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  try {
    const headResp = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
    });
    if (headResp.ok) return true;
    if (headResp.status === 405 || headResp.status === 403) {
      const getResp = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
      });
      return getResp.ok;
    }
    return false;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function validateVenueLinks(venues: AiVenue[]): Promise<AiVenue[]> {
  const checks = await Promise.all(
    venues.map(async (venue) => {
      const websiteOk = await isUrlReachable(venue.websiteUrl);
      if (!websiteOk) return null;

      const bookingOk = await isUrlReachable(venue.bookingUrl);
      return {
        ...venue,
        bookingUrl: bookingOk ? venue.bookingUrl : venue.websiteUrl,
      };
    }),
  );
  return checks.filter((v): v is AiVenue => Boolean(v));
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const isNonEmptyString = (value: unknown): value is string =>
    typeof value === "string" && value.trim().length > 0;

  // ── App Events ──
  app.get("/api/app/events", async (req, res) => {
    const events = await storage.getAppEvents();
    res.json(events);
  });

  app.get("/api/app/events/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "ID non valido" });
    const event = await storage.getAppEvent(id);
    if (!event) return res.status(404).json({ message: "Evento non trovato" });
    res.json(event);
  });

  app.post("/api/app/events", async (req, res) => {
    try {
      const body = req.body;
      if (!body.activity || !body.title || !body.createdBy) {
        return res.status(400).json({ message: "Dati mancanti" });
      }
      const requestedStatus = body.status === "confirmed" ? "confirmed" : "planning";
      const event = await storage.createAppEvent({
        activity: body.activity,
        title: body.title,
        status: requestedStatus,
        createdBy: body.createdBy,
        participants: JSON.stringify(body.participants || [body.createdBy]),
        dateOptions: JSON.stringify(body.dateOptions || []),
        timeOptions: JSON.stringify(body.timeOptions || []),
        venueOptions: JSON.stringify(body.venueOptions || []),
        confirmedDate: requestedStatus === "confirmed" ? (body.confirmedDate || null) : null,
        confirmedTime: requestedStatus === "confirmed" ? (body.confirmedTime || null) : null,
        confirmedVenue: requestedStatus === "confirmed" ? (body.confirmedVenue || null) : null,
      });
      res.status(201).json(event);
    } catch (err) {
      res.status(500).json({ message: "Errore nella creazione" });
    }
  });

  app.put("/api/app/events/:id/confirm", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "ID non valido" });
    const { confirmedDate, confirmedTime, confirmedVenue } = req.body;
    const updated = await storage.updateAppEvent(id, {
      status: "confirmed",
      confirmedDate,
      confirmedTime,
      confirmedVenue,
    });
    if (!updated) return res.status(404).json({ message: "Evento non trovato" });
    res.json(updated);
  });

  // Aggiunge una nuova opzione di voto (data / orario / luogo) proposta da un partecipante
  app.post("/api/app/events/:id/options", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "ID non valido" });
    const { type, value } = req.body;
    if (!type || !isNonEmptyString(value)) return res.status(400).json({ message: "Dati mancanti" });
    if (!["date", "time", "venue"].includes(type)) return res.status(400).json({ message: "Tipo non valido" });
    const event = await storage.getAppEvent(id);
    if (!event) return res.status(404).json({ message: "Evento non trovato" });

    const safeJson = (v: any, fb: any) => { try { return typeof v === "string" ? JSON.parse(v) : (v ?? fb); } catch { return fb; } };
    const dateOpts: string[]   = safeJson(event.dateOptions,  []);
    const timeOpts: string[]   = safeJson(event.timeOptions,  []);
    const venueOpts: any[]     = safeJson(event.venueOptions, []);

    const val = value.trim();
    if (type === "date") {
      if (dateOpts.includes(val)) return res.status(409).json({ message: "Opzione già presente" });
      dateOpts.push(val);
    } else if (type === "time") {
      if (timeOpts.includes(val)) return res.status(409).json({ message: "Opzione già presente" });
      timeOpts.push(val);
    } else {
      // value può essere JSON stringificato (contiene name/rating/distance/discount)
      let venueObj: any;
      try {
        const parsed = JSON.parse(val);
        venueObj = (typeof parsed === "object" && parsed !== null && parsed.name) ? parsed : { name: val };
      } catch {
        venueObj = { name: val };
      }
      if (venueOpts.some((v: any) => v.name === venueObj.name)) return res.status(409).json({ message: "Opzione già presente" });
      venueOpts.push(venueObj);
    }

    const updated = await storage.updateAppEvent(id, {
      dateOptions:  JSON.stringify(dateOpts),
      timeOptions:  JSON.stringify(timeOpts),
      venueOptions: JSON.stringify(venueOpts),
    });
    if (!updated) return res.status(404).json({ message: "Evento non trovato" });
    res.json(updated);
  });

  app.put("/api/app/events/:id/unconfirm", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "ID non valido" });
    const updated = await storage.updateAppEvent(id, {
      status: "planning",
      confirmedDate: null,
      confirmedTime: null,
      confirmedVenue: null,
    });
    if (!updated) return res.status(404).json({ message: "Evento non trovato" });
    res.json(updated);
  });

  // ── Votes ──
  app.get("/api/app/events/:id/votes", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "ID non valido" });
    const votes = await storage.getVotesByEvent(id);
    res.json(votes);
  });

  app.post("/api/app/events/:id/votes", async (req, res) => {
    const eventId = parseInt(req.params.id);
    if (isNaN(eventId)) return res.status(400).json({ message: "ID non valido" });
    const { voterName, voteType, voteValue } = req.body;
    if (!voterName || !voteType || !voteValue) {
      return res.status(400).json({ message: "Dati voto mancanti" });
    }

    // Attendance votes are mutually exclusive (yes/no): always clear previous attendance vote first
    if (voteType === "attendance") {
      const existing = await storage.getVotesByEvent(eventId);
      const oldAttendance = existing.find(v => v.voterName === voterName && v.voteType === "attendance");
      if (oldAttendance) {
        await storage.deleteVotesByType(eventId, voterName, "attendance");
        if (oldAttendance.voteValue === voteValue) {
          return res.json({ toggled: false });
        }
      }
      const vote = await storage.createVote({ eventId, voterName, voteType, voteValue });
      return res.status(201).json(vote);
    }

    // Standard toggle for date/time/venue
    const existing = await storage.getVotesByEvent(eventId);
    const alreadyVoted = existing.find(v =>
      v.voterName === voterName && v.voteType === voteType && v.voteValue === voteValue
    );
    if (alreadyVoted) {
      await storage.deleteVote(eventId, voterName, voteType, voteValue);
      return res.json({ toggled: false });
    }
    const vote = await storage.createVote({ eventId, voterName, voteType, voteValue });
    res.status(201).json(vote);
  });

  // ── Proposals ──
  app.get("/api/app/events/:id/proposals", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "ID non valido" });
    const proposals = await storage.getProposalsByEvent(id);
    res.json(proposals);
  });

  app.post("/api/app/events/:id/proposals", async (req, res) => {
    const eventId = parseInt(req.params.id);
    if (isNaN(eventId)) return res.status(400).json({ message: "ID non valido" });
    const { proposerName, proposalType, proposalValue } = req.body;
    if (!proposerName || !proposalType || !isNonEmptyString(proposalValue)) {
      return res.status(400).json({ message: "Dati proposta mancanti" });
    }
    if (!["date", "time", "venue"].includes(proposalType)) {
      return res.status(400).json({ message: "Tipo proposta non valido" });
    }
    const proposal = await storage.createProposal({
      eventId, proposerName,
      proposalType, proposalValue: proposalValue.trim(),
      status: "pending",
    });
    res.status(201).json(proposal);
  });

  app.put("/api/app/proposals/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "ID non valido" });
    const { status, creatorName } = req.body;
    if (!status || !["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Stato non valido" });
    }

    const updated = await storage.updateProposal(id, status);
    if (!updated) return res.status(404).json({ message: "Proposta non trovata" });

    if (status === "approved") {
      const safeJson = (v: any, fb: any) => { try { return typeof v === "string" ? JSON.parse(v) : (v ?? fb); } catch { return fb; } };
      const event = await storage.getAppEvent(updated.eventId);
      if (event) {
        const dateOpts: string[]  = safeJson(event.dateOptions, []);
        const timeOpts: string[]  = safeJson(event.timeOptions, []);
        const venueOpts: any[]    = safeJson(event.venueOptions, []);
        const val = updated.proposalValue;

        if (updated.proposalType === "date" && !dateOpts.includes(val)) {
          dateOpts.push(val);
          await storage.updateAppEvent(updated.eventId, { dateOptions: JSON.stringify(dateOpts) });
        } else if (updated.proposalType === "time" && !timeOpts.includes(val)) {
          timeOpts.push(val);
          await storage.updateAppEvent(updated.eventId, { timeOptions: JSON.stringify(timeOpts) });
        } else if (updated.proposalType === "venue") {
          let venueObj: any;
          try {
            const parsed = JSON.parse(val);
            venueObj = (typeof parsed === "object" && parsed !== null && parsed.name) ? parsed : { name: val };
          } catch { venueObj = { name: val }; }
          if (!venueOpts.some((v: any) => v.name === venueObj.name)) {
            venueOpts.push(venueObj);
            await storage.updateAppEvent(updated.eventId, { venueOptions: JSON.stringify(venueOpts) });
          }
        }
      }
    }

    res.json(updated);
  });

  // ── Messages ──
  app.get("/api/app/events/:id/messages", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "ID non valido" });
    const messages = await storage.getMessagesByEvent(id);
    res.json(messages);
  });

  app.post("/api/app/events/:id/messages", async (req, res) => {
    const eventId = parseInt(req.params.id);
    if (isNaN(eventId)) return res.status(400).json({ message: "ID non valido" });
    const { senderName, content } = req.body;
    if (!senderName || !isNonEmptyString(content)) {
      return res.status(400).json({ message: "Messaggio vuoto" });
    }
    const message = await storage.createMessage({ eventId, senderName, content: content.trim() });
    res.status(201).json(message);
  });

  app.delete("/api/app/events/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "ID non valido" });
    await storage.deleteAppEvent(id);
    res.json({ ok: true });
  });

  // ── Waitlist ──
  const subscriberSchema = z.object({ email: z.string().email() });
  app.post("/api/subscribers", async (req, res) => {
    try {
      const input = subscriberSchema.parse(req.body);
      const existing = await storage.getSubscriberByEmail(input.email);
      if (existing) return res.status(409).json({ message: "Email già iscritta" });
      const subscriber = await storage.createSubscriber(input);
      res.status(201).json(subscriber);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  // ── Page Views ──
  app.post("/api/pageviews", async (req, res) => {
    try {
      const ip = req.ip || req.headers["x-forwarded-for"]?.toString() || "unknown";
      const userAgent = req.headers["user-agent"] || "";
      const referrer = req.headers["referer"] || req.body.referrer || "";
      const path = req.body.path || "/";
      await storage.createPageView({ path, userAgent, referrer, ip });
      res.status(201).json({ ok: true });
    } catch { res.status(500).json({ message: "Errore" }); }
  });

  // ── Admin ──
  const adminAttempts = new Map<string, { count: number; lastAttempt: number }>();
  const ADMIN_MAX_ATTEMPTS = 5;
  const ADMIN_WINDOW_MS = 15 * 60 * 1000;
  const adminLoginSchema = z.object({ password: z.string().min(1) });

  const checkAdmin = (req: any, res: any): boolean => {
    const ip = req.ip || "unknown";
    const now = Date.now();
    const record = adminAttempts.get(ip);
    if (record && record.count >= ADMIN_MAX_ATTEMPTS && (now - record.lastAttempt) < ADMIN_WINDOW_MS) {
      res.status(429).json({ message: "Troppi tentativi. Riprova più tardi." });
      return false;
    }
    let body;
    try { body = adminLoginSchema.parse(req.body); } catch {
      res.status(400).json({ message: "Password richiesta" });
      return false;
    }
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword || body.password !== adminPassword) {
      const current = adminAttempts.get(ip) || { count: 0, lastAttempt: now };
      adminAttempts.set(ip, { count: current.count + 1, lastAttempt: now });
      res.status(401).json({ message: "Password non valida" });
      return false;
    }
    adminAttempts.delete(ip);
    return true;
  };

  // ── Banner PIN (separato dall'admin password) ──
  const checkBannerPin = (req: any, res: any): boolean => {
    const pin = (req.headers["x-banner-pin"] as string) || req.body?.pin;
    const bannerPin = process.env.BANNER_PIN;
    if (!bannerPin || pin !== bannerPin) {
      res.status(401).json({ message: "PIN non valido" });
      return false;
    }
    return true;
  };

  // ── Banners ──
  app.get("/api/app/banners", async (_req, res) => {
    const banners = await storage.getBanners();
    res.json(banners);
  });

  app.post("/api/banner/verify", async (req, res) => {
    if (!checkBannerPin(req, res)) return;
    res.json({ ok: true });
  });

  app.post("/api/app/banners", async (req, res) => {
    if (!checkBannerPin(req, res)) return;
    const { title, subtitle, bgColor } = req.body;
    if (!title) return res.status(400).json({ message: "Titolo obbligatorio" });
    const banner = await storage.createBanner({
      title,
      subtitle: subtitle || "",
      bgColor: bgColor || "#4A9BD9",
    });
    res.json(banner);
  });

  app.delete("/api/app/banners/:id", async (req, res) => {
    if (!checkBannerPin(req, res)) return;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "ID non valido" });
    await storage.deleteBanner(id);
    res.json({ ok: true });
  });

  app.post("/api/admin/verify", async (req, res) => {
    if (!checkAdmin(req, res)) return;
    res.json({ ok: true });
  });

  app.post("/api/admin/subscribers", async (req, res) => {
    if (!checkAdmin(req, res)) return;
    const all = await storage.getAllSubscribers();
    res.json(all);
  });

  app.post("/api/admin/pageviews", async (req, res) => {
    if (!checkAdmin(req, res)) return;
    const all = await storage.getAllPageViews();
    res.json(all);
  });

  // ── AI Scopri: genera domande personalizzate ──
  app.post("/api/scopri/questions", async (req, res) => {
    const { category, subcategory } = req.body;
    if (!category || !subcategory) {
      return res.status(400).json({ error: "Dati mancanti" });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `Sei un assistente italiano esperto di eventi e locali a Torino.
Un utente vuole fare: "${subcategory}" (categoria: ${category}).

Genera esattamente 4 domande brevi e specifiche per aiutarlo a trovare il posto perfetto a Torino.
Le domande devono essere mirate a questa attività specifica — non domande generiche.
Ogni domanda deve avere 4 opzioni di risposta, brevi (max 3 parole).

Rispondi SOLO con questo JSON (nessun testo extra):
{
  "questions": [
    {
      "id": "q1",
      "text": "Domanda specifica per ${subcategory}?",
      "options": [
        { "key": "a", "label": "Opzione A" },
        { "key": "b", "label": "Opzione B" },
        { "key": "c", "label": "Opzione C" },
        { "key": "d", "label": "Opzione D" }
      ]
    }
  ]
}`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 800,
      });

      const content = completion.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(content);
      res.json(parsed);
    } catch (err: any) {
      console.error("AI Questions error:", err?.message);
      res.status(500).json({ error: "Errore AI", detail: err?.message });
    }
  });

  // ── AI Scopri: suggerisce venues ──
  app.post("/api/scopri/ai", async (req, res) => {
    const { category, subcategory, answers, userRequest } = req.body;
    if (!category || !subcategory || !answers) {
      return res.status(400).json({ error: "Dati mancanti" });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      const fallbackOnly = getFallbackVenuesForSubcategory(subcategory).map((v) => ({ ...v, safariUrl: v.websiteUrl }));
      return res.json({ venues: fallbackOnly });
    }
    const openai = new OpenAI({ apiKey });

    const answersText = Object.entries(answers)
      .map(([q, a]) => `  - ${q}: ${a}`)
      .join("\n");
    const requestText = typeof userRequest === "string" && userRequest.trim().length > 0
      ? userRequest.trim()
      : "";

    const searchPrompt = `Sei un city concierge locale.
Trova QUANTE PIU opzioni possibili (minimo 6, massimo 8) di luoghi REALMENTE ESISTENTI e attivi nell'area di TORINO CITTA (non fuori Torino) per "${subcategory}".

Vincoli obbligatori:
- Usa solo posti verificabili online.
- L'indirizzo deve essere completo e contenere "Torino".
- Fornisci URL reali e funzionanti di sito/prenotazione.
- Se non trovi booking ufficiale, usa sito ufficiale anche in bookingUrl.
- Niente luoghi inventati o generici.
- Le opzioni DEVONO rispettare le richieste personali dell'utente, se presenti.

Preferenze utente:
${answersText}
${requestText ? `\nRichieste personali utente (OBBLIGATORIE):\n- ${requestText}\n` : ""}

Dopo la ricerca, rispondi SOLO con un JSON valido (nessun testo fuori dal JSON) con questa struttura esatta:
{
  "venues": [
    {
      "name": "Nome esatto del posto trovato online",
      "address": "Indirizzo completo con via e numero civico trovato online, Torino",
      "description": "2 frasi in italiano su perché è la scelta perfetta per queste preferenze",
      "rating": 4.5,
      "priceRange": "€ oppure €€ oppure €€€",
      "bookingUrl": "URL diretto per prenotare trovato online (TheFork, sito ufficiale, Playtomic ecc.)",
      "websiteUrl": "URL sito ufficiale trovato online",
      "mapsUrl": "https://www.google.com/maps/search/NOME+ENCODED+Torino",
      "safariUrl": "stesso URL di websiteUrl (link da aprire in Safari)"
    }
  ]
}`;

    try {
      // Prima prova: Responses API con ricerca web in tempo reale
      let rawText = "";
      try {
        const webResponse: any = await withTimeout((openai as any).responses.create({
          model: "gpt-4o-mini",
          tools: [{ type: "web_search_preview" }],
          input: searchPrompt,
        }), 12000, "responses");
        rawText = webResponse.output_text ?? "";
      } catch (webErr: any) {
        console.warn("Web search non disponibile, uso gpt-4o standard:", webErr?.message);
        // Fallback: gpt-4o senza ricerca web
        const completion = await withTimeout(openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: searchPrompt }],
          response_format: { type: "json_object" },
          max_tokens: 1200,
        }), 12000, "chat.completions");
        rawText = completion.choices[0]?.message?.content ?? "{}";
      }

      // Estrai JSON dalla risposta (puo contenere testo extra se arriva da web search)
      const jsonMatch = rawText.match(/\{[\s\S]*"venues"[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : rawText;
      const parsed = JSON.parse(jsonStr);
      const parsedResp = aiVenueResponseSchema.safeParse(parsed);
      const aiCandidates = parsedResp.success ? parsedResp.data.venues : [];
      const sanitized = sanitizeAiVenues(aiCandidates);

      // Fallback robusto su venue reali di Torino se AI non e affidabile
      const fallback = getFallbackVenuesForSubcategory(subcategory);

      const merged = [...sanitized];
      for (const fb of fallback) {
        if (merged.length >= 8) break;
        if (!merged.some((v) => v.name.toLowerCase() === fb.name.toLowerCase())) {
          merged.push(fb);
        }
      }
      if (merged.length < 6) {
        for (const fb of TORINO_FALLBACK_VENUES) {
          if (merged.length >= 8) break;
          if (!merged.some((v) => v.name.toLowerCase() === fb.name.toLowerCase())) {
            merged.push(fb);
          }
        }
      }
      const candidates = merged.slice(0, 6);
      const verified = await validateVenueLinks(candidates);

      // Garantisce almeno 5 risultati: se la validazione link e troppo restrittiva,
      // completa con fallback affidabili gia sanitizzati.
      const finalPool = [...verified];
      if (finalPool.length < 5) {
        for (const venue of merged) {
          if (finalPool.length >= 5) break;
          if (!finalPool.some((v) => v.name.toLowerCase() === venue.name.toLowerCase())) {
            finalPool.push(venue);
          }
        }
      }
      const finalVenues = finalPool.slice(0, 8);
      res.json({
        venues: finalVenues.map((v) => ({
          ...v,
          safariUrl: v.websiteUrl,
        })),
      });
    } catch (err: any) {
      console.error("AI Scopri error:", err?.message);
      const safeFallback = getFallbackVenuesForSubcategory(subcategory).map((v) => ({
        ...v,
        safariUrl: v.websiteUrl,
      }));
      res.json({ venues: safeFallback });
    }
  });

  return httpServer;
}
