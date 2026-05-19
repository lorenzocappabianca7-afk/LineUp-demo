export type PreviewGuideId =
  | "step0"
  | "step1-category"
  | "step1-sub"
  | "step2"
  | "step3"
  | "step4"
  | "step5"
  | "step6"
  | "success";

type GuideContent = {
  stepLabel: string;
  title: string;
  body: string;
  action: string;
};

const GUIDES: Record<PreviewGuideId, GuideContent> = {
  step0: {
    stepLabel: "Passo 1 di 7",
    title: "Con chi organizzi?",
    body: "Scegli un gruppo oppure uno o più contatti da invitare al sondaggio.",
    action: "Seleziona almeno un gruppo o un contatto, poi premi Continua in basso.",
  },
  "step1-category": {
    stepLabel: "Passo 2 di 7",
    title: "Che tipo di attività?",
    body: "Indica la categoria che descrive meglio la tua proposta (cibo, sport, cultura…).",
    action: "Tocca una delle card colorate per scegliere la categoria.",
  },
  "step1-sub": {
    stepLabel: "Passo 2 di 7",
    title: "Sottocategoria",
    body: "Rendi l’evento più chiaro per il gruppo: aperitivo, cena, padel, museo, ecc.",
    action: "Seleziona una o più pillole; se non trovi l’attività, usa Altro e scrivila tu.",
  },
  step2: {
    stepLabel: "Passo 3 di 7",
    title: "Quando?",
    body: "Proponi uno o più giorni possibili. Il gruppo potrà votare la data preferita.",
    action: "Tocca i giorni sul calendario (quelli passati sono disattivati), poi Continua.",
  },
  step3: {
    stepLabel: "Passo 4 di 7",
    title: "Fascia oraria (opzionale)",
    body: "Puoi suggerire mattina, pomeriggio o sera senza essere troppo preciso.",
    action: "Seleziona le fasce che ti interessano oppure salta con Continua senza fasce.",
  },
  step4: {
    stepLabel: "Passo 5 di 7",
    title: "Orari per giorno (opzionale)",
    body: "Se hai scelto dei giorni, puoi aggiungere orari precisi per ciascuno.",
    action: "Muovi lo slider, poi premi Conferma orario per aggiungere l’orario scelto.",
  },
  step5: {
    stepLabel: "Passo 6 di 7",
    title: "Dove?",
    body: "Scegli uno o più luoghi a Torino. Puoi cercare per nome o usare i suggerimenti.",
    action: "Seleziona almeno un locale, poi premi Scegli modello sondaggio in basso.",
  },
  step6: {
    stepLabel: "Passo 7 di 7",
    title: "Modello di sondaggio in chat",
    body: "Quattro modelli: presenza sì/no, lista solo tua, sondaggio aperto per tutti, oppure personalizzato con l’AI.",
    action: "Scegli una card e premi Crea evento con questo sondaggio.",
  },
  success: {
    stepLabel: "Fine prova",
    title: "Hai completato la simulazione",
    body: "Hai visto tutte le fasi del tasto Pianifica: inviti, attività, date, orari, luoghi e sondaggio.",
    action: "Premi Chiudi per uscire. Nell’app reale potrai aprire la chat dell’evento.",
  },
};

const SCOPRI_LABELS: Partial<Record<PreviewGuideId, string>> = {
  step0: "Passo 1 di 5",
  step2: "Passo 2 di 5",
  step3: "Passo 3 di 5",
  step4: "Passo 4 di 5",
  step5: "Passo 5 di 5",
  step6: "Passo 5 di 5",
};

const SCOPRI_OVERRIDES: Partial<Record<PreviewGuideId, Partial<GuideContent>>> = {
  step5: {
    body: "I luoghi sono già stati scelti con Scopri AI. Controlla che vadano bene per il gruppo.",
    action: "Se serve, torna indietro per modificare date e orari; poi scegli il modello di sondaggio.",
  },
};

export function getPianificaPreviewGuide(id: PreviewGuideId, fromScopriFlow: boolean): GuideContent {
  const base = GUIDES[id];
  const scopriExtra = fromScopriFlow ? SCOPRI_OVERRIDES[id] : undefined;
  const stepLabel = fromScopriFlow && SCOPRI_LABELS[id] ? SCOPRI_LABELS[id]! : base.stepLabel;
  return { ...base, ...scopriExtra, stepLabel };
}
