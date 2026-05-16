/**
 * Modalità di sondaggio per un evento (scelta in creazione gruppo).
 * Valori persistiti in `app_events.survey_mode`.
 */

export const SURVEY_MODE_IDS = [
  /** 1 — Calendario e RSVP: organizzatore fissa tutto; altri solo Sì / No / Forse. */
  "fixed_calendar_rsvp",
  /** 2 — Come (1) con proposte gruppo in attesa di approvazione organizzatore. */
  "fixed_calendar_rsvp_proposals",
  /** 3 — Sondaggio aperto: voti e proposte da tutti (comportamento predefinito LineUp). */
  "flexible_voting",
  /** 4 — Come (3) ma una sola scelta per categoria (data / ora / luogo) non è revocabile. */
  "flexible_voting_locked",
  /** 5 — Lista chiusa: solo organizzatore gestisce le opzioni; gli altri votano. */
  "vote_no_proposals",
  /** 6 — Coordinamento: solo organizzatore modifica l’elenco; contesti ordinati o di team. */
  "organizer_curated_poll",
  /** 7 — Come (3) con invito UI a poche preferenze per categoria (stesso motore). */
  "compact_preferences",
  /** 8 — Come (3) con copy su maggioranza e gestione pareggi (solo UI). */
  "majority_with_creator_tiebreak",
] as const;

export type SurveyModeId = (typeof SURVEY_MODE_IDS)[number];

export const DEFAULT_SURVEY_MODE: SurveyModeId = "flexible_voting";

export function parseSurveyMode(raw: unknown): SurveyModeId {
  if (typeof raw === "string" && (SURVEY_MODE_IDS as readonly string[]).includes(raw)) {
    return raw as SurveyModeId;
  }
  return DEFAULT_SURVEY_MODE;
}

export type SurveyBehavior = {
  /** Proposte dei membri (flusso “Proponi” / API proposals). */
  memberProposals: "off" | "pending_creator" | "on";
  /** Presenza del terzo stato “Forse” sul RSVP. */
  attendance: "binary" | "ternary";
  /** Una sola opzione per tipo di voto per utente e non revocabile. */
  lockSingleChoicePerCategory: boolean;
  /** Mostra badge “max 2 opzioni” in chat. */
  compactTwoOptionsHint: boolean;
  /** Mostra nota pareggio / creatore. */
  creatorTiebreakHint: boolean;
};

export function surveyBehavior(mode: SurveyModeId): SurveyBehavior {
  switch (mode) {
    case "fixed_calendar_rsvp":
      return {
        memberProposals: "off",
        attendance: "ternary",
        lockSingleChoicePerCategory: false,
        compactTwoOptionsHint: false,
        creatorTiebreakHint: false,
      };
    case "fixed_calendar_rsvp_proposals":
      return {
        memberProposals: "pending_creator",
        attendance: "ternary",
        lockSingleChoicePerCategory: false,
        compactTwoOptionsHint: false,
        creatorTiebreakHint: false,
      };
    case "flexible_voting":
      return {
        memberProposals: "on",
        attendance: "binary",
        lockSingleChoicePerCategory: false,
        compactTwoOptionsHint: false,
        creatorTiebreakHint: false,
      };
    case "flexible_voting_locked":
      return {
        memberProposals: "on",
        attendance: "binary",
        lockSingleChoicePerCategory: true,
        compactTwoOptionsHint: false,
        creatorTiebreakHint: false,
      };
    case "vote_no_proposals":
      return {
        memberProposals: "off",
        attendance: "binary",
        lockSingleChoicePerCategory: false,
        compactTwoOptionsHint: false,
        creatorTiebreakHint: false,
      };
    case "organizer_curated_poll":
      return {
        memberProposals: "off",
        attendance: "binary",
        lockSingleChoicePerCategory: false,
        compactTwoOptionsHint: false,
        creatorTiebreakHint: false,
      };
    case "compact_preferences":
      return {
        memberProposals: "on",
        attendance: "binary",
        lockSingleChoicePerCategory: false,
        compactTwoOptionsHint: true,
        creatorTiebreakHint: false,
      };
    case "majority_with_creator_tiebreak":
      return {
        memberProposals: "on",
        attendance: "binary",
        lockSingleChoicePerCategory: false,
        compactTwoOptionsHint: false,
        creatorTiebreakHint: true,
      };
    default:
      return surveyBehavior(DEFAULT_SURVEY_MODE);
  }
}

export function allowsMemberProposals(mode: SurveyModeId): boolean {
  const b = surveyBehavior(mode);
  return b.memberProposals !== "off";
}

export function memberProposalsRequireApproval(mode: SurveyModeId): boolean {
  return surveyBehavior(mode).memberProposals === "pending_creator";
}

/** Suggerimento automatico in base a date, fasce/orari e luoghi scelti nel wizard. */
export type SurveyModeRecommendation = {
  mode: SurveyModeId;
  /** Una riga per il banner in creazione evento. */
  reason: string;
};

export function recommendSurveyModeFromPlanning(input: {
  isDirectPlan: boolean;
  fromScopriFlow: boolean;
  dateCount: number;
  timeOptionCount: number;
  venueCount: number;
}): SurveyModeRecommendation {
  const d = Math.max(0, Math.floor(input.dateCount));
  const t = Math.max(0, Math.floor(input.timeOptionCount));
  const v = Math.max(0, Math.floor(input.venueCount));
  const { isDirectPlan, fromScopriFlow } = input;

  if (isDirectPlan) {
    return {
      mode: "fixed_calendar_rsvp",
      reason: "Tutto già fissato: solo conferma presenza.",
    };
  }

  if (d === 0 && t === 0 && v === 0) {
    return {
      mode: "flexible_voting",
      reason: "Niente in lista: il gruppo propone e vota.",
    };
  }

  if (d === 1 && t <= 1 && v === 1) {
    return {
      mode: "fixed_calendar_rsvp",
      reason: "Una sola combinazione: chiedi chi c’è.",
    };
  }

  if (d === 1 && t <= 1 && v === 2) {
    return {
      mode: "fixed_calendar_rsvp_proposals",
      reason: "Due luoghi: idee extra con tua approvazione.",
    };
  }

  if (v >= 4 || d >= 4 || (v >= 3 && d >= 3)) {
    return {
      mode: "compact_preferences",
      reason: "Tante opzioni: meglio poche preferenze segnate.",
    };
  }

  if (fromScopriFlow && v >= 3) {
    return {
      mode: "compact_preferences",
      reason: "Tanti luoghi da Scopri: evita voti ovunque.",
    };
  }

  if (d >= 2 && d <= 3 && v >= 2 && v <= 3 && t <= 2) {
    return {
      mode: "flexible_voting_locked",
      reason: "Griglia piccola: un voto definitivo accelera.",
    };
  }

  if (d >= 2 && v >= 2) {
    return {
      mode: "majority_with_creator_tiebreak",
      reason: "Date e luoghi in gara: utile nota sui pareggi.",
    };
  }

  if (v === 1 && (d >= 2 || t >= 2)) {
    return {
      mode: "organizer_curated_poll",
      reason: "Un posto, più slot: tu curi le opzioni.",
    };
  }

  if (d >= 2 || t >= 2 || v >= 3) {
    return {
      mode: "vote_no_proposals",
      reason: "Lista già ampia: solo voto, niente nuove proposte.",
    };
  }

  return {
    mode: "flexible_voting",
    reason: "Poco o nulla vincolato: sondaggio aperto.",
  };
}

/** Card anteprima (creazione evento): ordine = 1…8 come da specifica utente. */
export const SURVEY_MODE_CARDS: Array<{
  id: SurveyModeId;
  title: string;
  subtitle: string;
  hint: string;
}> = [
  {
    id: "fixed_calendar_rsvp",
    title: "Calendario e RSVP",
    subtitle: "Tu fissi data, ora e luogo.",
    hint: "Altri: Sì / No / Forse.",
  },
  {
    id: "fixed_calendar_rsvp_proposals",
    title: "Calendario + idee",
    subtitle: "Base fissa, suggerimenti da approvare.",
    hint: "Tu accetti cosa entra in lista.",
  },
  {
    id: "flexible_voting",
    title: "Sondaggio aperto",
    subtitle: "Voti e proposte da tutti.",
    hint: "Predefinito, massima libertà.",
  },
  {
    id: "flexible_voting_locked",
    title: "Voto definitivo",
    subtitle: "Una scelta per tipo, non revocabile.",
    hint: "Meno ripensamenti.",
  },
  {
    id: "vote_no_proposals",
    title: "Lista chiusa",
    subtitle: "Solo le tue opzioni in votazione.",
    hint: "Zero nuove voci dal gruppo.",
  },
  {
    id: "organizer_curated_poll",
    title: "Coordinamento",
    subtitle: "Solo tu modifichi la lista.",
    hint: "Il gruppo vota soltanto.",
  },
  {
    id: "compact_preferences",
    title: "Poche preferenze",
    subtitle: "Aperto, ma invito a votare poco.",
    hint: "Max 2 preferenze in chat.",
  },
  {
    id: "majority_with_creator_tiebreak",
    title: "Maggioranza e pareggi",
    subtitle: "Aperto + nota su ex aequo.",
    hint: "Spareggio spesso dal creatore.",
  },
];
