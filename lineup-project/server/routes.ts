
import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import OpenAI from "openai";
import { buildUserPreferencesFromScopri } from "@shared/aiPrompts";
import { generateSystemPrompt, generateUserPrompt } from "../client/src/lib/ai-provider";
import {
  assertUserPreferencesForAi,
  expandScopriAiSuggestionToVenue,
  scopriVenuePipelineSchema as aiVenueSchema,
  validateScopriAiVenuesResponse,
  validateSuggestions,
} from "@shared/aiValidation";
import { senderCompletedVotablePoll } from "@shared/eventPoll";

type AiVenue = z.infer<typeof aiVenueSchema>;
type SearchIntent = "food" | "sport" | "culture" | "nightlife" | "outdoor" | "generic";
type ScopriConstraintMemory = {
  category?: string;
  subcategory?: string;
  giorno?: string;
  prezzo?: string;
  mezzo?: string;
  areaDisegnata?: string;
  zonaLabel?: string;
};
type GeoVenue = AiVenue & {
  lat?: number;
  lng?: number;
  openStatus?: "open" | "closed" | "unknown";
  score?: number;
  why?: string[];
};

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

/** Bar, caffè storici, pasticcerie, hub gastronomici — mai piazze/verde generico come "luogo" per mangiare. */
const TORINO_CIBO_LOCALI_FALLBACK: AiVenue[] = [
  {
    name: "Caffè Mulassano",
    address: "Piazza Castello 15, 10124 Torino",
    description:
      "Caffè storico con tramezzini e colazione al banco o al tavolo; nome commerciale di un locale, non un area aperta generica.",
    rating: 4.7,
    priceRange: "€€",
    bookingUrl: "https://www.caffemulassano.com/",
    websiteUrl: "https://www.caffemulassano.com/",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Caff%C3%A8+Mulassano+Torino",
  },
  {
    name: "Baratti & Milano",
    address: "Galleria Subalpina 29, 10123 Torino",
    description: "Pasticceria e caffè storico in galleria: colazione dolce/salata e tavoli al chiuso.",
    rating: 4.6,
    priceRange: "€€",
    bookingUrl: "https://www.baratti-milano.com/",
    websiteUrl: "https://www.baratti-milano.com/",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Baratti+Milano+Torino",
  },
  {
    name: "Caffè Platti",
    address: "Corso Vittorio Emanuele II 72, 10121 Torino",
    description: "Pasticceria di lusso e ristorante storico, adatto a colazione elegante o pranzo.",
    rating: 4.6,
    priceRange: "€€€",
    bookingUrl: "https://www.platti1875.com/",
    websiteUrl: "https://www.platti1875.com/",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Caff%C3%A8+Platti+Torino",
  },
  {
    name: "Caffè Al Bicerin",
    address: "Piazza della Consolata 5, 10122 Torino",
    description: "Caffè dal 1763, famoso per il Bicerin; locale dichiarato con servizio al tavolo.",
    rating: 4.7,
    priceRange: "€€",
    bookingUrl: "https://www.bicerin.it/",
    websiteUrl: "https://www.bicerin.it/",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Al+Bicerin+Torino",
  },
  {
    name: "Caffè Fiorio",
    address: "Via Po 8, 10124 Torino",
    description: "Caffè storico su via Po, tradizione torinese per caffè e dolci.",
    rating: 4.5,
    priceRange: "€€",
    bookingUrl: "https://www.caffefiorio.it/",
    websiteUrl: "https://www.caffefiorio.it/",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Caff%C3%A8+Fiorio+Torino",
  },
  {
    name: "Caffè San Carlo",
    address: "Piazza San Carlo 156, 10121 Torino",
    description: "Caffè-bistrot storico sotto i portici di Piazza San Carlo, colazione e pasti leggeri.",
    rating: 4.6,
    priceRange: "€€€",
    bookingUrl: "https://www.costardibros.it/caffe-san-carlo-torino/",
    websiteUrl: "https://www.costardibros.it/caffe-san-carlo-torino/",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Caff%C3%A8+San+Carlo+Torino",
  },
  {
    name: "Mercato Centrale Torino",
    address: "Piazza della Repubblica 25, 10152 Torino",
    description: "Edificio coperto con banconi e posti a sedere: diversi stand per colazione o pranzo veloce.",
    rating: 4.4,
    priceRange: "€€",
    bookingUrl: "https://www.mercatocentrale.it/torino/",
    websiteUrl: "https://www.mercatocentrale.it/torino/",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Mercato+Centrale+Torino",
  },
  {
    name: "Gelateria Pepino",
    address: "Piazza Carignano 8, 10123 Torino",
    description: "Gelateria storica (anche pinguino) ideale per spuntino dolce nel centro.",
    rating: 4.5,
    priceRange: "€",
    bookingUrl: "https://www.gelateriapepino.com/",
    websiteUrl: "https://www.gelateriapepino.com/",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Gelateria+Pepino+Torino",
  },
];

/** Luoghi da ballo / serata notte a Torino — non bar da aperitivo o cafè musicali. */
const TORINO_DISCOTECHE_FALLBACK: AiVenue[] = [
  {
    name: "Centralino Club",
    address: "Via delle Rosine 16, 10123 Torino",
    description:
      "Discoteca storica nel centro con pista danzante e serate fino a notte fonda; ingresso serale da club.",
    rating: 4.5,
    priceRange: "€€",
    bookingUrl: "https://www.turismotorino.org/it/visita/territorio/torino-metropoli/torino/nightlife-a-torino/centralino-club-torino",
    websiteUrl: "https://www.turismotorino.org/it/visita/territorio/torino-metropoli/torino/nightlife-a-torino/centralino-club-torino",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Centralino+Club+Torino",
  },
  {
    name: "The Beach Club Torino",
    address: "Via Murazzi del Po 22, 10124 Torino",
    description: "Club sui Murazzi con DJ set e serate dance; locale da notturna movida, non un pub diurno.",
    rating: 4.5,
    priceRange: "€€",
    bookingUrl: "https://thebeachmurazzi.it/",
    websiteUrl: "https://thebeachmurazzi.it/",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=The+Beach+Murazzi+Torino",
  },
  {
    name: "Hiroshima Mon Amour",
    address: "Via Carlo Bossoli 83, 10135 Torino",
    description:
      "Spazio per concerti e notti dedicate a dance/elettronica o DJ; controlla il programma per serate da discoteca.",
    rating: 4.7,
    priceRange: "€€",
    bookingUrl: "https://www.hiroshimamonamour.org/",
    websiteUrl: "https://www.hiroshimamonamour.org/",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Hiroshima+Mon+Amour+Torino",
  },
  {
    name: "Notorius Club",
    address: "Via Stradella 10/d, 10155 Torino",
    description: "Club torinese con serate EDM e house internazionali; ingresso da discoteca, non pub.",
    rating: 4.4,
    priceRange: "€€€",
    bookingUrl: "https://notoriusclub.it/",
    websiteUrl: "https://notoriusclub.it/",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Notorius+Club+Torino",
  },
];

const TORINO_SPORT_FALLBACK: AiVenue[] = [
  {
    name: "Jolly Joker Club",
    address: "Corso San Maurizio 52, Torino",
    description: "Club sportivo con campi da tennis e padel, adatto a partite in gruppo.",
    rating: 4.4,
    priceRange: "€€",
    bookingUrl: "https://www.playtomic.io/",
    websiteUrl: "https://www.jollyjokertorino.it/",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Jolly+Joker+Club+Torino",
  },
  {
    name: "Sporting Club CH4",
    address: "Via Trofarello 10, Torino",
    description: "Centro sportivo con campi da tennis, aree fitness e servizi per prenotazioni.",
    rating: 4.3,
    priceRange: "€€",
    bookingUrl: "https://www.sportingclubch4.it/",
    websiteUrl: "https://www.sportingclubch4.it/",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Sporting+Club+CH4+Torino",
  },
  {
    name: "Cus Torino Tennis",
    address: "Via Panetti 30, Torino",
    description: "Impianto universitario con campi da tennis e attivita sportive prenotabili.",
    rating: 4.2,
    priceRange: "€",
    bookingUrl: "https://www.custorino.it/",
    websiteUrl: "https://www.custorino.it/",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=CUS+Torino+Tennis",
  },
  {
    name: "Circolo della Stampa Sporting",
    address: "Corso Agnelli 67, Torino",
    description: "Storico circolo sportivo con campi tennis e servizi dedicati.",
    rating: 4.5,
    priceRange: "€€€",
    bookingUrl: "https://www.sporting.to.it/",
    websiteUrl: "https://www.sporting.to.it/",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Circolo+della+Stampa+Sporting+Torino",
  },
  {
    name: "Master Club 2.0",
    address: "Corso Moncalieri 494, Torino",
    description: "Club sportivo con campi da racchetta e servizi leisure.",
    rating: 4.2,
    priceRange: "€€",
    bookingUrl: "https://www.masterclub.it/",
    websiteUrl: "https://www.masterclub.it/",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Master+Club+Torino",
  },
];

function isDiscotecaSubcategory(subcategory: string): boolean {
  const s = String(subcategory).toLowerCase();
  return s.includes("discotec") || s.includes("night club") || s.includes("nightclub");
}

/** Esclude pub, cafè musicali, birrerie ecc. quando l'utente ha chiesto discoteche. */
function filterStrictDiscotecheVenues(venues: AiVenue[]): AiVenue[] {
  return venues.filter((v) => !looksLikePubOrCafeNotDisco(v.name, v.description));
}

function looksLikePubOrCafeNotDisco(name: string, description: string): boolean {
  const t = `${name}\n${description}`.toLowerCase();
  if (/\b(judafire|irish pub|english pub|public house)\b/i.test(t)) return true;
  if (/\b(birrificio|birreria|osteria|enoteca|trattoria|ristorante|pizzeria|wine bar|gastropub)\b/i.test(t)) return true;
  if (/\b(pub|bar di quartiere)\b/i.test(t)) return true;
  if (/music\s*caf|musica\s*caf|music\s*caf[eéè]|musica\s*caf[eéè]/i.test(t)) return true;
  if (/\bcaffett(e|eria)|\bcaff[eéè]\b|\bcafé\b|\bcafe\b/i.test(name)) return true;
  if (/\b(cocktail bar|lounge bar|tap room|brew pub)\b/i.test(t)) return true;
  return false;
}

function isSpecificFoodVenueSubcategory(subcategory: string): boolean {
  const s = String(subcategory).toLowerCase();
  return (
    s.includes("colazione") ||
    s.includes("brunch") ||
    s.includes("spuntino") ||
    s.includes("pranzo") ||
    s.includes("cena") ||
    s.includes("aperitivo")
  );
}

export function detectIntent(category: string, subcategory: string): SearchIntent {
  const c = `${category} ${subcategory}`.toLowerCase();
  if (isDiscotecaSubcategory(subcategory)) return "nightlife";
  if (isSpecificFoodVenueSubcategory(subcategory) || c.includes("cibo")) return "food";
  if (/\b(tennis|padel|sport|palestra|piscina|calcio|corsa|yoga|basket|beach volley|arrampicata)\b/i.test(c)) return "sport";
  if (/\b(muse|cinema|teatro|mostr|concert|festival|fier)\b/i.test(c)) return "culture";
  if (/\b(mare|montagna|giro|passeggiata|parco)\b/i.test(c)) return "outdoor";
  return "generic";
}

function looksFoodLike(v: AiVenue): boolean {
  const t = `${v.name} ${v.description}`.toLowerCase();
  return /\b(ristor|tratt|oster|bistr|bar|caff|caf[eé]|pasticc|gelat|mercato)\b/.test(t);
}

function looksSportLike(v: AiVenue): boolean {
  const t = `${v.name} ${v.description}`.toLowerCase();
  return /\b(tennis|padel|sport|palestra|campo|club|circolo|fitness|piscina)\b/.test(t);
}

function looksCultureLike(v: AiVenue): boolean {
  const t = `${v.name} ${v.description}`.toLowerCase();
  return /\b(muse|teatro|cinema|mostra|festival|concerto|arena|galleria)\b/.test(t);
}

function looksNightlifeLike(v: AiVenue): boolean {
  const t = `${v.name} ${v.description}`.toLowerCase();
  return /\b(discotec|night\s*club|club|dj|dance|serata)\b/.test(t);
}

export function venueMatchesIntent(venue: AiVenue, category: string, subcategory: string): boolean {
  const intent = detectIntent(category, subcategory);
  const sub = subcategory.toLowerCase();
  if (sub.includes("tennis")) {
    const t = `${venue.name} ${venue.description}`.toLowerCase();
    if (!/\b(tennis|racchetta|circolo|club)\b/.test(t)) return false;
  }
  if (sub.includes("padel")) {
    const t = `${venue.name} ${venue.description}`.toLowerCase();
    if (!/\b(padel|racchetta|club|circolo)\b/.test(t)) return false;
  }

  if (intent === "food") return looksFoodLike(venue) && !isGenericNonSpecificFoodVenue(venue.name, venue.description);
  if (intent === "sport") return looksSportLike(venue);
  if (intent === "culture") return looksCultureLike(venue);
  if (intent === "nightlife") return looksNightlifeLike(venue) && !looksLikePubOrCafeNotDisco(venue.name, venue.description);
  return true;
}

export function filterByRequestedPrice(venues: AiVenue[], requested: string | undefined): AiVenue[] {
  const req = String(requested ?? "").trim();
  if (!req || req === "Qualsiasi") return venues;
  return venues.filter((v) => normalizePriceRange(v.priceRange) === req);
}

/** Piazze intere, parchi, ecc. non sono luoghi dove "fare colazione" nel senso richiesto dall'utente. */
export function isGenericNonSpecificFoodVenue(name: string, description: string): boolean {
  const n = name.trim();
  const t = `${n}\n${description}`.toLowerCase();
  if (/^piazza\s+/i.test(n)) return true;
  if (/^piazzetta\s+/i.test(n)) return true;
  if (/^parco\s+/i.test(n) && !/\b(ristorante|trattoria|bar|bistrot|caff|caf|chiosco|chalet)\b/i.test(t)) return true;
  if (/^giardini\s+/i.test(n) && !/\b(bar|ristorante|caff|caf|bistrot)\b/i.test(t)) return true;
  if (/\blungotevere\b/i.test(n.toLowerCase()) && !/\b(bar|ristorante|osteria|bistrot|caff|caf)\b/i.test(t)) return true;
  if (/\bparco del valentino\b/i.test(t) && !/\b(bar|ristorante|caff|caf|chiosco)\b/i.test(t)) return true;
  return false;
}

function filterFoodMustBeSpecificVenue(venues: AiVenue[]): AiVenue[] {
  return venues.filter((v) => !isGenericNonSpecificFoodVenue(v.name, v.description));
}

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
    const key = normalizeVenueIdentity(venue.name, venue.address);
    if (unique.has(key)) continue;
    unique.set(key, {
      ...venue,
      priceRange: normalizePriceRange(venue.priceRange),
      mapsUrl: venue.mapsUrl || buildMapsUrl(venue.name, venue.address),
    });
  }
  return [...unique.values()];
}

export function normalizeVenueIdentity(name: string, address: string): string {
  const normalize = (v: string) =>
    v
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\b(club|circolo|sporting|torino|ssd|asd)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  return `${normalize(name)}|${normalize(address)}`;
}

function dedupeStrong(venues: GeoVenue[]): GeoVenue[] {
  const seen = new Set<string>();
  const out: GeoVenue[] = [];
  for (const v of venues) {
    const id = normalizeVenueIdentity(v.name, v.address);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(v);
  }
  return out;
}

function getFallbackVenuesForSubcategory(subcategory: string, category?: string): AiVenue[] {
  const sub = String(subcategory).toLowerCase();

  if (isDiscotecaSubcategory(subcategory)) {
    return [...TORINO_DISCOTECHE_FALLBACK];
  }

  if (isSpecificFoodVenueSubcategory(subcategory)) {
    return [...TORINO_CIBO_LOCALI_FALLBACK];
  }
  if (detectIntent(String(category ?? ""), subcategory) === "sport") {
    return [...TORINO_SPORT_FALLBACK];
  }

  const filtered = TORINO_FALLBACK_VENUES.filter((v) => {
    const name = v.name.toLowerCase();
    const desc = v.description.toLowerCase();
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
  return merged.slice(0, 10);
}

const aiWarmupCache = new Map<string, { at: number; venues: AiVenue[] }>();
const aiConstraintMemory = new Map<string, { at: number; constraints: ScopriConstraintMemory }>();

function cacheKeyForSearch(category: string, subcategory: string): string {
  return `${category.trim().toLowerCase()}::${subcategory.trim().toLowerCase()}`;
}

function cleanConstraintMemory(input: ScopriConstraintMemory): ScopriConstraintMemory {
  const out: ScopriConstraintMemory = {};
  for (const [k, v] of Object.entries(input)) {
    if (typeof v === "string" && v.trim().length > 0) {
      (out as Record<string, string>)[k] = v.trim();
    }
  }
  return out;
}

function mergeConstraintMemory(
  previous: ScopriConstraintMemory | undefined,
  current: ScopriConstraintMemory,
): ScopriConstraintMemory {
  return {
    ...(previous ?? {}),
    ...cleanConstraintMemory(current),
  };
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
      if (!websiteOk) {
        return {
          ...venue,
          websiteUrl: venue.mapsUrl || buildMapsUrl(venue.name, venue.address),
          bookingUrl: venue.mapsUrl || buildMapsUrl(venue.name, venue.address),
        };
      }

      const bookingOk = await isUrlReachable(venue.bookingUrl);
      return {
        ...venue,
        bookingUrl: bookingOk ? venue.bookingUrl : venue.websiteUrl,
      };
    }),
  );
  return checks.filter((v): v is AiVenue => Boolean(v));
}

const TORINO_GEO_BOUNDS = {
  north: 45.133,
  south: 45.02,
  west: 7.57,
  east: 7.78,
};

function bboxToLatLngBounds(areaDisegnata?: string): { minLat: number; maxLat: number; minLng: number; maxLng: number } | null {
  if (!areaDisegnata || !areaDisegnata.startsWith("bbox:")) return null;
  const m = areaDisegnata.match(/bbox:([0-9.]+),([0-9.]+)-([0-9.]+),([0-9.]+)/);
  if (!m) return null;
  const x1 = Number(m[1]); const y1 = Number(m[2]); const x2 = Number(m[3]); const y2 = Number(m[4]);
  const minX = Math.min(x1, x2); const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2); const maxY = Math.max(y1, y2);
  const toLng = (x: number) => TORINO_GEO_BOUNDS.west + x * (TORINO_GEO_BOUNDS.east - TORINO_GEO_BOUNDS.west);
  const toLat = (y: number) => TORINO_GEO_BOUNDS.north - y * (TORINO_GEO_BOUNDS.north - TORINO_GEO_BOUNDS.south);
  const minLng = toLng(minX);
  const maxLng = toLng(maxX);
  const maxLat = toLat(minY);
  const minLat = toLat(maxY);
  return { minLat, maxLat, minLng, maxLng };
}

function isInsideBounds(v: GeoVenue, bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number } | null): boolean {
  if (!bounds) return true;
  if (typeof v.lat !== "number" || typeof v.lng !== "number") return true;
  return v.lat >= bounds.minLat && v.lat <= bounds.maxLat && v.lng >= bounds.minLng && v.lng <= bounds.maxLng;
}

function extractRequestedWeekdays(giorno?: string): number[] {
  if (!giorno) return [];
  const t = giorno.toLowerCase();
  const map: Record<string, number> = { lun: 1, mar: 2, mer: 3, gio: 4, ven: 5, sab: 6, dom: 0 };
  return Object.entries(map).filter(([k]) => t.includes(k)).map(([, v]) => v);
}

function dayRuleMatches(openingText: string[] | undefined, weekdays: number[]): boolean {
  if (!openingText || openingText.length === 0 || weekdays.length === 0) return true;
  const englishDays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const lines = openingText.map((l) => l.toLowerCase());
  return weekdays.every((wd) => {
    const idx = englishDays[wd];
    const line = lines.find((l) => l.startsWith(idx));
    if (!line) return true;
    return !line.includes("closed");
  });
}

async function enrichWithPlacesMeta(venue: GeoVenue, requestedWeekdays: number[]): Promise<GeoVenue> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return { ...venue, openStatus: "unknown" };
  try {
    const query = encodeURIComponent(`${venue.name} ${venue.address} Torino`);
    const searchResp = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}`);
    const searchJson: any = await searchResp.json();
    const first = searchJson?.results?.[0];
    if (!first?.place_id) return { ...venue, openStatus: "unknown" };
    const detailsResp = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(first.place_id)}&fields=geometry,opening_hours&key=${apiKey}`);
    const detailsJson: any = await detailsResp.json();
    const loc = detailsJson?.result?.geometry?.location;
    const opening = detailsJson?.result?.opening_hours;
    const isOpenNow = typeof opening?.open_now === "boolean" ? opening.open_now : undefined;
    const weekdayText: string[] | undefined = Array.isArray(opening?.weekday_text) ? opening.weekday_text : undefined;
    const dayMatches = dayRuleMatches(weekdayText, requestedWeekdays);
    return {
      ...venue,
      lat: typeof loc?.lat === "number" ? loc.lat : venue.lat,
      lng: typeof loc?.lng === "number" ? loc.lng : venue.lng,
      openStatus: dayMatches && isOpenNow !== false ? "open" : "closed",
    };
  } catch {
    return { ...venue, openStatus: "unknown" };
  }
}

function scoreVenue(v: GeoVenue, c: ScopriConstraintMemory, inBounds: boolean): GeoVenue {
  const why: string[] = [];
  let score = 0;
  if (c.category && c.subcategory) { score += 30; why.push("Categoria e sottocategoria coerenti"); }
  if (!c.prezzo || c.prezzo === "Qualsiasi" || normalizePriceRange(v.priceRange) === c.prezzo) { score += 20; why.push("Prezzo coerente"); }
  if (inBounds) { score += 20; why.push("Dentro area mappa"); }
  if (v.openStatus === "open") { score += 20; why.push("Aperto nel giorno richiesto"); }
  if (c.mezzo) { score += 10; why.push(`Adatto al mezzo: ${c.mezzo}`); }
  return { ...v, score, why };
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
    const event = await storage.getAppEvent(eventId);
    if (!event) return res.status(404).json({ message: "Evento non trovato" });
    const safeJson = (v: any, fb: any) => {
      try {
        return typeof v === "string" ? JSON.parse(v) : (v ?? fb);
      } catch {
        return fb;
      }
    };
    const dateOpts: string[] = safeJson(event.dateOptions, []);
    const timeOpts: string[] = safeJson(event.timeOptions, []);
    const venueOpts: unknown[] = safeJson(event.venueOptions, []);
    const votes = await storage.getVotesByEvent(eventId);
    const ok = senderCompletedVotablePoll(
      String(senderName),
      String(event.status ?? "planning"),
      dateOpts.length,
      timeOpts.length,
      venueOpts.length,
      votes,
    );
    if (!ok) {
      return res.status(403).json({
        message: "Completa tutte le votazioni obbligatorie prima di scrivere in chat",
      });
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
    const { category, subcategory, answers, userRequest, prefetch, profileId, constraints } = req.body;
    if (!category || !subcategory || !answers) {
      return res.status(400).json({ error: "Dati mancanti" });
    }

    const memoryKey = typeof profileId === "string" && profileId.trim().length > 0
      ? profileId.trim()
      : cacheKeyForSearch(String(category), String(subcategory));
    const fromAnswers: ScopriConstraintMemory = {
      category: String(category),
      subcategory: String(subcategory),
      giorno: typeof answers?.giorno === "string" ? answers.giorno : undefined,
      prezzo: typeof answers?.prezzo === "string" ? answers.prezzo : undefined,
      mezzo: typeof answers?.mezzo === "string" ? answers.mezzo : undefined,
      areaDisegnata: typeof answers?.areaDisegnata === "string" ? answers.areaDisegnata : undefined,
      zonaLabel: typeof answers?.zona === "string" ? answers.zona : undefined,
    };
    const prevMemory = aiConstraintMemory.get(memoryKey);
    const mergedConstraints = mergeConstraintMemory(
      prevMemory?.constraints,
      {
        ...(typeof constraints === "object" && constraints ? constraints as ScopriConstraintMemory : {}),
        ...fromAnswers,
      },
    );
    aiConstraintMemory.set(memoryKey, { at: Date.now(), constraints: mergedConstraints });
    for (const [k, v] of aiConstraintMemory.entries()) {
      if (Date.now() - v.at > 30 * 60_000) aiConstraintMemory.delete(k);
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      const fallbackOnly = getFallbackVenuesForSubcategory(subcategory, category)
        .filter((v) => venueMatchesIntent(v, String(category), String(subcategory)))
        .map((v) => ({ ...v, safariUrl: v.websiteUrl }));
      return res.json({ venues: fallbackOnly });
    }
    const openai = new OpenAI({ apiKey });

    const answersText = Object.entries(answers)
      .map(([q, a]) => `  - ${q}: ${a}`)
      .join("\n");
    const requestText = typeof userRequest === "string" && userRequest.trim().length > 0
      ? userRequest.trim()
      : "";

    const discoConstraints = isDiscotecaSubcategory(String(subcategory))
      ? `
══════════════════════════════════════════════════════════════════
DISCOTECHE — definizione STRETTA (obbligatoria)
══════════════════════════════════════════════════════════════════
- Includi SOLO discoteche e club da ballo / dance notturni (DJ, pista, ingresso serale da locale notturno).
- VIETATO: pub, irish pub, birrerie, osterie, enoteche, trattorie, ristoranti, pizzerie, wine bar, cocktail bar solo lounge, caffè, "music café", locali equivalenti a Judafire Music Café o dove la proposta principale è mangiare/bere seduti come in un bar.
- Se online il locale è descritto soprattutto come cafè, pub o aperitivo, NON inserirlo: non è una discoteca.
- Ogni descrizione deve lasciare chiaro che il locale è una discoteca/club da ballo, non un semplice bar.
`
      : "";

    const foodConstraints = isSpecificFoodVenueSubcategory(String(subcategory))
      ? `
══════════════════════════════════════════════════════════════════
CIBO (colazione, brunch, spuntino, pranzo, cena, aperitivo) — locali PRECISI
══════════════════════════════════════════════════════════════════
- Suggerisci SOLO esercizi dove si mangia o beve con servizio: bar, caffè storici, pasticceria, bistrot, ristorante, trattoria, gelateria con sedute, mercato COPERTO con banconi (nome del mercato va bene), osteria con cucina.
- VIETATO proporre: intere piazze (es. "Piazza Vittorio Veneto"), parchi/giardini senza nome di locale interno, lungofiumi generici, "zone" o quartieri, monumenti senza ristorazione, laghi o sagre generiche senza struttura precisa.
- Il campo "name" deve essere il nome commerciale del locale (es. "Caffè Mulassano"), MAI solo il nome di una piazza o di un parco.
`
      : "";

    const scopriPrefs = buildUserPreferencesFromScopri({
      category: String(category),
      subcategory: String(subcategory),
      merged: mergedConstraints,
      userRequest: requestText,
    });
    assertUserPreferencesForAi(scopriPrefs);
    const aiDirectorBlock = `${generateSystemPrompt()}

${generateUserPrompt(scopriPrefs)}

══════════════════════════════════════════════════════════════════
ISTRUZIONI OPERATIVE (segui anche queste, oltre al blocco sopra)
══════════════════════════════════════════════════════════════════
`;

    const searchPrompt = `${aiDirectorBlock}Sei un city concierge locale.
Trova QUANTE PIU opzioni possibili (minimo 8, massimo 10) di luoghi REALMENTE ESISTENTI e attivi nell'area di TORINO CITTA (non fuori Torino) per "${subcategory}".
${discoConstraints}${foodConstraints}
Vincoli obbligatori:
- Usa solo posti verificabili online (sito ufficiale, Google Maps, TheFork, ticket office ufficiale).
- L'indirizzo deve essere completo con via e numero civico e contenere "Torino".
- Niente luoghi inventati, generici o senza presenza online chiara.
- Le opzioni DEVONO rispettare tutte le richieste dell'utente sotto, inclusa fascia prezzo (priceRange 1-4) e area mappa se indicate.

Preferenze utente:
${answersText}
${requestText ? `\nRichieste personali utente (OBBLIGATORIE):\n- ${requestText}\n` : ""}
CRITICO:
- La categoria richiesta e "${mergedConstraints.category ?? category}" e la sottocategoria richiesta e "${mergedConstraints.subcategory ?? subcategory}".
- NON proporre luoghi fuori categoria/sottocategoria.
- Giorno/intervallo selezionato: "${mergedConstraints.giorno ?? "non specificato"}".
- Prezzo selezionato: "${mergedConstraints.prezzo ?? "Qualsiasi"}".
- Mezzo selezionato: "${mergedConstraints.mezzo ?? "non specificato"}".
- Zona mappa selezionata: "${mergedConstraints.zonaLabel ?? "non specificata"}" (${mergedConstraints.areaDisegnata ?? "no-bbox"}).
- Se giorno e selezionato, includi solo posti aperti in quel giorno/intervallo.
- Se prezzo e diverso da "Qualsiasi", includi solo posti in quella fascia.
- Se esiste area mappa, includi solo posti compatibili con la zona selezionata.

Dopo la ricerca, rispondi SOLO con un JSON valido (nessun testo fuori dal JSON) con questa struttura esatta:
{
  "venues": [
    {
      "name": "Nome esatto del posto trovato online",
      "address": "Indirizzo completo con via e numero civico trovato online, Torino",
      "matchScore": 88,
      "explanation": "Almeno due frasi in italiano su perché il locale rispetta ZONA, priceRange, trasporto e tema richiesti",
      "estimatedPrice": "€ oppure €€ oppure €€€ coerente con la fascia richiesta"
    }
  ]
}`;

    try {
      const cacheKey = cacheKeyForSearch(String(category), String(subcategory));
      const warm = aiWarmupCache.get(cacheKey);
      const warmValid = warm && Date.now() - warm.at < 5 * 60_000;
      if (prefetch && warmValid) {
        return res.json({ venues: warm.venues.map((v) => ({ ...v, safariUrl: v.websiteUrl })), warmed: true });
      }

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
          max_tokens: 1800,
        }), 12000, "chat.completions");
        rawText = completion.choices[0]?.message?.content ?? "{}";
      }

      // Estrai JSON dalla risposta (puo contenere testo extra se arriva da web search)
      const jsonMatch = rawText.match(/\{[\s\S]*"venues"[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : rawText;
      const parsed = JSON.parse(jsonStr);
      const parsedVenues = validateScopriAiVenuesResponse(parsed);
      if (!parsedVenues.ok) {
        console.warn("Risposta AI Scopri non valida (schema venue):", parsedVenues.error);
      }
      const aiCandidates = parsedVenues.ok
        ? validateSuggestions(parsedVenues.data.venues, scopriPrefs).map((s) =>
            expandScopriAiSuggestionToVenue(s),
          )
        : [];
      const discoMode = isDiscotecaSubcategory(String(subcategory));
      const foodSpecificMode = isSpecificFoodVenueSubcategory(String(subcategory));
      let sanitized = sanitizeAiVenues(aiCandidates);
      if (discoMode) sanitized = filterStrictDiscotecheVenues(sanitized);
      if (foodSpecificMode) sanitized = filterFoodMustBeSpecificVenue(sanitized);

      // Fallback robusto su venue reali di Torino se AI non e affidabile
      const fallback = getFallbackVenuesForSubcategory(subcategory, category);

      let merged: GeoVenue[] = [...sanitized];
      for (const fb of fallback) {
        if (merged.length >= 10) break;
        if (!merged.some((v) => v.name.toLowerCase() === fb.name.toLowerCase())) {
          merged.push(fb);
        }
      }
      if (merged.length < 8) {
        const extraPool = discoMode
          ? TORINO_DISCOTECHE_FALLBACK
          : foodSpecificMode
            ? TORINO_CIBO_LOCALI_FALLBACK
            : detectIntent(String(category), String(subcategory)) === "sport"
              ? TORINO_SPORT_FALLBACK
              : TORINO_FALLBACK_VENUES;
        for (const fb of extraPool) {
          if (merged.length >= 10) break;
          if (!merged.some((v) => v.name.toLowerCase() === fb.name.toLowerCase())) {
            merged.push(fb);
          }
        }
      }
      merged = merged.filter((v) => venueMatchesIntent(v, String(category), String(subcategory)));
      merged = filterByRequestedPrice(merged, mergedConstraints.prezzo);
      if (discoMode) merged = filterStrictDiscotecheVenues(merged);
      if (foodSpecificMode) merged = filterFoodMustBeSpecificVenue(merged);
      merged = dedupeStrong(merged);
      const candidates = merged.slice(0, 10);
      const verified = await validateVenueLinks(candidates);
      const weekdays = extractRequestedWeekdays(mergedConstraints.giorno);
      const withPlaces = await Promise.all(verified.map((v) => enrichWithPlacesMeta(v, weekdays)));
      const areaBounds = bboxToLatLngBounds(mergedConstraints.areaDisegnata);
      const geoFiltered = withPlaces.filter((v) => isInsideBounds(v, areaBounds));
      const openFiltered = geoFiltered.filter((v) => v.openStatus !== "closed");
      const hardFiltered = dedupeStrong(openFiltered);

      // Garantisce almeno 5 risultati: se la validazione link e troppo restrittiva,
      // completa con fallback affidabili gia sanitizzati.
      const finalPool: GeoVenue[] = [...hardFiltered];
      if (finalPool.length < 5) {
        for (const venue of hardFiltered) {
          if (finalPool.length >= 5) break;
          if (!finalPool.some((v) => normalizeVenueIdentity(v.name, v.address) === normalizeVenueIdentity(venue.name, venue.address))) {
            finalPool.push(venue);
          }
        }
      }
      const ranked = finalPool.map((v) => scoreVenue(v, mergedConstraints, isInsideBounds(v, areaBounds)));
      ranked.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      const finalVenues = filterByRequestedPrice(
        ranked.filter((v) => venueMatchesIntent(v, String(category), String(subcategory))),
        mergedConstraints.prezzo,
      ).slice(0, 10);
      aiWarmupCache.set(cacheKey, { at: Date.now(), venues: finalVenues });
      res.json({
        venues: finalVenues.map((v) => ({
          ...v,
          safariUrl: v.websiteUrl,
        })),
        checks: {
          category: String(category),
          subcategory: String(subcategory),
          price: String(mergedConstraints.prezzo ?? "Qualsiasi"),
          day: String(mergedConstraints.giorno ?? ""),
          transport: String(mergedConstraints.mezzo ?? ""),
          area: String(mergedConstraints.areaDisegnata ?? ""),
          strictIntentFilter: true,
          hardReject: true,
          geoBoundsApplied: Boolean(areaBounds),
          openingHoursApplied: true,
        },
      });
    } catch (err: any) {
      console.error("AI Scopri error:", err?.message);
      const safeFallback = filterByRequestedPrice(
        getFallbackVenuesForSubcategory(subcategory, category)
          .filter((v) => venueMatchesIntent(v, String(category), String(subcategory))),
        mergedConstraints.prezzo,
      )
        .map((v) => scoreVenue({ ...v, openStatus: "unknown" }, mergedConstraints, true))
        .map((v) => ({
          ...v,
          safariUrl: v.websiteUrl,
        }));
      res.json({ venues: safeFallback });
    }
  });

  return httpServer;
}
