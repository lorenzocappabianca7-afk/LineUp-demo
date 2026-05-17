import { Check, ChevronLeft, Sparkles } from "lucide-react";
import { PianificaStepGuide } from "@/components/PianificaStepGuide";
import { cn } from "@/lib/utils";
import {
  SURVEY_MODE_CARDS,
  type SurveyModeId,
} from "@shared/surveyModes";

export type SurveyPreviewGuide = {
  stepLabel: string;
  title: string;
  body: string;
  action: string;
};

type Props = {
  /** Banner istruzioni demo: sempre card bianca (gestito qui, non dal genitore). */
  previewGuide?: SurveyPreviewGuide | null;
  onBack?: () => void;
  value: SurveyModeId;
  onChange: (id: SurveyModeId) => void;
  onContinue: () => void;
  /** Se true, disabilita il pulsante finale (es. durante la creazione evento). */
  isSubmitting?: boolean;
  /** Modalità suggerita in base a date, orari e luoghi scelti nel wizard. */
  recommendedId?: SurveyModeId;
  recommendationReason?: string;
  /** Imposta il valore al consiglio (es. `() => setSurveyMode(rec.mode)`). */
  onApplyRecommendation?: () => void;
};

/** Mini-anteprima visiva (solo CSS) per tipo di sondaggio. */
function ModePreview({ id }: { id: SurveyModeId }) {
  const base = "rounded-md border border-gray-200 bg-white p-1 shadow-inner";
  if (id === "fixed_calendar_rsvp" || id === "fixed_calendar_rsvp_proposals") {
    return (
      <div className={cn(base, "space-y-0.5")}>
        <div className="grid grid-cols-7 gap-px">
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className={cn("h-1.5 rounded-[1px]", i === 5 ? "bg-primary" : "bg-gray-100")} />
          ))}
        </div>
        <div className="flex gap-0.5 justify-center pt-0.5">
          <span className="h-1.5 w-3 rounded-full bg-emerald-400" />
          <span className="h-1.5 w-3 rounded-full bg-gray-200" />
          <span className="h-1.5 w-3 rounded-full bg-amber-300" />
        </div>
      </div>
    );
  }
  if (id === "flexible_voting" || id === "majority_with_creator_tiebreak") {
    return (
      <div className={cn(base, "flex gap-0.5 items-end justify-center h-[38px]")}>
        <div className="w-2 h-3 bg-primary/40 rounded-sm" />
        <div className="w-2 h-5 bg-primary rounded-sm" />
        <div className="w-2 h-2 bg-gray-200 rounded-sm" />
        <div className="w-2 h-4 bg-primary/60 rounded-sm" />
      </div>
    );
  }
  if (id === "flexible_voting_locked") {
    return (
      <div className={cn(base, "flex items-center justify-center h-[38px] gap-0.5")}>
        <div className="w-6 h-4 rounded border-2 border-primary bg-primary/15 flex items-center justify-center">
          <Check size={10} className="text-primary" strokeWidth={3} />
        </div>
        <div className="w-5 h-4 rounded border border-gray-200 bg-gray-50 opacity-40" />
      </div>
    );
  }
  if (id === "vote_no_proposals" || id === "organizer_curated_poll") {
    return (
      <div className={cn(base, "flex flex-col gap-0.5 justify-center h-[38px] px-1")}>
        <div className="h-1.5 w-full rounded-full bg-primary/25" />
        <div className="h-1.5 w-[85%] rounded-full bg-primary/40" />
        <div className="h-1.5 w-full rounded-full bg-gray-100" />
      </div>
    );
  }
  /* compact_preferences */
  return (
    <div className={cn(base, "flex items-center justify-center gap-1 h-[38px]")}>
      <div className="w-7 h-5 rounded border-2 border-primary bg-primary/10" />
      <div className="w-7 h-5 rounded border border-gray-200 bg-gray-50" />
    </div>
  );
}

export function SurveyModePicker({
  previewGuide,
  onBack,
  value,
  onChange,
  onContinue,
  isSubmitting,
  recommendedId,
  recommendationReason,
  onApplyRecommendation,
}: Props) {
  const rec = recommendedId && SURVEY_MODE_CARDS.some((c) => c.id === recommendedId) ? recommendedId : undefined;
  const showRecBanner = Boolean(rec && recommendationReason?.trim());
  const isRecSelected = rec != null && value === rec;

  return (
    <div className="flex h-full min-h-0 flex-col bg-blue-600">
      <div
        data-testid="survey-mode-scroll"
        className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain bg-blue-600 pb-2 no-scrollbar [-webkit-overflow-scrolling:touch]"
      >
        {previewGuide ? <PianificaStepGuide {...previewGuide} variant="onBlue" /> : null}
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="mx-5 mb-2 flex items-center gap-1.5 text-xs font-semibold text-blue-100 hover:text-white"
          >
            <ChevronLeft size={16} />
            Indietro ai luoghi
          </button>
        ) : null}
        <div className="px-5 pt-3 pb-2">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-200">Dopo i luoghi</p>
          <h2 className="mt-1 text-lg font-bold text-white">Tipo di sondaggio</h2>
          <p className="mt-1 text-xs leading-snug text-blue-100/95">
            Come votare su data, orario e luogo. Indietro modifica la lista luoghi.
          </p>
          {showRecBanner && (
            <div className="mt-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
              <div className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-blue-800">Consiglio per le tue scelte</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-gray-800">{recommendationReason}</p>
                  {onApplyRecommendation && !isRecSelected && (
                    <button
                      type="button"
                      data-testid="button-survey-apply-recommendation"
                      onClick={onApplyRecommendation}
                      className="mt-2 text-[11px] font-bold text-blue-700 underline decoration-blue-400 underline-offset-2 hover:text-blue-900"
                    >
                      Usa questo tipo
                    </button>
                  )}
                  {isRecSelected && (
                    <p className="mt-1.5 text-[10px] font-semibold text-emerald-700">Tipo consigliato selezionato.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 px-4 pb-4 sm:grid-cols-2">
          {SURVEY_MODE_CARDS.map((card) => {
            const sel = card.id === value;
            const isRecommended = rec === card.id;
            return (
              <button
                key={card.id}
                type="button"
                data-testid={`survey-mode-${card.id}`}
                data-recommended={isRecommended ? "true" : undefined}
                onClick={() => onChange(card.id)}
                className={cn(
                  "relative flex flex-col rounded-xl border-2 bg-white p-2.5 text-left transition-all active:scale-[0.98]",
                  sel
                    ? "z-[1] border-amber-400 shadow-lg shadow-amber-500/25 ring-[3px] ring-amber-300 ring-offset-2 ring-offset-blue-600"
                    : "border-gray-100 hover:border-gray-200",
                  isRecommended && !sel && "border-amber-200 ring-1 ring-amber-200/60",
                )}
                aria-pressed={sel}
              >
                {sel && (
                  <span className="absolute -left-1 -top-1 z-[2] flex h-5 w-5 items-center justify-center rounded-full border-2 border-amber-400 bg-amber-300 text-amber-950 shadow-sm">
                    <Check size={12} strokeWidth={3} aria-hidden />
                  </span>
                )}
                {isRecommended && (
                  <span className="absolute right-2 top-2 z-[1] flex items-center gap-0.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wide text-white shadow-sm">
                    <Sparkles className="h-2.5 w-2.5" aria-hidden />
                    Consigliato
                  </span>
                )}
                <div className="mb-2 shrink-0 overflow-hidden rounded-lg bg-gray-50/80 p-1.5">
                  <ModePreview id={card.id} />
                </div>
                <p className="text-[11px] font-bold leading-tight text-gray-900 line-clamp-2">{card.title}</p>
                <p className="mt-0.5 text-[9px] leading-snug text-gray-500 line-clamp-3">{card.subtitle}</p>
                <p className="mt-1 text-[8px] font-medium leading-tight text-primary/90 line-clamp-2">{card.hint}</p>
              </button>
            );
          })}
        </div>
      </div>
      <div className="shrink-0 border-t border-blue-500/40 bg-blue-700/50 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          data-testid="button-survey-mode-continue"
          onClick={onContinue}
          disabled={isSubmitting}
          className="min-h-12 w-full touch-manipulation rounded-xl bg-white py-3 text-base font-bold text-blue-700 shadow-md active:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? "Creazione in corso…" : "Crea evento con questo sondaggio"}
        </button>
      </div>
    </div>
  );
}
