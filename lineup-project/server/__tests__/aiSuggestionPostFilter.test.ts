import test from "node:test";
import assert from "node:assert/strict";
import {
  estimatedPriceSignal,
  humanZoneLabelFromPrefsZone,
  validateSuggestions,
} from "@shared/aiValidation";
import type { AISuggestion, UserPreferences } from "@shared/types";

const prefsBase = (): UserPreferences => ({
  topic: "Ristorazione",
  subTopic: "Sushi",
  priceRange: 1,
  transport: "piedi",
  zone: "Murazzi · bbox:0,0-1,1",
});

const suggestion = (over: Partial<AISuggestion> = {}): AISuggestion => ({
  name: "Sushi Po",
  address: "Via Murazzi 10, Torino",
  matchScore: 82,
  explanation: "Locale sul lungopo Murazzi, coerente con la zona richiesta e fascia economica.",
  estimatedPrice: "€",
  ...over,
});

test("estimatedPriceSignal classifies euro runs and keywords", () => {
  assert.equal(estimatedPriceSignal("€"), "budget");
  assert.equal(estimatedPriceSignal("15-25 €"), "budget");
  assert.equal(estimatedPriceSignal("€€"), "mid");
  assert.equal(estimatedPriceSignal("€€€"), "luxury");
  assert.equal(estimatedPriceSignal("Esperienza lusso"), "luxury");
  assert.equal(estimatedPriceSignal("qualcosa di vago"), "unknown");
});

test("humanZoneLabelFromPrefsZone strips bbox tail", () => {
  assert.equal(humanZoneLabelFromPrefsZone("Murazzi · bbox:0,0-1,1"), "Murazzi");
  assert.equal(humanZoneLabelFromPrefsZone("Non specificata"), "");
});

test("validateSuggestions removes luxury and mid for priceRange 1", () => {
  const prefs = prefsBase();
  const out = validateSuggestions(
    [suggestion({ estimatedPrice: "€€€" }), suggestion({ estimatedPrice: "€€" }), suggestion()],
    prefs,
  );
  assert.equal(out.length, 1);
  assert.equal(out[0]!.estimatedPrice, "€");
});

test("validateSuggestions removes luxury for priceRange 2", () => {
  const prefs: UserPreferences = { ...prefsBase(), priceRange: 2 };
  const out = validateSuggestions(
    [suggestion({ estimatedPrice: "€€€" }), suggestion({ estimatedPrice: "€€" })],
    prefs,
  );
  assert.equal(out.length, 1);
  assert.equal(out[0]!.estimatedPrice, "€€");
});

test("validateSuggestions uses explanation when address omits quartiere", () => {
  const prefs = prefsBase();
  const out = validateSuggestions(
    [
      suggestion({
        name: "Bar X",
        address: "Via Roma 1, Torino",
        explanation: "Consigliato perché si trova proprio sui Murazzi sul Po.",
      }),
      suggestion({
        name: "Altrove",
        address: "Piazza Castello 1, Torino",
        explanation: "Centro storico elegante lontano dalla zona richiesta.",
      }),
    ],
    prefs,
  );
  assert.equal(out.length, 1);
  assert.equal(out[0]!.name, "Bar X");
});
