/**
 * Indirizzo mostrato sotto il nome: coerente col link Google Maps generato dall’AI
 * (parametro `query` / `q`), poi testo `address`, poi `distance` (demo).
 */

export function decodeGoogleMapsQueryParam(encoded: string): string {
  const t = encoded.trim();
  if (!t) return "";
  try {
    const normalized = t.includes("%") ? t : t.replace(/\+/g, "%20");
    return decodeURIComponent(normalized).replace(/\+/g, " ").trim();
  } catch {
    return t.replace(/\+/g, " ").trim();
  }
}

export function placeLineFromGoogleMapsUrl(url: string | undefined): string {
  if (!url?.trim()) return "";
  try {
    const u = /^https?:\/\//i.test(url) ? new URL(url) : new URL(url, "https://www.google.com");
    const q = u.searchParams.get("query") ?? u.searchParams.get("q");
    if (q != null && q !== "") return decodeGoogleMapsQueryParam(q);
  } catch {
    const m = url.match(/[?&]query=([^&]+)/) ?? url.match(/[?&]q=([^&]+)/);
    if (m?.[1]) return decodeGoogleMapsQueryParam(m[1]);
  }
  return "";
}

/**
 * Indirizzo “troppo dettagliato” spesso è un’invenzione dell’AI nella query Maps o nel campo testo.
 * Non usiamo questa euristica per scartare indirizzi brevi tipo “Piazza …, Torino”.
 */
export function looksLikeHallucinatedStreetAddressLine(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  if (/\b101\d{2}\b/.test(t) && /\b(Via|Viale|Corso|Largo|Lung)\b/i.test(t)) return true;
  if (/^.{95,}$/.test(t)) return true;
  return false;
}

export function venueDisplayAddressLine(input: {
  address?: string;
  mapsUrl?: string;
  distance?: string;
  /** Se query Maps e address sono inaffidabili, ultimo fallback: “Nome · Torino”. */
  placeName?: string;
}): string {
  const a = (input.address ?? "").trim();
  const fromMaps = placeLineFromGoogleMapsUrl(input.mapsUrl);
  const dist = (input.distance ?? "").trim();

  if (a.length > 0 && !looksLikeHallucinatedStreetAddressLine(a)) return a;
  if (fromMaps.length > 0 && !looksLikeHallucinatedStreetAddressLine(fromMaps)) return fromMaps;
  if (a.length > 0) return a;
  if (fromMaps.length > 0) return fromMaps;
  if (dist.length > 0) return dist;
  const n = (input.placeName ?? "").trim();
  if (n.length > 0) return `${n} · Torino`;
  return "";
}
