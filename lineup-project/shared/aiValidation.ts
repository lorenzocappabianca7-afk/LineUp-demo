import { z } from "zod";
import type { AISuggestion, UserPreferences } from "./types";

const transportEnum = z.enum(["piedi", "auto", "mezzi_pubblici", "bici"]);
const priceTierEnum = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);

/** Schema Zod: `UserPreferences` deve essere completo prima di costruire il prompt AI. */
export const userPreferencesSchema = z.object({
  topic: z.string().min(1, "topic obbligatorio"),
  subTopic: z.string().min(1, "subTopic obbligatorio"),
  zone: z.string().min(1, "zone obbligatoria: non può essere vuota o solo spazi"),
  priceRange: priceTierEnum,
  transport: transportEnum,
  additionalNotes: z.string().optional(),
});

/** Singolo oggetto nell'array `venues` della risposta JSON dell'AI (allineato a `AISuggestion`). */
export const scopriAiSuggestionSchema = z.object({
  name: z.string().min(2),
  address: z.string().min(6),
  /** Quartiere / zona di Torino (anteprima; non via civica). */
  quartiere: z.string().min(2).max(80).optional(),
  matchScore: z.number().min(0).max(100),
  explanation: z.string().min(10),
  estimatedPrice: z.string().min(1),
});

/** Venue nel formato usato da filtri, link e mappa (dopo espansione da `AISuggestion`). */
export const scopriVenuePipelineSchema = z.object({
  name: z.string().min(2),
  address: z.string().min(6),
  description: z.string().min(10),
  rating: z.number().min(0).max(5),
  priceRange: z.string().min(1),
  bookingUrl: z.string().url(),
  websiteUrl: z.string().url(),
  mapsUrl: z.string().url(),
  safariUrl: z.string().url().optional(),
  score: z.number().optional(),
  why: z.array(z.string()).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  openStatus: z.enum(["open", "closed", "unknown"]).optional(),
  quartiere: z.string().max(80).optional(),
});

export const scopriAiVenuesResponseSchema = z.object({
  venues: z.array(scopriAiSuggestionSchema).min(0).max(12),
});

/** Risposta JSON per ricerca luoghi a Torino (creazione evento / banner). */
export const torinoVenueSearchItemSchema = z.object({
  name: z.string().min(2).max(160),
  /** Breve ok: la riga mostrata usa anche la query di `mapsUrl`. */
  address: z.string().min(2).max(220),
  /** Quartiere o zona (anteprima UI, senza via civica). */
  quartiere: z.string().min(2).max(80).optional(),
  rating: z.number().min(0).max(5),
  mapsUrl: z.string().url(),
  websiteUrl: z.string().url(),
  instagramUrl: z
    .union([z.string().url(), z.literal(""), z.null()])
    .optional()
    .transform((u) => (u && String(u).trim().length > 0 ? String(u).trim() : undefined)),
});

export const torinoVenueSearchResponseSchema = z.object({
  venues: z.array(torinoVenueSearchItemSchema).min(0).max(10),
});

export type ScopriAiSuggestion = z.infer<typeof scopriAiSuggestionSchema>;
export type ScopriAiVenuesResponse = z.infer<typeof scopriAiVenuesResponseSchema>;
export type ScopriAiVenue = z.infer<typeof scopriVenuePipelineSchema>;
export type TorinoVenueSearchItem = z.infer<typeof torinoVenueSearchItemSchema>;

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Classifica testo `estimatedPrice` per confrontarlo con `UserPreferences.priceRange`. */
export type EstimatedPriceSignal = "budget" | "mid" | "luxury" | "unknown";

export function estimatedPriceSignal(estimatedPrice: string): EstimatedPriceSignal {
  const raw = estimatedPrice.trim();
  if (!raw) return "unknown";

  const s = stripDiacritics(raw.toLowerCase());

  if (
    /\b(lusso|luxury|premium|esclusiv|stellat|michel|fine\s*dining|alta\s*gamma|top\s*di\s*gamma)\b/i.test(
      s,
    )
  ) {
    return "luxury";
  }

  const euroRuns = raw.match(/€+/g) ?? [];
  const maxRun = euroRuns.reduce((m, r) => Math.max(m, r.length), 0);
  if (maxRun >= 3) return "luxury";
  if (maxRun === 2) return "mid";
  if (maxRun === 1) return "budget";

  if (/\b(economico|cheap|budget|modico|accessibil|convenient|popolare)\b/i.test(s)) return "budget";

  if (/\b(€\s*€\s*€|euro\s*euro\s*euro)\b/i.test(s)) return "luxury";

  return "unknown";
}

/** Parte testuale della zona (esclude bbox e placeholder). */
export function humanZoneLabelFromPrefsZone(zone: string): string {
  const full = zone.trim();
  const head = full.includes(" · ") ? full.split(" · ")[0]!.trim() : full;
  if (/^non specificata$/i.test(head)) return "";
  if (/^bbox:/i.test(head)) return "";
  return head.trim();
}

const ZONE_LABEL_STOPWORDS = new Set([
  "zona",
  "area",
  "mappa",
  "torino",
  "citta",
  "personalizzata",
  "selezionata",
  "utente",
  "qualsiasi",
]);

/** Indica se il testo contiene un riferimento plausibile all'etichetta di zona (token estratti dalla label). */
function textMatchesZoneLabel(haystack: string, zoneLabel: string): boolean {
  if (!zoneLabel) return true;
  const hay = stripDiacritics(haystack.toLowerCase());
  const label = stripDiacritics(zoneLabel.toLowerCase());
  const tokens = label
    .split(/[^a-z0-9]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 4 && !ZONE_LABEL_STOPWORDS.has(t));
  if (tokens.length > 0) return tokens.some((t) => hay.includes(t));
  const shortTok = label
    .split(/[^a-z0-9]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !ZONE_LABEL_STOPWORDS.has(t));
  if (shortTok.length === 0) return true;
  return shortTok.some((t) => hay.includes(t));
}

/** Nome + indirizzo oppure spiegazione (per vie generiche che citano il quartiere solo nel testo). */
export function venueTextMatchesZoneLabel(name: string, address: string, zoneLabel: string): boolean {
  if (!zoneLabel) return true;
  const primary = `${name} ${address}`;
  if (textMatchesZoneLabel(primary, zoneLabel)) return true;
  return false;
}

function suggestionMatchesZone(s: AISuggestion, zoneLabel: string): boolean {
  if (!zoneLabel) return true;
  if (venueTextMatchesZoneLabel(s.name, s.address, zoneLabel)) return true;
  return textMatchesZoneLabel(s.explanation, zoneLabel);
}

/**
 * Filtro post-generazione: scarta suggerimenti incoerenti con `UserPreferences` (oltre allo schema Zod).
 */
export function validateSuggestions(suggestions: AISuggestion[], prefs: UserPreferences): AISuggestion[] {
  const zoneLabel = humanZoneLabelFromPrefsZone(prefs.zone);
  return suggestions.filter((s) => {
    const sig = estimatedPriceSignal(s.estimatedPrice);

    if (prefs.priceRange === 1) {
      if (sig === "luxury" || sig === "mid") return false;
    }
    if (prefs.priceRange === 2) {
      if (sig === "luxury") return false;
    }

    if (!suggestionMatchesZone(s, zoneLabel)) return false;

    return true;
  });
}

function scopriRequestNorm(s: string): string {
  return stripDiacritics(s.toLowerCase());
}

function suggestionMatchesUserRequestKeywords(
  s: AISuggestion,
  wantsPizza: boolean,
  wantsGlutenFree: boolean,
): boolean {
  const blob = scopriRequestNorm([s.name, s.address, s.explanation].join(" "));
  const nameN = scopriRequestNorm(s.name);

  if (wantsPizza) {
    const pizzaSignal =
      /\b(pizzeria|pizza al|pizza\s|forno a legna|teglia|margherita|napoletana|romana|impasto pizza|menu pizza|pizze|pizzaiol)\b/.test(
        blob,
      );
    if (!pizzaSignal) return false;
    const looksNonPizzaOnly =
      /\b(pasticcer|gelater|confiser|laboratorio dolci|^caffe\s|^caffè\s|^bar\s|mulassano|baratti|bicerin|fiorio|platti|san carlo\b)/i.test(
        nameN,
      );
    if (looksNonPizzaOnly && !/\b(pizzeria|pizza senza|forno a legna|menu.{0,40}pizza|pizza.{0,20}glut)\b/.test(blob)) {
      return false;
    }
  }

  if (wantsGlutenFree) {
    const gfSignal =
      /\b(senza\s*glutine|gluten[-\s]?free|celiac|celiachia|\baic\b|opzione senza glutine|menu senza glutine|impasto senza glutine|farina senza glutine|pizza senza glutine|deglutin|offerta.{0,20}glut)\b/.test(
        blob,
      );
    if (!gfSignal) return false;
  }

  return true;
}

/**
 * Dopo `validateSuggestions`: se l'utente chiede esplicitamente pizzeria e/o senza glutine,
 * scarta suggerimenti che nel nome o nella spiegazione non dimostrano quel tipo di locale (es. pasticceria generica).
 */
export function filterAiSuggestionsByUserRequest(suggestions: AISuggestion[], userRequest: string): AISuggestion[] {
  const raw = userRequest.trim();
  if (!raw) return suggestions;
  const u = scopriRequestNorm(raw);

  const wantsPizza =
    /\bpizzeria\b/.test(u) ||
    /\bpizza\b/.test(u) ||
    /\bpizze\b/.test(u) ||
    (u.includes("forno") && u.includes("pizza"));
  const wantsGlutenFree =
    /\bceliac|\bceliachia|senza\s*glutine|no\s*glutine|gluten[-\s]?free|deglutinat|\baic\b/i.test(u);

  if (!wantsPizza && !wantsGlutenFree) return suggestions;

  return suggestions.filter((s) => suggestionMatchesUserRequestKeywords(s, wantsPizza, wantsGlutenFree));
}

/** Stesso criterio su venue espansi o voci catalogo (nome + descrizione). */
export function venueTextMatchesUserRequest(userRequest: string, name: string, description: string): boolean {
  const raw = userRequest.trim();
  if (!raw) return true;
  const u = scopriRequestNorm(raw);
  const wantsPizza =
    /\bpizzeria\b/.test(u) ||
    /\bpizza\b/.test(u) ||
    /\bpizze\b/.test(u) ||
    (u.includes("forno") && u.includes("pizza"));
  const wantsGlutenFree =
    /\bceliac|\bceliachia|senza\s*glutine|no\s*glutine|gluten[-\s]?free|deglutinat|\baic\b/i.test(u);
  if (!wantsPizza && !wantsGlutenFree) return true;

  const fake: AISuggestion = {
    name,
    address: "",
    matchScore: 50,
    explanation: description,
    estimatedPrice: "€€",
  };
  return suggestionMatchesUserRequestKeywords(fake, wantsPizza, wantsGlutenFree);
}

function defaultBuildMapsUrl(name: string, address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${address} Torino`)}`;
}

/** Converte il payload minimale dell'AI nel formato pipeline (sanitize / filtri / UI). */
function quartiereFromAddressLine(address: string): string | undefined {
  const t = address.trim();
  if (t.length < 3) return undefined;
  const beforeComma = t.split(",")[0]?.trim();
  if (beforeComma && beforeComma.length >= 2 && beforeComma.length <= 80) return beforeComma;
  return undefined;
}

export function expandScopriAiSuggestionToVenue(s: ScopriAiSuggestion): ScopriAiVenue {
  const mapsUrl = defaultBuildMapsUrl(s.name, s.address);
  const rating = Math.min(5, Math.max(0, s.matchScore / 20));
  const q = (s.quartiere ?? "").trim() || quartiereFromAddressLine(s.address);
  return {
    name: s.name,
    address: s.address,
    description: s.explanation,
    rating,
    priceRange: s.estimatedPrice.trim(),
    bookingUrl: mapsUrl,
    websiteUrl: mapsUrl,
    mapsUrl,
    safariUrl: mapsUrl,
    ...(q ? { quartiere: q } : {}),
  };
}

/** Valida che l'oggetto `UserPreferences` sia completo (in particolare `zone` e `priceRange`). */
export function validateUserPreferencesIntegral(
  input: unknown,
):
  | { ok: true; value: UserPreferences }
  | { ok: false; error: string } {
  const r = userPreferencesSchema.safeParse(input);
  if (!r.success) {
    const msg = r.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
    return { ok: false, error: msg };
  }
  return { ok: true, value: r.data };
}

/** Lancia se `UserPreferences` non è valido per la chiamata AI. */
export function assertUserPreferencesForAi(prefs: UserPreferences): void {
  const r = validateUserPreferencesIntegral(prefs);
  if (!r.ok) {
    throw new Error(`UserPreferences non valido: ${r.error}`);
  }
}

/**
 * Valida la risposta JSON dell'AI: presenza di tutti i campi obbligatori per ogni venue.
 * Ogni modifica allo schema dei suggerimenti deve passare da qui.
 */
export function validateScopriAiVenuesResponse(
  parsed: unknown,
):
  | { ok: true; data: ScopriAiVenuesResponse }
  | { ok: false; error: string } {
  const r = scopriAiVenuesResponseSchema.safeParse(parsed);
  if (!r.success) {
    return { ok: false, error: r.error.flatten().formErrors.join("; ") || r.error.message };
  }
  return { ok: true, data: r.data };
}

/** Type guard: oggetto compatibile con `AISuggestion` (campi obbligatori dello schema risposta AI). */
export function isAISuggestion(value: unknown): value is AISuggestion {
  return scopriAiSuggestionSchema.safeParse(value).success;
}
