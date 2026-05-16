/** Preferenze utente per la generazione prompt AI (Scopri / ricerca luoghi). */
export interface UserPreferences {
  topic: string; // es. "Ristorazione"
  subTopic: string; // es. "Sushi"
  priceRange: 1 | 2 | 3 | 4; // 1: Economico, 4: Lusso
  transport: "piedi" | "auto" | "mezzi_pubblici" | "bici";
  zone: string; // Quartiere o Coordinate
  additionalNotes?: string;
}

/** Singolo luogo suggerito dall'AI (payload JSON in `venues`). */
export interface AISuggestion {
  name: string;
  address: string;
  /** Quartiere o zona (per anteprima senza indirizzo completo). */
  quartiere?: string;
  matchScore: number; // Percentuale di coerenza (0-100)
  explanation: string; // Perché rispetta i criteri dell'utente
  estimatedPrice: string;
}
