/**
 * Modalità di sondaggio per un evento (scelta in creazione gruppo).
 * Valori persistiti in `app_events.survey_mode`.
 */

/** I quattro modelli mostrati in creazione evento. */
export const CREATOR_SURVEY_MODE_IDS = [
  /** 1 — Una sola combinazione: il gruppo vota solo presenza (Sì / No). */
  "fixed_calendar_rsvp",
  /** 2 — Solo il creatore aggiunge o rimuove opzioni; gli altri votano. */
  "organizer_curated_poll",
  /** 3 — Tutti possono proporre, togliere e votare su data, ora e luogo. */
  "flexible_voting",
  /** 4 — LineUp AI costruisce il sondaggio sulle tue esigenze. */
  "ai_personalized",
] as const;

export type CreatorSurveyModeId = (typeof CREATOR_SURVEY_MODE_IDS)[number];

/** Valori legacy ancora validi in DB (non più in picker). */
const LEGACY_SURVEY_MODE_IDS = [
  "fixed_calendar_rsvp_proposals",
  "flexible_voting_locked",
  "vote_no_proposals",
  "compact_preferences",
  "majority_with_creator_tiebreak",
] as const;

export const SURVEY_MODE_IDS = [
  ...CREATOR_SURVEY_MODE_IDS,
  ...LEGACY_SURVEY_MODE_IDS,
] as const;

export type SurveyModeId = (typeof SURVEY_MODE_IDS)[number];

export const DEFAULT_SURVEY_MODE: CreatorSurveyModeId = "flexible_voting";

export function parseSurveyMode(raw: unknown): SurveyModeId {
  if (typeof raw === "string" && (SURVEY_MODE_IDS as readonly string[]).includes(raw)) {
    return raw as SurveyModeId;
  }
  return DEFAULT_SURVEY_MODE;
}

export function isCreatorSurveyMode(id: SurveyModeId): id is CreatorSurveyModeId {
  return (CREATOR_SURVEY_MODE_IDS as readonly string[]).includes(id);
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
  /** Sondaggio configurato con assistenza AI. */
  aiPersonalizedHint: boolean;
};

const behaviorDefaults = {
  lockSingleChoicePerCategory: false,
  compactTwoOptionsHint: false,
  creatorTiebreakHint: false,
  aiPersonalizedHint: false,
};

export function surveyBehavior(mode: SurveyModeId): SurveyBehavior {
  switch (mode) {
    case "fixed_calendar_rsvp":
      return {
        memberProposals: "off",
        attendance: "binary",
        ...behaviorDefaults,
      };
    case "organizer_curated_poll":
      return {
        memberProposals: "off",
        attendance: "binary",
        ...behaviorDefaults,
      };
    case "flexible_voting":
      return {
        memberProposals: "on",
        attendance: "binary",
        ...behaviorDefaults,
      };
    case "ai_personalized":
      return {
        memberProposals: "on",
        attendance: "binary",
        ...behaviorDefaults,
        aiPersonalizedHint: true,
      };
    case "fixed_calendar_rsvp_proposals":
      return {
        memberProposals: "pending_creator",
        attendance: "ternary",
        ...behaviorDefaults,
      };
    case "flexible_voting_locked":
      return {
        memberProposals: "on",
        attendance: "binary",
        lockSingleChoicePerCategory: true,
        compactTwoOptionsHint: false,
        creatorTiebreakHint: false,
        aiPersonalizedHint: false,
      };
    case "vote_no_proposals":
      return {
        memberProposals: "off",
        attendance: "binary",
        ...behaviorDefaults,
      };
    case "compact_preferences":
      return {
        memberProposals: "on",
        attendance: "binary",
        compactTwoOptionsHint: true,
        lockSingleChoicePerCategory: false,
        creatorTiebreakHint: false,
        aiPersonalizedHint: false,
      };
    case "majority_with_creator_tiebreak":
      return {
        memberProposals: "on",
        attendance: "binary",
        creatorTiebreakHint: true,
        lockSingleChoicePerCategory: false,
        compactTwoOptionsHint: false,
        aiPersonalizedHint: false,
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
  mode: CreatorSurveyModeId;
  /** Una riga per il banner in creazione evento. */
  reason: string;
};

export function recommendSurveyModeFromPlanning(input: {
  fromScopriFlow: boolean;
  dateCount: number;
  timeOptionCount: number;
  venueCount: number;
}): SurveyModeRecommendation {
  const d = Math.max(0, Math.floor(input.dateCount));
  const t = Math.max(0, Math.floor(input.timeOptionCount));
  const v = Math.max(0, Math.floor(input.venueCount));
  const { fromScopriFlow } = input;

  if (d === 1 && t <= 1 && v === 1) {
    return {
      mode: "fixed_calendar_rsvp",
      reason: "Hai una sola combinazione: chiedi al gruppo solo se ci sarà.",
    };
  }

  if (d === 0 && t === 0 && v === 0) {
    return {
      mode: "flexible_voting",
      reason: "Niente ancora in lista: lascia che il gruppo proponga e voti.",
    };
  }

  if (fromScopriFlow || d >= 3 || v >= 4 || (d >= 2 && v >= 2)) {
    return {
      mode: "ai_personalized",
      reason: "Molte variabili: l’AI può adattare il sondaggio al tuo caso.",
    };
  }

  if (d >= 2 || t >= 2 || v >= 2) {
    return {
      mode: "organizer_curated_poll",
      reason: "Più opzioni in gioco: tieni tu il controllo della lista.",
    };
  }

  return {
    mode: "flexible_voting",
    reason: "Poche vincoli: sondaggio aperto per tutti.",
  };
}

/** Card anteprima (creazione evento): i quattro modelli in chat. */
export const SURVEY_MODE_CARDS: Array<{
  id: CreatorSurveyModeId;
  title: string;
  subtitle: string;
  hint: string;
}> = [
  {
    id: "fixed_calendar_rsvp",
    title: "Presenza sì / no",
    subtitle: "Hai fissato una sola data, ora e luogo (e attività).",
    hint: "Il gruppo vota solo se parteciperà.",
  },
  {
    id: "organizer_curated_poll",
    title: "Lista del creatore",
    subtitle: "Solo tu aggiungi o togli giorni, orari e luoghi.",
    hint: "Gli altri votano sulle tue opzioni.",
  },
  {
    id: "flexible_voting",
    title: "Sondaggio aperto",
    subtitle: "Tutti possono proporre, togliere e votare.",
    hint: "Libertà su data, ora e luogo.",
  },
  {
    id: "ai_personalized",
    title: "Sondaggio con AI",
    subtitle: "LineUp costruisce il modello sulle tue esigenze.",
    hint: "Personalizzato per te e il gruppo.",
  },
];
