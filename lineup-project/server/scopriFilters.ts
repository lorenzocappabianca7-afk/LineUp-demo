export type SimpleVenue = {
  name: string;
  address: string;
  description: string;
  priceRange: string;
};

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

export function isGenericNonSpecificFoodVenue(name: string, description: string): boolean {
  const n = name.trim();
  const t = `${n}\n${description}`.toLowerCase();
  if (/^piazza\s+/i.test(n)) return true;
  if (/^piazzetta\s+/i.test(n)) return true;
  if (/^parco\s+/i.test(n) && !/\b(ristorante|trattoria|bar|bistrot|caff|caf|chiosco|chalet)\b/i.test(t)) return true;
  if (/^giardini\s+/i.test(n) && !/\b(bar|ristorante|caff|caf|bistrot)\b/i.test(t)) return true;
  return false;
}

function normalizePriceRange(value: string): string {
  const cleaned = value.trim();
  if (cleaned.includes("€€€")) return "€€€";
  if (cleaned.includes("€€")) return "€€";
  return "€";
}

function looksFoodLike(v: SimpleVenue): boolean {
  const t = `${v.name} ${v.description}`.toLowerCase();
  return /\b(ristor|tratt|oster|bistr|bar|caff|caf[eé]|pasticc|gelat|mercato)\b/.test(t);
}

function looksSportLike(v: SimpleVenue): boolean {
  const t = `${v.name} ${v.description}`.toLowerCase();
  return /\b(tennis|padel|sport|palestra|campo|club|circolo|fitness|piscina)\b/.test(t);
}

function looksCultureLike(v: SimpleVenue): boolean {
  const t = `${v.name} ${v.description}`.toLowerCase();
  return /\b(muse|teatro|cinema|mostra|festival|concerto|arena|galleria)\b/.test(t);
}

function looksNightlifeLike(v: SimpleVenue): boolean {
  const t = `${v.name} ${v.description}`.toLowerCase();
  return /\b(discotec|night\s*club|club|dj|dance|serata)\b/.test(t);
}

function isDiscotecaSubcategory(subcategory: string): boolean {
  const s = String(subcategory).toLowerCase();
  return s.includes("discotec") || s.includes("night club") || s.includes("nightclub");
}

function isSpecificFoodVenueSubcategory(subcategory: string): boolean {
  const s = String(subcategory).toLowerCase();
  return s.includes("colazione") || s.includes("brunch") || s.includes("spuntino") || s.includes("pranzo") || s.includes("cena") || s.includes("aperitivo");
}

function detectIntent(category: string, subcategory: string): "food" | "sport" | "culture" | "nightlife" | "outdoor" | "generic" {
  const c = `${category} ${subcategory}`.toLowerCase();
  if (isDiscotecaSubcategory(subcategory)) return "nightlife";
  if (isSpecificFoodVenueSubcategory(subcategory) || c.includes("cibo")) return "food";
  if (/\b(tennis|padel|sport|palestra|piscina|calcio|corsa|yoga|basket|beach volley|arrampicata)\b/i.test(c)) return "sport";
  if (/\b(muse|cinema|teatro|mostr|concert|festival|fier)\b/i.test(c)) return "culture";
  if (/\b(mare|montagna|giro|passeggiata|parco)\b/i.test(c)) return "outdoor";
  return "generic";
}

export function venueMatchesIntent(venue: SimpleVenue, category: string, subcategory: string): boolean {
  const intent = detectIntent(category, subcategory);
  const sub = subcategory.toLowerCase();
  if (sub.includes("tennis")) {
    const t = `${venue.name} ${venue.description}`.toLowerCase();
    if (!/\b(tennis|racchetta|circolo|club)\b/.test(t)) return false;
  }
  if (intent === "food") return looksFoodLike(venue) && !isGenericNonSpecificFoodVenue(venue.name, venue.description);
  if (intent === "sport") return looksSportLike(venue);
  if (intent === "culture") return looksCultureLike(venue);
  if (intent === "nightlife") return looksNightlifeLike(venue);
  return true;
}

export function filterByRequestedPrice<T extends { priceRange: string }>(venues: T[], requested: string | undefined): T[] {
  const req = String(requested ?? "").trim();
  if (!req || req === "Qualsiasi") return venues;
  return venues.filter((v) => normalizePriceRange(v.priceRange) === req);
}
