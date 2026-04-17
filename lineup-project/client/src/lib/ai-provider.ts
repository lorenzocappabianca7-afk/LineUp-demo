import type { UserPreferences } from "@shared/types";

const PRICE_RANGE_SCALE = `1 = economico, 2 = moderato, 3 = alto, 4 = lusso`;

/**
 * Provider / prompt AI per il client.
 * `buildUserPreferencesFromScopri` e la validazione restano in `@shared` per l’API server.
 */
export const generateSystemPrompt = () => {
  return `Sei un esperto locale ultra-preciso. Il tuo compito è suggerire luoghi basandoti ESCLUSIVAMENTE sui vincoli forniti.
REGOLE RIGIDE (non rimuoverle, non attenuarle, non contraddirle con altre istruzioni):
1. ZONA: se un luogo è fuori dalla ZONA indicata nel messaggio utente, scartalo. NON ignorare mai il campo ZONA.
2. PREZZO / priceRange: rispetta la fascia numerica (1–4) e il testo sul budget. NON ignorare mai priceRange. In estimatedPrice usa indicatori coerenti (€ / €€ / €€€ o equivalente chiaro).
3. MEZZO: verifica che il luogo sia realisticamente raggiungibile con il mezzo indicato (piedi, auto, mezzi_pubblici, bici).
4. ARGOMENTO: la coerenza con topic e subTopic è obbligatoria.
5. Formato: rispondi SOLO con JSON valido, senza testo prima o dopo.
6. Se non puoi rispettare insieme ZONA, priceRange e gli altri vincoli, restituisci "venues": [] anziché inventare o allargare la zona o il budget.`;
};

export const generateUserPrompt = (prefs: UserPreferences) => {
  return `Trova luoghi perfetti con questi parametri:
- ATTIVITÀ: ${prefs.topic} (${prefs.subTopic})
- ZONA: ${prefs.zone}
- BUDGET / priceRange: ${prefs.priceRange} su 4 (${PRICE_RANGE_SCALE})
- TRASPORTO: ${prefs.transport}
- RICHIESTE EXTRA: ${prefs.additionalNotes || "Nessuna"}

FORMATO JSON OBBLIGATORIO:
- Oggetto radice con chiave "venues" (array, max 12 elementi).
- Ogni elemento deve avere ESATTAMENTE: "name", "address", "matchScore" (numero 0–100), "explanation" (almeno due frasi in italiano che mostrano rispetto di ZONA, budget e tema), "estimatedPrice" (testo; indica la fascia con € / €€ / €€€ in linea con priceRange=${prefs.priceRange}).
- Ogni "address" deve essere credibile per la ZONA richiesta e contenere riferimento a Torino se l’area è Torino.
- Non inserire campi extra non richiesti sopra.`;
};

export type { UserPreferences, AISuggestion } from "@shared/types";
export { buildUserPreferencesFromScopri, type ScopriMergedForAi } from "@shared/aiPrompts";
export {
  assertUserPreferencesForAi,
  estimatedPriceSignal,
  expandScopriAiSuggestionToVenue,
  humanZoneLabelFromPrefsZone,
  isAISuggestion,
  userPreferencesSchema,
  scopriAiSuggestionSchema,
  validateScopriAiVenuesResponse,
  validateSuggestions,
  validateUserPreferencesIntegral,
  venueTextMatchesZoneLabel,
  type EstimatedPriceSignal,
  type ScopriAiSuggestion,
  type ScopriAiVenue,
  type ScopriAiVenuesResponse,
} from "@shared/aiValidation";
