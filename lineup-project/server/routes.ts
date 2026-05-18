
import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import OpenAI from "openai";
import { logAiExchange, logAiPipelineSummary } from "./aiLog";
import { notifyPianificaDemoFeedbackByEmail } from "./pianificaDemoFeedback";
import {
  addPianificaDemoFeedback,
  deletePianificaDemoFeedback,
  listPianificaDemoFeedbacks,
  verifyPianificaDemoAdminPassword,
} from "./pianificaDemoStore";
import { buildUserPreferencesFromScopri } from "@shared/aiPrompts";
import { generateSystemPrompt, generateUserPrompt } from "../client/src/lib/ai-provider";
import {
  assertUserPreferencesForAi,
  expandScopriAiSuggestionToVenue,
  filterAiSuggestionsByUserRequest,
  scopriVenuePipelineSchema as aiVenueSchema,
  torinoVenueSearchItemSchema,
  validateScopriAiVenuesResponse,
  validateSuggestions,
  venueTextMatchesUserRequest,
} from "@shared/aiValidation";
import { senderCompletedVotablePoll } from "@shared/eventPoll";
import { allowsMemberProposals, parseSurveyMode, surveyBehavior } from "@shared/surveyModes";
import { LINEUP_DEMO_CONTACTS } from "@shared/contacts";
import { venueDisplayAddressLine } from "@shared/venueMapsAddress";

/** Tempo massimo per una singola risposta del modello AI verso il client (ms). */
const LINEUP_AI_MAX_RESPONSE_MS = 3000;
/** Ricerca luoghi in creazione evento: budget leggermente più alto ma risposta rapida via catalogo. */
const LINEUP_VENUE_AI_SEARCH_MS = 4500;
/** Dopo l’LLM Scopri: budget totale (link + Places) prima di rispondere, per non far scadere il client (ms). */
const LINEUP_SCOPRI_PIPELINE_BUDGET_MS = 14_000;

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
  /** Solo in pipeline server: HEAD sul sito ufficiale riuscito. */
  websiteReachable?: boolean;
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
  {
    name: "Palazzo Madama - Museo Civico d'Arte Antica",
    address: "Piazza Castello, 10122 Torino",
    description: "Museo in antico castello medievale-barocco: collezioni d'arte e vista panoramica sulla citta.",
    rating: 4.7,
    priceRange: "€€",
    bookingUrl: "https://www.palazzomadamatorino.it/",
    websiteUrl: "https://www.palazzomadamatorino.it/",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Palazzo+Madama+Torino",
  },
  {
    name: "Teatro Regio Torino",
    address: "Piazza Castello 215, 10124 Torino",
    description: "Teatro lirico e di prosa nel centro storico; programma stagionale e visite quando aperte.",
    rating: 4.8,
    priceRange: "€€€",
    bookingUrl: "https://www.teatroregio.torino.it/",
    websiteUrl: "https://www.teatroregio.torino.it/",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Teatro+Regio+Torino",
  },
  {
    name: "Pinacoteca Agnelli",
    address: "Via Nizza 230, 10126 Torino",
    description: "Galleria d'arte moderna e contemporanea sul tetto del Lingotto: mostre e vista sulla citta.",
    rating: 4.6,
    priceRange: "€€",
    bookingUrl: "https://www.pinacoteca-agnelli.it/",
    websiteUrl: "https://www.pinacoteca-agnelli.it/",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Pinacoteca+Agnelli+Torino",
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
  {
    name: "Trapizzino",
    address: "Piazza Carlo Emanuele II, Torino",
    description:
      "Street food romano: tramezzini farciti; sede torinese in piazza Carlo Emanuele II (centro).",
    rating: 4.5,
    priceRange: "€€",
    bookingUrl: "https://www.trapizzino.it/",
    websiteUrl: "https://www.trapizzino.it/",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Trapizzino+Torino",
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

const TORINO_VENUE_SEARCH_FALLBACK_POOL: AiVenue[] = [
  ...TORINO_FALLBACK_VENUES,
  ...TORINO_CIBO_LOCALI_FALLBACK,
  ...TORINO_DISCOTECHE_FALLBACK,
  ...TORINO_SPORT_FALLBACK,
];

type ClientVenueSearchJson = {
  name: string;
  rating: number;
  address: string;
  distance: string;
  mapsUrl: string;
  websiteUrl: string;
  instagramUrl?: string;
  /** Zona / quartiere per anteprima (senza via completa). */
  quartiere?: string;
};

const VENUE_AI_SEARCH_CACHE_TTL_MS = 120_000;
const VENUE_AI_SEARCH_CACHE_MAX = 48;
type VenueAiSearchCacheEntry = { at: number; venues: ClientVenueSearchJson[] };
const venueAiSearchCache = new Map<string, VenueAiSearchCacheEntry>();

function venueAiSearchCacheKey(q: string): string {
  return `v4:${q.trim().toLowerCase().slice(0, 120)}`;
}

function getVenueAiSearchCached(q: string): ClientVenueSearchJson[] | null {
  const k = venueAiSearchCacheKey(q);
  const e = venueAiSearchCache.get(k);
  if (!e || Date.now() - e.at > VENUE_AI_SEARCH_CACHE_TTL_MS) return null;
  return e.venues;
}

function setVenueAiSearchCached(q: string, venues: ClientVenueSearchJson[]): void {
  const k = venueAiSearchCacheKey(q);
  if (venueAiSearchCache.size >= VENUE_AI_SEARCH_CACHE_MAX) {
    const first = venueAiSearchCache.keys().next().value;
    if (first !== undefined) venueAiSearchCache.delete(first);
  }
  venueAiSearchCache.set(k, { at: Date.now(), venues });
}

function mapsSearchUrlForTorinoPlaceName(name: string): string {
  const q = `${String(name).trim()} Torino`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/** Query Maps orientata a un solo esercizio (nome tra virgolette + contesto Torino). */
function googleMapsSearchSingleIntentUrl(placeName: string, quartiereOrZone?: string): string {
  const name = String(placeName).trim();
  const bits: string[] = [];
  if (name) bits.push(`"${name}"`);
  const z = quartiereOrZone?.trim();
  if (z) bits.push(z);
  bits.push("Torino");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(bits.join(" "))}`;
}

function levenshteinDistance(aRaw: string, bRaw: string): number {
  const a = searchNormForVenueMatch(aRaw).replace(/\s+/g, "");
  const b = searchNormForVenueMatch(bRaw).replace(/\s+/g, "");
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n]!;
}

/** Nomi dal catalogo Torino vicini al testo digitato (refusi, lettere mancanti). */
function fuzzyCatalogVenueNamesForQuery(query: string, maxHints: number): string[] {
  const qn = searchNormForVenueMatch(query).trim();
  if (qn.length < 2) return [];
  const maxDist = qn.length <= 4 ? 2 : qn.length <= 8 ? 3 : 4;
  const scored: { name: string; d: number }[] = [];
  for (const v of TORINO_VENUE_SEARCH_FALLBACK_POOL) {
    const nn = searchNormForVenueMatch(v.name);
    const blob = `${nn} ${searchNormForVenueMatch(v.description)}`;
    if (nn.includes(qn) || qn.includes(nn) || blob.includes(qn)) {
      scored.push({ name: v.name, d: 0 });
      continue;
    }
    const d = levenshteinDistance(qn, nn);
    if (d <= maxDist) scored.push({ name: v.name, d });
  }
  scored.sort((x, y) => x.d - y.d || x.name.localeCompare(y.name, "it"));
  const out: string[] = [];
  const seen = new Set<string>();
  for (const s of scored) {
    const k = s.name.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s.name);
    if (out.length >= maxHints) break;
  }
  return out;
}

function normalizeClientVenueSearchJsonMaps(v: ClientVenueSearchJson): ClientVenueSearchJson {
  return {
    ...v,
    mapsUrl: googleMapsSearchSingleIntentUrl(v.name, v.quartiere),
  };
}

function mapTorinoVenueItemToClient(v: z.infer<typeof torinoVenueSearchItemSchema>): ClientVenueSearchJson {
  const rawAddress = v.address.trim();
  const qz = v.quartiere?.trim();
  const safeMapsUrl = googleMapsSearchSingleIntentUrl(v.name, qz);
  return {
    name: v.name,
    rating: Math.round(v.rating * 10) / 10,
    address: venueDisplayAddressLine({
      address: rawAddress,
      mapsUrl: safeMapsUrl,
      distance: "",
      placeName: v.name,
    }),
    distance: "",
    mapsUrl: safeMapsUrl,
    websiteUrl: v.websiteUrl,
    ...(v.instagramUrl ? { instagramUrl: v.instagramUrl } : {}),
    ...(qz ? { quartiere: qz } : {}),
  };
}

/** Accetta JSON parziale: scarta righe non valide invece di fallire tutta la risposta. */
function parseTorinoVenueAiItemsLoose(raw: unknown): ClientVenueSearchJson[] {
  if (raw === null || typeof raw !== "object") return [];
  const venuesRaw = (raw as { venues?: unknown }).venues;
  if (!Array.isArray(venuesRaw)) return [];
  const out: ClientVenueSearchJson[] = [];
  for (const item of venuesRaw) {
    const one = torinoVenueSearchItemSchema.safeParse(item);
    if (!one.success) continue;
    out.push(normalizeClientVenueSearchJsonMaps(mapTorinoVenueItemToClient(one.data)));
    if (out.length >= 5) break;
  }
  return out;
}

function aiVenueToClientSearchJson(v: AiVenue): ClientVenueSearchJson {
  const addressText = v.address.trim();
  const qz = v.quartiere?.trim();
  const mapsUrl = googleMapsSearchSingleIntentUrl(v.name, qz);
  return {
    name: v.name,
    rating: v.rating,
    address: venueDisplayAddressLine({
      address: addressText,
      mapsUrl,
      distance: "",
      placeName: v.name,
    }),
    distance: "",
    mapsUrl,
    websiteUrl: v.websiteUrl,
    ...(qz ? { quartiere: qz } : {}),
  };
}

function searchNormForVenueMatch(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function fallbackTorinoClientVenuesFromCatalog(query: string): ClientVenueSearchJson[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const qn = searchNormForVenueMatch(q);
  const scored: { v: AiVenue; rank: number }[] = [];
  const maxDist = qn.length <= 4 ? 2 : qn.length <= 8 ? 3 : 4;
  for (const v of TORINO_VENUE_SEARCH_FALLBACK_POOL) {
    const nn = searchNormForVenueMatch(v.name);
    const addr = searchNormForVenueMatch(v.address);
    const desc = searchNormForVenueMatch(v.description);
    let rank = 99;
    if (nn.includes(qn) || qn.includes(nn) || addr.includes(qn) || desc.includes(qn)) rank = 0;
    else {
      const d = Math.min(levenshteinDistance(qn, nn), levenshteinDistance(qn, addr.slice(0, 48)));
      if (d <= maxDist) rank = d + 1;
    }
    if (rank >= 99) continue;
    scored.push({ v, rank });
  }
  scored.sort((a, b) => a.rank - b.rank || a.v.name.localeCompare(b.v.name, "it"));
  const out: ClientVenueSearchJson[] = [];
  const used = new Set<string>();
  for (const { v } of scored) {
    const k = v.name.toLowerCase();
    if (used.has(k)) continue;
    used.add(k);
    out.push(normalizeClientVenueSearchJsonMaps(aiVenueToClientSearchJson(v)));
    if (out.length >= 8) break;
  }
  return out;
}

/** Se il catalogo Torino matcha bene, evita la chiamata OpenAI (risposta immediata). */
function tryInstantVenueCatalogOnly(query: string): ClientVenueSearchJson[] | null {
  const hits = fallbackTorinoClientVenuesFromCatalog(query);
  if (hits.length === 0) return null;
  const qn = searchNormForVenueMatch(query);
  if (qn.length < 2) return null;
  const topName = searchNormForVenueMatch(hits[0]!.name);
  if (topName.includes(qn) || qn.includes(topName)) return hits;
  if (hits.length >= 3) return hits;
  return null;
}

/** Match dal catalogo in testa, poi risultati AI (nomi deduplicati). */
function mergeCatalogWithAi(
  catalogHits: ClientVenueSearchJson[],
  ai: ClientVenueSearchJson[],
): ClientVenueSearchJson[] {
  const seen = new Set<string>();
  const out: ClientVenueSearchJson[] = [];
  for (const v of catalogHits) {
    const k = v.name.trim().toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
    if (out.length >= 8) return out;
  }
  for (const v of ai) {
    const k = v.name.trim().toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
    if (out.length >= 8) break;
  }
  return out;
}

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

/** Pranzo o cena: pasto al tavolo, non bar/caffè da colazione. */
function isMealLunchDinnerSubcategory(subcategory: string): boolean {
  const s = String(subcategory).toLowerCase();
  return s.includes("pranzo") || s.includes("cena");
}

function looksMealVenue(v: AiVenue): boolean {
  const blob = `${v.name} ${v.description}`.toLowerCase();
  return (
    /\b(ristorant|trattoria|osteria|pizzeria|bistrot|brasser|taverna|sushi|grill|steakhouse|braceria|mercato centrale|hub gastronom|banco gastron|menu.degust|menù degust)\b/i.test(blob) ||
    /\b(pranzo|cena)\b.{0,40}\b(menu|servizio al tavolo|tavoli|cart)\b/i.test(blob) ||
    /\b(cucina|gastronomia|osteria con cucina)\b/i.test(blob)
  );
}

/** Nome (e testo) da solo bar/caffè/pasticceria/gelateria — non adatto a pranzo/cena se non c'è anche ristorante nel nome. */
function isPrimarilyCafeBarPastryGelatoForMeal(name: string, description: string): boolean {
  const n = name.trim().toLowerCase();
  const blob = `${n} ${description}`.toLowerCase();
  if (/\b(ristorante|trattoria|osteria|pizzeria|bistrot|taverna)\b/i.test(n)) return false;
  if (/^(caffe|caffè)\s/i.test(n) || /^pasticcer|^gelater|^bar\s/i.test(n)) return true;
  if (/\bcaffè mulassano|caffè fiorio|baratti\s*&|bicerin|caffè platti|caffè san carlo\b/i.test(blob)) return true;
  return false;
}

function filterAiSuggestionsForMealLunchDinner<T extends { name: string; explanation: string }>(
  suggestions: T[],
  subcategory: string,
): T[] {
  if (!isMealLunchDinnerSubcategory(subcategory)) return suggestions;
  return suggestions.filter((s) => {
    if (isPrimarilyCafeBarPastryGelatoForMeal(s.name, s.explanation)) return false;
    const v = { name: s.name, description: s.explanation } as Pick<AiVenue, "name" | "description">;
    return looksMealVenue(v as AiVenue);
  });
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
  return /\b(ristorante|ristorant|trattoria|tratt|osteria|oster|bistr|bar|caff|caf[eé]|pasticc|gelat|mercato)\b/.test(t);
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

  if (intent === "food") {
    if (!looksFoodLike(venue) || isGenericNonSpecificFoodVenue(venue.name, venue.description)) return false;
    if (isMealLunchDinnerSubcategory(subcategory)) {
      if (isPrimarilyCafeBarPastryGelatoForMeal(venue.name, venue.description)) return false;
      if (!looksMealVenue(venue)) return false;
    }
    return true;
  }
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
      mapsUrl: googleMapsSearchSingleIntentUrl(venue.name, venue.quartiere),
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

type ScopriAiClientVenue = GeoVenue & { scopriVerification: "verified" | "suggestion"; safariUrl: string };

type ScopriAiCachePayload = {
  venues: ScopriAiClientVenue[];
  venuesVerified: ScopriAiClientVenue[];
  venuesMoreIdeas: ScopriAiClientVenue[];
};

const aiWarmupCache = new Map<string, { at: number; payload: ScopriAiCachePayload }>();
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
  const timeout = setTimeout(() => controller.abort(), 2200);
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

async function validateVenueLinks(venues: AiVenue[]): Promise<GeoVenue[]> {
  const checks = await Promise.all(
    venues.map(async (venue) => {
      const mapsFallback = googleMapsSearchSingleIntentUrl(venue.name, venue.quartiere);
      const websiteOk = await isUrlReachable(venue.websiteUrl);
      if (!websiteOk) {
        return {
          ...venue,
          mapsUrl: mapsFallback,
          websiteUrl: mapsFallback,
          bookingUrl: mapsFallback,
          websiteReachable: false,
        };
      }
      return {
        ...venue,
        mapsUrl: mapsFallback,
        bookingUrl: venue.websiteUrl,
        websiteReachable: true,
      };
    }),
  );
  return checks as GeoVenue[];
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

function buildCuratedVenueNameSet(): Set<string> {
  const s = new Set<string>();
  for (const v of [
    ...TORINO_FALLBACK_VENUES,
    ...TORINO_CIBO_LOCALI_FALLBACK,
    ...TORINO_DISCOTECHE_FALLBACK,
    ...TORINO_SPORT_FALLBACK,
  ]) {
    s.add(v.name.trim().toLowerCase());
  }
  return s;
}

const CURATED_VENUE_NAMES = buildCuratedVenueNameSet();

function isCuratedCatalogVenue(name: string): boolean {
  return CURATED_VENUE_NAMES.has(name.trim().toLowerCase());
}

function isStrongGeoMatch(v: GeoVenue, bounds: ReturnType<typeof bboxToLatLngBounds>): boolean {
  if (!bounds) return true;
  if (typeof v.lat !== "number" || typeof v.lng !== "number") return false;
  return isInsideBounds(v, bounds);
}

/** Catalogo curato, oppure sito raggiungibile + non chiuso + coordinate nella bbox se disegnata. */
function isVerifiedStrongVenue(v: GeoVenue, bounds: ReturnType<typeof bboxToLatLngBounds>): boolean {
  if (isCuratedCatalogVenue(v.name)) return true;
  if (!v.websiteReachable) return false;
  if (v.openStatus === "closed") return false;
  return isStrongGeoMatch(v, bounds);
}

function toScopriVenueJson(
  v: GeoVenue,
  tier: "verified" | "suggestion",
): GeoVenue & { scopriVerification: "verified" | "suggestion"; safariUrl: string } {
  const withMaps = {
    ...v,
    mapsUrl: googleMapsSearchSingleIntentUrl(v.name, v.quartiere),
  };
  const { websiteReachable: _w, ...rest } = withMaps;
  return {
    ...rest,
    safariUrl: rest.websiteUrl,
    scopriVerification: tier,
  };
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
  const placesFetchMs = 2200;
  try {
    const query = encodeURIComponent(`${venue.name} ${venue.address} Torino`);
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}`;
    const searchResp = await withTimeout(fetch(url), placesFetchMs + 400, "place-textsearch");
    if (!searchResp.ok) return { ...venue, openStatus: "unknown" };
    const searchJson: any = await searchResp.json();
    const first = searchJson?.results?.[0];
    if (!first) return { ...venue, openStatus: "unknown" };
    const loc = first.geometry?.location;
    const opening = first.opening_hours;
    const weekdayText: string[] | undefined = Array.isArray(opening?.weekday_text) ? opening.weekday_text : undefined;
    if (!weekdayText || weekdayText.length === 0) {
      return {
        ...venue,
        lat: typeof loc?.lat === "number" ? loc.lat : venue.lat,
        lng: typeof loc?.lng === "number" ? loc.lng : venue.lng,
        openStatus: "unknown",
      };
    }
    const isOpenNow = typeof opening?.open_now === "boolean" ? opening.open_now : undefined;
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
        surveyMode: parseSurveyMode(body.surveyMode),
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
    const { type, value, addedBy } = req.body;
    if (!type || !isNonEmptyString(value)) return res.status(400).json({ message: "Dati mancanti" });
    if (!["date", "time", "venue"].includes(type)) return res.status(400).json({ message: "Tipo non valido" });
    const actor = typeof addedBy === "string" ? addedBy.trim() : "";
    if (!actor) return res.status(400).json({ message: "addedBy obbligatorio" });
    const event = await storage.getAppEvent(id);
    if (!event) return res.status(404).json({ message: "Evento non trovato" });
    if (actor !== String(event.createdBy).trim()) {
      return res.status(403).json({ message: "Solo l'organizzatore può aggiungere opzioni dirette" });
    }

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
    const event = await storage.getAppEvent(id);
    if (!event) return res.status(404).json({ message: "Evento non trovato" });
    const actorName = typeof req.body?.actorName === "string" ? req.body.actorName.trim() : "";
    if (!actorName || actorName !== event.createdBy) {
      return res.status(403).json({ message: "Solo il creatore può annullare la conferma" });
    }
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

    // Attendance votes are mutually exclusive (yes/no/maybe): always clear previous attendance vote first
    if (voteType === "attendance") {
      const ev = await storage.getAppEvent(eventId);
      if (!ev) return res.status(404).json({ message: "Evento non trovato" });
      const attMode = surveyBehavior(parseSurveyMode((ev as { surveyMode?: string }).surveyMode)).attendance;
      const allowed = attMode === "ternary" ? ["yes", "no", "maybe"] : ["yes", "no"];
      if (!allowed.includes(String(voteValue))) {
        return res.status(400).json({ message: "Valore presenza non valido per questa modalità" });
      }
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
    const eventForVote = await storage.getAppEvent(eventId);
    if (!eventForVote) return res.status(404).json({ message: "Evento non trovato" });
    const surveyMode = parseSurveyMode((eventForVote as { surveyMode?: string }).surveyMode);
    const locked = surveyBehavior(surveyMode).lockSingleChoicePerCategory;

    const existing = await storage.getVotesByEvent(eventId);
    const alreadyVoted = existing.find(v =>
      v.voterName === voterName && v.voteType === voteType && v.voteValue === voteValue
    );
    if (alreadyVoted) {
      if (locked && ["date", "time", "venue"].includes(voteType)) {
        return res.status(403).json({ message: "In questa modalità il voto non è modificabile" });
      }
      await storage.deleteVote(eventId, voterName, voteType, voteValue);
      return res.json({ toggled: false });
    }
    if (locked && ["date", "time", "venue"].includes(voteType)) {
      await storage.deleteVotesByType(eventId, voterName, voteType);
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
    const eventForProposal = await storage.getAppEvent(eventId);
    if (!eventForProposal) return res.status(404).json({ message: "Evento non trovato" });
    const mode = parseSurveyMode((eventForProposal as { surveyMode?: string }).surveyMode);
    if (!allowsMemberProposals(mode) && String(proposerName).trim() !== String(eventForProposal.createdBy).trim()) {
      return res.status(403).json({ message: "In questa modalità solo l'organizzatore può suggerire nuove opzioni" });
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
    const actor = typeof creatorName === "string" ? creatorName.trim() : "";
    if (!actor) return res.status(400).json({ message: "creatorName obbligatorio" });

    const existingProposal = await storage.getProposalById(id);
    if (!existingProposal) return res.status(404).json({ message: "Proposta non trovata" });
    const evForProp = await storage.getAppEvent(existingProposal.eventId);
    if (!evForProp || String(evForProp.createdBy).trim() !== actor) {
      return res.status(403).json({ message: "Solo l'organizzatore può approvare o rifiutare" });
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
      (event as { surveyMode?: string }).surveyMode,
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

  // ── Friends ──
  app.get("/api/app/friends/:ownerName", async (req, res) => {
    const ownerName = decodeURIComponent(req.params.ownerName || "").trim();
    if (!ownerName) return res.status(400).json({ message: "Nome mancante" });
    const friends = await storage.getFriendsByOwner(ownerName);
    res.json({ friends });
  });

  app.post("/api/app/friends", async (req, res) => {
    const { ownerName, friendName } = req.body || {};
    if (!ownerName || !friendName) return res.status(400).json({ message: "Dati mancanti" });
    await storage.addFriend(String(ownerName).trim(), String(friendName).trim());
    res.status(201).json({ ok: true });
  });

  app.delete("/api/app/friends/:ownerName/:friendName", async (req, res) => {
    const ownerName = decodeURIComponent(req.params.ownerName || "").trim();
    const friendName = decodeURIComponent(req.params.friendName || "").trim();
    await storage.removeFriend(ownerName, friendName);
    res.json({ ok: true });
  });

  app.post("/api/app/friends/seed-demo", async (req, res) => {
    const { ownerName } = req.body || {};
    if (!ownerName) return res.status(400).json({ message: "Nome mancante" });
    const name = String(ownerName).trim();
    for (const f of LINEUP_DEMO_CONTACTS) {
      if (f !== name) await storage.addFriend(name, f);
    }
    const friends = await storage.getFriendsByOwner(name);
    res.json({ friends });
  });

  const pianificaDemoRegisterSchema = z.object({
    name: z.string().trim().min(1).max(80),
    email: z
      .string()
      .trim()
      .min(3)
      .max(120)
      .refine((e) => e.includes("@") && !/\s/.test(e), { message: "Inserisci un'email valida" }),
  });

  const pianificaDemoFeedbackSchema = z.object({
    name: z.string().trim().min(1).max(80),
    email: z
      .string()
      .trim()
      .min(3)
      .max(120)
      .refine((e) => e.includes("@") && !/\s/.test(e), { message: "Inserisci un'email valida" }),
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().max(2000).optional(),
  });

  const pianificaDemoAdminSchema = z.object({
    password: z.string().min(1).max(120),
  });

  const pianificaDemoAdminDeleteSchema = z.object({
    password: z.string().min(1).max(120),
    id: z.string().uuid(),
  });

  /** Feedback post-demo: prima Postgres (obbligatorio), poi email opzionale. */
  app.post("/api/app/pianifica-demo/feedback", async (req, res) => {
    try {
      const input = pianificaDemoFeedbackSchema.parse(req.body);
      const saved = await addPianificaDemoFeedback({
        name: input.name,
        email: input.email,
        rating: input.rating,
        comment: input.comment,
      });
      const notify = await notifyPianificaDemoFeedbackByEmail({
        name: input.name,
        email: input.email,
        rating: input.rating,
        comment: input.comment,
      });
      void logAiPipelineSummary({
        route: "POST /api/app/pianifica-demo/feedback",
        lines: [
          `id: ${saved.id}`,
          `name: ${input.name}`,
          `email: ${input.email}`,
          `rating: ${input.rating}/5`,
          `channel: ${notify.channel}`,
          "persist: postgres",
        ],
      });
      return res.status(201).json({
        ok: true,
        id: saved.id,
        saved: true,
        delivered: notify.delivered,
        channel: notify.channel,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Dati non validi" });
      }
      console.error("pianifica-demo/feedback:", err);
      return res.status(500).json({
        message: "Impossibile salvare il feedback. Riprova tra poco.",
        saved: false,
      });
    }
  });

  /** Elenco feedback demo (password admin). */
  app.post("/api/app/pianifica-demo/admin/feedbacks", async (req, res) => {
    try {
      const { password } = pianificaDemoAdminSchema.parse(req.body);
      if (!verifyPianificaDemoAdminPassword(password)) {
        return res.status(401).json({ message: "Password non valida" });
      }
      const feedbacks = await listPianificaDemoFeedbacks();
      return res.json({ feedbacks });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Richiesta non valida" });
      }
      return res.status(500).json({ message: "Errore lettura feedback" });
    }
  });

  /** Elimina un feedback demo (password admin). */
  app.post("/api/app/pianifica-demo/admin/feedbacks/delete", async (req, res) => {
    try {
      const { password, id } = pianificaDemoAdminDeleteSchema.parse(req.body);
      if (!verifyPianificaDemoAdminPassword(password)) {
        return res.status(401).json({ message: "Password non valida" });
      }
      const deleted = await deletePianificaDemoFeedback(id);
      if (!deleted) {
        return res.status(404).json({ message: "Feedback non trovato" });
      }
      return res.json({ ok: true, id });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Richiesta non valida" });
      }
      console.error("pianifica-demo/admin/feedbacks/delete:", err);
      return res.status(500).json({ message: "Errore eliminazione feedback" });
    }
  });

  /** Registrazione demo: solo log locale, nessun database. */
  app.post("/api/app/pianifica-demo/register", async (req, res) => {
    try {
      const input = pianificaDemoRegisterSchema.parse(req.body);
      void logAiPipelineSummary({
        route: "POST /api/app/pianifica-demo/register",
        lines: [`name: ${input.name}`, `email: ${input.email}`, "persist: client-session-only"],
      });
      return res.status(201).json({ ok: true, name: input.name, email: input.email });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Dati non validi" });
      }
      return res.status(201).json({ ok: true });
    }
  });

  /** Catalogo Torino istantaneo (senza OpenAI) per anteprima mentre l’AI affina. */
  app.get("/api/app/venues/quick-search", (req, res) => {
    const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (query.length < 2 || query.length > 120) {
      return res.status(400).json({ message: "Query non valida (2–120 caratteri)" });
    }
    const cached = getVenueAiSearchCached(query);
    if (cached) return res.json({ venues: cached, source: "cache" });
    const venues = fallbackTorinoClientVenuesFromCatalog(query);
    return res.json({ venues, source: "catalog" });
  });

  /** Ricerca luoghi a Torino (AI) per il passo “Dove” nella creazione evento. */
  app.post("/api/app/venues/ai-search", async (req, res) => {
    const query = typeof req.body?.query === "string" ? req.body.query.trim() : "";
    if (query.length < 2 || query.length > 120) {
      return res.status(400).json({ message: "Query non valida (2–120 caratteri)" });
    }

    const cached = getVenueAiSearchCached(query);
    if (cached) return res.json({ venues: cached, source: "cache" });

    const instant = tryInstantVenueCatalogOnly(query);
    if (instant) {
      setVenueAiSearchCached(query, instant);
      return res.json({ venues: instant, source: "catalog" });
    }

    const catalogNameHints = fuzzyCatalogVenueNamesForQuery(query, 10);
    const hintsBlock =
      catalogNameHints.length > 0
        ? `\nPossibili nomi nel nostro catalogo Torino (refusi / intento): ${catalogNameHints.map((n) => JSON.stringify(n)).join(", ")}. Preferisci questi se corrispondono all'intento dell'utente.`
        : "";

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      const venues = fallbackTorinoClientVenuesFromCatalog(query);
      setVenueAiSearchCached(query, venues);
      return res.json({ venues });
    }
    try {
      const openai = new OpenAI({ apiKey, timeout: LINEUP_VENUE_AI_SEARCH_MS });
      const completion = await withTimeout(
        openai.chat.completions.create({
          model: "gpt-4o-mini",
          temperature: 0,
          max_completion_tokens: 420,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                'Rispondi solo con JSON: {"venues":[...]} max 5 elementi. Ogni elemento: name, address (area generica o vuota), quartiere (zona Torino, stringa breve; preferito per UI), rating 0-5, mapsUrl, websiteUrl, instagramUrl (URL o null). Regole: solo locali reali a Torino che esistono o sono noti; niente markdown. Se la query sembra un refuso, correggi usando nomi reali (non inventare locali generici tipo "Trive"). mapsUrl: URL maps valido con query= nome preciso + Torino (il server normalizza i link). NON inventare numeri civici.',
            },
            {
              role: "user",
              content: `Luoghi a Torino per: ${JSON.stringify(query)}${hintsBlock}`,
            },
          ],
        }),
        LINEUP_VENUE_AI_SEARCH_MS,
        "venues-ai-search",
      );
      const text = completion.choices[0]?.message?.content;
      if (!text) {
        const venues = fallbackTorinoClientVenuesFromCatalog(query);
        setVenueAiSearchCached(query, venues);
        return res.json({ venues });
      }
      let raw: unknown;
      try {
        raw = JSON.parse(text);
      } catch {
        const venues = fallbackTorinoClientVenuesFromCatalog(query);
        setVenueAiSearchCached(query, venues);
        return res.json({ venues });
      }
      const aiParsed = parseTorinoVenueAiItemsLoose(raw);
      const fb = fallbackTorinoClientVenuesFromCatalog(query);
      const venues = mergeCatalogWithAi(fb, aiParsed);
      if (venues.length === 0) {
        void logAiPipelineSummary({
          route: "POST /api/app/venues/ai-search",
          lines: ["parse_fail", "no_venues_after_merge"],
        });
        setVenueAiSearchCached(query, []);
        return res.json({ venues: [] });
      }
      setVenueAiSearchCached(query, venues);
      return res.json({ venues });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      void logAiPipelineSummary({
        route: "POST /api/app/venues/ai-search",
        lines: ["error", msg],
      });
      const venues = fallbackTorinoClientVenuesFromCatalog(query);
      setVenueAiSearchCached(query, venues);
      return res.json({ venues });
    }
  });

  app.get("/api/app/events/:id/join-requests", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "ID non valido" });
    const forUser = typeof req.query.forUser === "string" ? req.query.forUser.trim() : "";
    if (!forUser) return res.status(400).json({ message: "forUser richiesto" });
    const event = await storage.getAppEvent(id);
    if (!event) return res.status(404).json({ message: "Evento non trovato" });
    if (event.createdBy !== forUser) return res.status(403).json({ message: "Non autorizzato" });
    const list = await storage.getJoinRequestsByEvent(id);
    res.json(list);
  });

  app.post("/api/app/events/:id/join-requests", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "ID non valido" });
    const { requesterName } = req.body || {};
    if (!requesterName) return res.status(400).json({ message: "requesterName mancante" });
    const reqName = String(requesterName).trim();
    const event = await storage.getAppEvent(id);
    if (!event) return res.status(404).json({ message: "Evento non trovato" });
    let parts: string[] = [];
    try {
      parts = JSON.parse(event.participants || "[]") as string[];
    } catch {
      parts = [];
    }
    if (parts.includes(reqName)) return res.status(409).json({ message: "Sei già partecipante" });
    const existing = await storage.getJoinRequestsByEvent(id);
    const pend = existing.find((j) => j.requesterName === reqName && j.status === "pending");
    if (pend) return res.status(409).json({ message: "Richiesta già inviata", id: pend.id });
    const jr = await storage.createJoinRequest({ eventId: id, requesterName: reqName, status: "pending" });
    res.status(201).json(jr);
  });

  app.put("/api/app/join-requests/:jrId", async (req, res) => {
    const jrId = parseInt(req.params.jrId);
    if (isNaN(jrId)) return res.status(400).json({ message: "ID non valido" });
    const { status, resolverName } = req.body || {};
    if (!status || !resolverName) return res.status(400).json({ message: "Dati mancanti" });
    if (status !== "accepted" && status !== "rejected") return res.status(400).json({ message: "Stato non valido" });
    const jr = await storage.getJoinRequest(jrId);
    if (!jr) return res.status(404).json({ message: "Richiesta non trovata" });
    const event = await storage.getAppEvent(jr.eventId);
    if (!event) return res.status(404).json({ message: "Evento non trovato" });
    if (event.createdBy !== resolverName) return res.status(403).json({ message: "Solo il creatore risolve le richieste" });
    if (jr.status !== "pending") return res.status(409).json({ message: "Richiesta già gestita" });
    if (status === "accepted") {
      let p: string[] = [];
      try {
        p = JSON.parse(event.participants || "[]") as string[];
      } catch {
        p = [];
      }
      if (!p.includes(jr.requesterName)) p.push(jr.requesterName);
      await storage.updateAppEvent(jr.eventId, { participants: JSON.stringify(p) });
    }
    const updated = await storage.updateJoinRequest(jrId, status);
    res.json(updated);
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

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: LINEUP_AI_MAX_RESPONSE_MS,
    });

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
      const completion = await withTimeout(
        openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          max_tokens: 800,
        }),
        LINEUP_AI_MAX_RESPONSE_MS,
        "scopri-questions",
      );

      const content = completion.choices[0]?.message?.content ?? "{}";
      await logAiExchange({
        route: "POST /api/scopri/questions",
        prompt,
        response: content,
      });
      const parsed = JSON.parse(content);
      res.json(parsed);
    } catch (err: any) {
      console.error("AI Questions error:", err?.message);
      await logAiExchange({
        route: "POST /api/scopri/questions",
        prompt,
        response: `ERROR: ${err?.message ?? String(err)}`,
      });
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
      const fallbackOnly: ScopriAiClientVenue[] = getFallbackVenuesForSubcategory(subcategory, category)
        .filter((v) => venueMatchesIntent(v, String(category), String(subcategory)))
        .map((v) => ({
          ...v,
          safariUrl: v.websiteUrl,
          scopriVerification: "verified" as const,
        }));
      void logAiPipelineSummary({
        route: "POST /api/scopri/ai (no OpenAI key)",
        lines: ["mode: catalog_only", `venueCount: ${fallbackOnly.length}`],
      });
      return res.json({
        venues: fallbackOnly,
        venuesVerified: fallbackOnly,
        venuesMoreIdeas: [],
        checks: {
          category: String(category),
          subcategory: String(subcategory),
          price: String(mergedConstraints.prezzo ?? "Qualsiasi"),
          day: String(mergedConstraints.giorno ?? ""),
          transport: String(mergedConstraints.mezzo ?? ""),
          area: String(mergedConstraints.areaDisegnata ?? ""),
          strictIntentFilter: true,
          hardReject: false,
          geoBoundsApplied: false,
          openingHoursApplied: false,
        },
      });
    }
    const openai = new OpenAI({ apiKey, timeout: LINEUP_AI_MAX_RESPONSE_MS });

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

    const foodConstraintsMeal = `
══════════════════════════════════════════════════════════════════
CIBO — PRANZO / CENA (pasto al tavolo, non snack da bar)
══════════════════════════════════════════════════════════════════
- Proponi SOLO luoghi dove si fa PRANZO o CENA al tavolo: ristorante, trattoria, osteria con cucina, pizzeria, bistrot con servizio pasti, brasserie, taverna, grill, sushi con sedute, mercato COPERTO con posti e banconi pasto (nome del mercato), hub gastronomico con sedute.
- VIETATO: bar generici, caffè storici da tramezzino o colazione al banco, pasticcerie, gelaterie, wine bar solo aperitivo, locali la cui identità online è soprattutto "caffè" o "bar" senza menu pranzo/cena chiaro.
- VIETATO proporre: intere piazze, parchi senza locale interno, monumenti senza ristorazione.
- Il campo "name" deve essere un locale pasto (es. "Trattoria ...", "Ristorante ..."), MAI un caffè-pasticceria sostituto del ristorante.
`;

    const foodConstraintsGeneric = `
══════════════════════════════════════════════════════════════════
CIBO (colazione, brunch, spuntino, aperitivo, ecc.) — locali PRECISI
══════════════════════════════════════════════════════════════════
- Suggerisci SOLO esercizi dove si mangia o beve con servizio: bar, caffè storici, pasticceria, bistrot, ristorante, trattoria, gelateria con sedute, mercato COPERTO con banconi (nome del mercato va bene), osteria con cucina.
- VIETATO proporre: intere piazze (es. "Piazza Vittorio Veneto"), parchi/giardini senza nome di locale interno, lungofiumi generici, "zone" o quartieri, monumenti senza ristorazione, laghi o sagre generiche senza struttura precisa.
- Il campo "name" deve essere il nome commerciale del locale (es. "Trattoria ..."), MAI solo il nome di una piazza o di un parco.
`;

    const foodConstraints =
      isSpecificFoodVenueSubcategory(String(subcategory))
        ? isMealLunchDinnerSubcategory(String(subcategory))
          ? foodConstraintsMeal
          : foodConstraintsGeneric
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

    const personalBlock = requestText
      ? `
══════════════════════════════════════════════════════════════════
RICHIESTE PERSONALI (filtro severo — stesso peso di zona e prezzo)
══════════════════════════════════════════════════════════════════
Testo utente: "${requestText}"
- Ogni locale in "venues" deve essere scelto SOLO se, oltre a categoria/sottocategoria, zona e prezzo, soddisfa in modo chiaro anche questo testo (menu, specialità, atmosfera, sito ufficiale).
- In "explanation" devi esplicitare concretamente come il locale risponde a questa richiesta (non frasi generiche).
- Se non trovi locali che rispettano anche questo testo insieme agli altri vincoli, restituisci meno risultati o "venues": [] — vietato proporre locali generici solo per riempire l'elenco.
`
      : "";

    const antiWrongVenueTypeBlock =
      /\b(pizzeria|pizza|pizze)\b/i.test(requestText) && /senza\s*glutine|gluten|celiac|celiachia|no\s*glutine/i.test(requestText)
        ? `
══════════════════════════════════════════════════════════════════
PIZZERIA + SENZA GLUTINE (ordine assoluto)
══════════════════════════════════════════════════════════════════
- Solo pizzerie o ristoranti dove la PIZZA è proposta centrale e documentabile online, CON offerta senza glutine / celiachia / menu dedicato / marchio AIC o equivalente esplicito nel sito o nelle pagine ufficiali.
- VIETATO: pasticcerie, bar, caffè storici, gelaterie, mercati generici, "locale accogliente" senza pizza e senza glutine dichiarati nel testo che scrivi.
- Se non trovi nulla di verificabile, "venues": [].
`
        : /\b(pizzeria|pizza|pizze)\b/i.test(requestText)
          ? `
══════════════════════════════════════════════════════════════════
RICHIESTA PIZZA / PIZZERIA
══════════════════════════════════════════════════════════════════
- Il nome o la descrizione del locale devono mostrare che è una PIZZERIA o che la pizza è il cuore dell'offerta (non un caffè o una pasticceria "dove si mangia anche una pizza" senza prova online).
- VIETATO sostituire con pasticceria, gelateria o caffè storico salvo evidenza chiara di pizzeria nel nome o nel sito.
`
          : /senza\s*glutine|gluten|celiac|celiachia|no\s*glutine/i.test(requestText)
            ? `
══════════════════════════════════════════════════════════════════
SENZA GLUTINE / CELIACHIA
══════════════════════════════════════════════════════════════════
- Ogni locale deve avere evidenza online di offerta senza glutine (menu, AIC, pagina dedicata, frase esplicita sul sito). Non bastano "cucina italiana" o "tradizione" generiche.
`
            : "";

    const searchPrompt = `${aiDirectorBlock}Sei un city concierge locale.
Obiettivo: proponi SOLO luoghi REALMENTE ESISTENTI a TORINO CITTA (non fuori) per "${subcategory}" che verificano nel modo più stretto possibile TUTTE le richieste dell'utente sotto (categoria, sottocategoria, giorno, prezzo, mezzo, area mappa${requestText ? ", richieste personali" : ""}).
Quantità: preferisci da 3 a 8 risultati eccellenti; MAI riempire con locali generici o solo vagamente adatti. Meglio pochi match totali che molti parziali.
${discoConstraints}${foodConstraints}${personalBlock}${antiWrongVenueTypeBlock}
Vincoli obbligatori:
- Usa solo posti verificabili online (sito ufficiale, Google Maps, TheFork, ticket office ufficiale).
- L'indirizzo deve essere completo con via e numero civico e contenere "Torino".
- Niente luoghi inventati, generici o senza presenza online chiara.
- Le opzioni DEVONO rispettare tutte le richieste dell'utente sotto, inclusa fascia prezzo (priceRange 1-4), area mappa se indicata${requestText ? " e le richieste personali parola per parola nel loro significato" : ""}.

Preferenze utente:
${answersText}
${requestText ? `\nRichieste personali utente (OBBLIGATORIE — ogni venue deve conformarsi):\n- ${requestText}\n` : ""}
CRITICO:
- La categoria richiesta e "${mergedConstraints.category ?? category}" e la sottocategoria richiesta e "${mergedConstraints.subcategory ?? subcategory}".
${isMealLunchDinnerSubcategory(String(mergedConstraints.subcategory ?? subcategory)) ? `- Per PRANZO o CENA: è VIETATO proporre bar, caffè, pasticcerie o gelaterie salvo che il sito ufficiale dimostri chiaramente servizio di pasto completo al tavolo con quel nome commerciale.\n` : ""}- NON proporre luoghi fuori categoria/sottocategoria.
- Giorno/intervallo selezionato: "${mergedConstraints.giorno ?? "non specificato"}".
- Prezzo selezionato: "${mergedConstraints.prezzo ?? "Qualsiasi"}".
- Mezzo selezionato: "${mergedConstraints.mezzo ?? "non specificato"}".
- Zona mappa selezionata: "${mergedConstraints.zonaLabel ?? "non specificata"}" (${mergedConstraints.areaDisegnata ?? "no-bbox"}).
- Se giorno e selezionato, includi solo posti aperti in quel giorno/intervallo.
- Se prezzo e diverso da "Qualsiasi", includi solo posti in quella fascia.
- Se esiste area mappa, includi solo posti compatibili con la zona selezionata.
- "matchScore" alto (≥85) solo se il locale rispetta insieme tutti i vincoli applicabili; altrimenti escludi il locale o abbassa il punteggio e non superare i migliori in lista se incoerenti.

Dopo la ricerca, rispondi SOLO con un JSON valido (nessun testo fuori dal JSON) con questa struttura esatta:
{
  "venues": [
    {
      "name": "Nome esatto del posto trovato online",
      "address": "Indirizzo completo con via e numero civico trovato online, Torino",
      "matchScore": 88,
      "explanation": "Almeno due frasi in italiano che dimostrano rispetto di ZONA, priceRange, trasporto, tema categoria/sottocategoria${requestText ? " e richieste personali dell'utente" : ""}",
      "estimatedPrice": "€ oppure €€ oppure €€€ coerente con la fascia richiesta"
    }
  ]
}`;

    try {
      const cacheKey = cacheKeyForSearch(String(category), String(subcategory));
      const warm = aiWarmupCache.get(cacheKey);
      const warmValid = warm && Date.now() - warm.at < 5 * 60_000;
      if (prefetch && warmValid) {
        return res.json({ ...warm.payload, warmed: true });
      }

      const scopriPipelineMark = Date.now();

      // Default: chat JSON (più veloce). Imposta LINEUP_SCOPRI_AI_WEB_FIRST=1 per provare prima la Responses API con web search.
      let rawText = "";
      let usedOpenAiResponsesWeb = false;
      const webFirst = process.env.LINEUP_SCOPRI_AI_WEB_FIRST === "1";
      const runChatJson = () =>
        withTimeout(
          openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: searchPrompt }],
            response_format: { type: "json_object" },
            max_tokens: 1000,
          }),
          LINEUP_AI_MAX_RESPONSE_MS,
          "chat.completions",
        );
      const runWebSearch = () =>
        withTimeout(
          (openai as any).responses.create({
            model: "gpt-4o-mini",
            tools: [{ type: "web_search_preview" }],
            input: searchPrompt,
          }),
          LINEUP_AI_MAX_RESPONSE_MS,
          "responses",
        );
      if (webFirst) {
        try {
          const webResponse: any = await runWebSearch();
          rawText = webResponse.output_text ?? "";
          usedOpenAiResponsesWeb = true;
        } catch (webErr: any) {
          console.warn("Web search non disponibile, uso chat JSON:", webErr?.message);
          const completion = await runChatJson();
          rawText = completion.choices[0]?.message?.content ?? "{}";
        }
      } else {
        try {
          const completion = await runChatJson();
          rawText = completion.choices[0]?.message?.content ?? "{}";
        } catch (chatErr: any) {
          console.warn("Chat JSON fallito, provo web search:", chatErr?.message);
          try {
            const webResponse: any = await runWebSearch();
            rawText = webResponse.output_text ?? "";
            usedOpenAiResponsesWeb = true;
          } catch (webErr: any) {
            await logAiExchange({
              route: "POST /api/scopri/ai",
              prompt: searchPrompt,
              response: `ERROR chat: ${chatErr?.message ?? String(chatErr)}\nERROR web: ${webErr?.message ?? String(webErr)}`,
            });
            throw webErr;
          }
        }
      }

      await logAiExchange({
        route: "POST /api/scopri/ai",
        prompt: searchPrompt,
        response: rawText,
      });

      // Estrai JSON dalla risposta (puo contenere testo extra se arriva da web search)
      const jsonMatch = rawText.match(/\{[\s\S]*"venues"[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : rawText;
      const parsed = JSON.parse(jsonStr);
      const parsedVenues = validateScopriAiVenuesResponse(parsed);
      if (!parsedVenues.ok) {
        console.warn("Risposta AI Scopri non valida (schema venue):", parsedVenues.error);
      }
      const aiCandidates = parsedVenues.ok
        ? filterAiSuggestionsForMealLunchDinner(
            filterAiSuggestionsByUserRequest(
              validateSuggestions(parsedVenues.data.venues, scopriPrefs),
              requestText,
            ),
            String(subcategory),
          ).map((s) => expandScopriAiSuggestionToVenue(s))
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
      if (requestText.trim()) {
        merged = merged.filter((v) => venueTextMatchesUserRequest(requestText, v.name, v.description));
      }
      const candidates = merged.slice(0, 5);
      const venuesLinkChecked = await validateVenueLinks(candidates);
      const elapsedSinceScopriStart = Date.now() - scopriPipelineMark;
      const enrichBudgetMs = Math.max(0, LINEUP_SCOPRI_PIPELINE_BUDGET_MS - elapsedSinceScopriStart);
      const weekdays = extractRequestedWeekdays(mergedConstraints.giorno);
      const perVenueEnrichMs =
        venuesLinkChecked.length > 0
          ? Math.max(900, Math.min(2600, Math.floor(enrichBudgetMs / venuesLinkChecked.length)))
          : 0;
      const withPlaces = await Promise.all(
        venuesLinkChecked.map((v) =>
          enrichBudgetMs < 500
            ? Promise.resolve({ ...v, openStatus: "unknown" as const })
            : withTimeout(enrichWithPlacesMeta(v, weekdays), perVenueEnrichMs, "enrich-place").catch(() => ({
                ...v,
                openStatus: "unknown" as const,
              })),
        ),
      );
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

      const venuesVerified = finalVenues
        .filter((v) => isVerifiedStrongVenue(v, areaBounds))
        .map((v) => toScopriVenueJson(v, "verified"));
      const venuesMoreIdeas = finalVenues
        .filter((v) => !isVerifiedStrongVenue(v, areaBounds))
        .map((v) => toScopriVenueJson(v, "suggestion"));
      const venuesOrdered: ScopriAiClientVenue[] = [...venuesVerified, ...venuesMoreIdeas].slice(0, 12);

      const payload: ScopriAiCachePayload = {
        venues: venuesOrdered,
        venuesVerified,
        venuesMoreIdeas,
      };
      aiWarmupCache.set(cacheKey, { at: Date.now(), payload });

      void logAiPipelineSummary({
        route: "POST /api/scopri/ai",
        lines: [
          `openaiApiKeyPresent: ${Boolean(process.env.OPENAI_API_KEY)}`,
          `openaiResponsesWebUsed: ${usedOpenAiResponsesWeb}`,
          `googleMapsApiKeyPresent: ${Boolean(process.env.GOOGLE_MAPS_API_KEY)}`,
          `verifiedVenueCount: ${venuesVerified.length}`,
          `moreIdeasVenueCount: ${venuesMoreIdeas.length}`,
          `bboxActive: ${Boolean(areaBounds)}`,
        ],
      });

      res.json({
        ...payload,
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
      const safeFallbackRaw = filterByRequestedPrice(
        getFallbackVenuesForSubcategory(subcategory, category)
          .filter((v) => venueMatchesIntent(v, String(category), String(subcategory))),
        mergedConstraints.prezzo,
      ).map((v) => scoreVenue({ ...v, openStatus: "unknown" }, mergedConstraints, true));
      const safeFallback: ScopriAiClientVenue[] = safeFallbackRaw.map((v) => ({
        ...v,
        safariUrl: v.websiteUrl,
        scopriVerification: "verified" as const,
      }));
      void logAiPipelineSummary({
        route: "POST /api/scopri/ai (fallback)",
        lines: [
          `error: ${err?.message ?? String(err)}`,
          `openaiApiKeyPresent: ${Boolean(process.env.OPENAI_API_KEY)}`,
          `catalogFallbackCount: ${safeFallback.length}`,
        ],
      });
      res.json({
        venues: safeFallback,
        venuesVerified: safeFallback,
        venuesMoreIdeas: [],
        checks: {
          category: String(category),
          subcategory: String(subcategory),
          price: String(mergedConstraints.prezzo ?? "Qualsiasi"),
          day: String(mergedConstraints.giorno ?? ""),
          transport: String(mergedConstraints.mezzo ?? ""),
          area: String(mergedConstraints.areaDisegnata ?? ""),
          strictIntentFilter: true,
          hardReject: false,
          geoBoundsApplied: false,
          openingHoursApplied: false,
        },
      });
    }
  });

  return httpServer;
}
