import type { UserPreferences } from "./types";

/** Dati merge Scopri lato server → `UserPreferences`. */
export type ScopriMergedForAi = {
  category?: string;
  subcategory?: string;
  giorno?: string;
  prezzo?: string;
  mezzo?: string;
  areaDisegnata?: string;
  zonaLabel?: string;
};

function mapPrezzoToTier(prezzo: string | undefined): UserPreferences["priceRange"] {
  const p = (prezzo ?? "").trim();
  if (p.includes("€€€")) return 3;
  if (p.includes("€€")) return 2;
  if (p === "€" || (p.includes("€") && !p.includes("€€"))) return 1;
  if (/qualsiasi/i.test(p) || p.length === 0) return 2;
  return 2;
}

function mapMezzoToTransport(mezzo: string | undefined): UserPreferences["transport"] {
  const m = (mezzo ?? "").toLowerCase();
  if (m.includes("piedi")) return "piedi";
  if (m.includes("mezzi") || m.includes("bus") || m.includes("metro")) return "mezzi_pubblici";
  if (m.includes("bici")) return "bici";
  if (m.includes("auto") || m.includes("moto") || m.includes("scooter")) return "auto";
  return "piedi";
}

export function buildUserPreferencesFromScopri(input: {
  category: string;
  subcategory: string;
  merged: ScopriMergedForAi;
  userRequest?: string;
}): UserPreferences {
  const m = input.merged;
  const zone = [m.zonaLabel, m.areaDisegnata].filter(Boolean).join(" · ") || "Non specificata";
  const notes: string[] = [];
  if (m.giorno?.trim()) notes.push(`Disponibilità / giorno: ${m.giorno.trim()}`);
  if (input.userRequest?.trim()) notes.push(input.userRequest.trim());
  const additionalNotes = notes.length > 0 ? notes.join("\n") : undefined;

  /** Oggetto completo: passarlo sempre così all'AI (niente campi omessi). */
  const prefs: UserPreferences = {
    topic: (m.category ?? input.category).trim(),
    subTopic: (m.subcategory ?? input.subcategory).trim(),
    zone: zone.trim() || "Non specificata",
    priceRange: mapPrezzoToTier(m.prezzo),
    transport: mapMezzoToTransport(m.mezzo),
    additionalNotes,
  };
  return prefs;
}
