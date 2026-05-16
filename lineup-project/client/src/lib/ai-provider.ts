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
5. RICHIESTE PERSONALI / RICHIESTE EXTRA: se nel blocco "RICHIESTE EXTRA" o nelle note c’è un desiderio specifico (es. cucina piemontese, tavolo all’aperto, senza glutine, pizzeria), ogni locale in "venues" DEVE essere una corrispondenza diretta di quel desiderio, non un locale generico della stessa categoria. Esempio: se l’utente chiede "pizzeria senza glutine", è VIETATO rispondere con pasticcerie, bar o caffè storici salvo che siano davvero pizzerie con offerta senza glutine documentabile. In "explanation" devi citare in modo esplicito come il locale soddisfa quella richiesta (menu, specialità, sito). Se non trovi abbastanza locali che soddisfano anche quelle richieste oltre a zona e prezzo, proponi MENO risultati o "venues": [] — vietato riempire con suggerimenti generici.
6. Formato: rispondi SOLO con JSON valido, senza testo prima o dopo.
7. Priorità alla QUALITÀ del match: preferisci pochi luoghi che verificano TUTTI i vincoli insieme, piuttosto che molti luoghi solo parzialmente adatti. "matchScore" deve essere alto (≥85) solo se il locale rispetta insieme zona, budget, tema, eventuali richieste personali e mezzo.
8. Se non puoi rispettare insieme ZONA, priceRange, argomento e le richieste personali quando presenti, restituisci "venues": [] anziché inventare, allargare la zona o abbassare lo standard.`;
};

export const generateUserPrompt = (prefs: UserPreferences) => {
  return `Trova luoghi perfetti con questi parametri:
- ATTIVITÀ: ${prefs.topic} (${prefs.subTopic})
- ZONA: ${prefs.zone}
- BUDGET / priceRange: ${prefs.priceRange} su 4 (${PRICE_RANGE_SCALE})
- TRASPORTO: ${prefs.transport}
- RICHIESTE EXTRA: ${prefs.additionalNotes || "Nessuna"}

OBIETTIVO: restituisci solo luoghi che verificano nel modo più stretto possibile TUTTI i parametri sopra (inclusa ogni riga delle RICHIESTE EXTRA). Nessun locale “di riempimento” o solo vagamente correlato.

FORMATO JSON OBBLIGATORIO:
- Oggetto radice con chiave "venues" (array, max 10 elementi; preferisci meno elementi se il match non è certo).
- Ogni elemento deve avere ESATTAMENTE: "name", "address", "matchScore" (numero 0–100), "explanation" (almeno due frasi in italiano che dimostrano rispetto di ZONA, budget, tema attività E di ogni richiesta nelle RICHIESTE EXTRA quando presenti), "estimatedPrice" (testo; indica la fascia con € / €€ / €€€ in linea con priceRange=${prefs.priceRange}).
- Ogni "address" deve essere credibile per la ZONA richiesta e contenere riferimento a Torino se l’area è Torino.
- Non inserire campi extra non richiesti sopra.`;
};

export type { UserPreferences, AISuggestion } from "@shared/types";
export { buildUserPreferencesFromScopri, type ScopriMergedForAi } from "@shared/aiPrompts";
export {
  assertUserPreferencesForAi,
  estimatedPriceSignal,
  expandScopriAiSuggestionToVenue,
  filterAiSuggestionsByUserRequest,
  humanZoneLabelFromPrefsZone,
  isAISuggestion,
  userPreferencesSchema,
  scopriAiSuggestionSchema,
  validateScopriAiVenuesResponse,
  validateSuggestions,
  validateUserPreferencesIntegral,
  venueTextMatchesUserRequest,
  venueTextMatchesZoneLabel,
  type EstimatedPriceSignal,
  type ScopriAiSuggestion,
  type ScopriAiVenue,
  type ScopriAiVenuesResponse,
} from "@shared/aiValidation";
