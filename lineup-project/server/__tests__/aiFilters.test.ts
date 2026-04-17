import test from "node:test";
import assert from "node:assert/strict";
import { filterByRequestedPrice, isGenericNonSpecificFoodVenue, normalizeVenueIdentity, venueMatchesIntent } from "../scopriFilters";

const baseVenue = {
  name: "Venue",
  address: "Via Roma 1, Torino",
  description: "Descrizione",
  rating: 4.5,
  priceRange: "€€",
  bookingUrl: "https://example.com/book",
  websiteUrl: "https://example.com",
  mapsUrl: "https://maps.google.com",
};

test("tennis intent must reject museums", () => {
  const museum = {
    ...baseVenue,
    name: "Museo Egizio",
    description: "Museo iconico culturale",
  };
  assert.equal(venueMatchesIntent(museum, "sport", "tennis"), false);
});

test("colazione intent must reject generic piazza venues", () => {
  assert.equal(
    isGenericNonSpecificFoodVenue("Piazza Vittorio Veneto", "Area ampia per passeggiate"),
    true,
  );
});

test("price filter keeps only strict requested tier", () => {
  const venues = [
    { ...baseVenue, name: "A", priceRange: "€" },
    { ...baseVenue, name: "B", priceRange: "€€" },
    { ...baseVenue, name: "C", priceRange: "€€€" },
  ];
  const filtered = filterByRequestedPrice(venues, "€€");
  assert.deepEqual(filtered.map((v) => v.name), ["B"]);
});

test("strong normalization dedupes CH4 variants", () => {
  const a = normalizeVenueIdentity("CH4 Sporting Club", "Via Trofarello 10, Torino");
  const b = normalizeVenueIdentity("Sporting Club CH4", "Via Trofarello 10 Torino");
  assert.equal(a, b);
});
