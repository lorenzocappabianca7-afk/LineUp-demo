/** Pagina HTML quando su Render è attivo MAINTENANCE_MODE=true (deploy manuale). */
export const LINEUP_MAINTENANCE_COPY = {
  title: "Aggiornamento in corso",
  lead: "Stiamo aggiornando LineUp: l’app tornerà online tra pochi minuti.",
  team: "Il team LineUp sta completando l’intervento. Grazie per la pazienza.",
} as const;

/** Schermata React solo dopo crash grave (Error Boundary), non per rete lenta o API. */
export const LINEUP_CRASH_COPY = {
  title: "Qualcosa non ha funzionato",
  lead: "Ci scusiamo: l’app ha avuto un problema grave e si è bloccata.",
  team: "Il team LineUp ci sta già lavorando per ripristinare il servizio al più presto.",
  retry: "Ricarica l’app",
} as const;
