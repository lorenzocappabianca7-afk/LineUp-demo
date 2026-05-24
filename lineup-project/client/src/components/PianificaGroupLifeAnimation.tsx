import { useCallback, useRef, useState } from "react";
import { AlertTriangle, ChevronRight, Megaphone, MessageCircle, Sparkles, Vote } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEMO_CARD_CLASS,
  DEMO_CTA_CLASS,
  DEMO_MODAL_CONTENT,
  DEMO_SECTION_HEADER_CLASS,
  DEMO_SURFACE_CLASS,
} from "@/lib/pianificaDemoLayout";

type Props = {
  onComplete: () => void;
  creatorName?: string;
};

const CHAT_SURVEY_COPY =
  "Quando confermi l'evento, LineUp crea la chat di gruppo con il sondaggio scelto. Mentre il gruppo si accorda su data, ora e luogo, l'AI segue la conversazione: quando capisce che siete d'accordo, aggiunge in automatico l'evento al calendario del tuo telefono, con il luogo, il giorno e l'orario decisi.";

const PUBLISH_EVENT_COPY =
  "Devi organizzare una festa, un calcetto o una cena tra nuovi amici? LineUp ti permette di pubblicare annunci dei tuoi eventi e i tuoi followers potranno far richiesta di partecipazione. Sarai poi tu che hai organizzato ad accettarli e permetterli di farne parte!";

function InfoBanner({
  testId,
  icon,
  iconWrapClass,
  label,
  title,
  body,
  showVoteChatAttention,
  hideContinue,
  fillSpace,
  onContinue,
  continueTestId,
}: {
  testId: string;
  icon: React.ReactNode;
  iconWrapClass: string;
  label: string;
  title: string;
  body: string;
  showVoteChatAttention?: boolean;
  hideContinue?: boolean;
  /** Il banner riempie lo spazio fino al pulsante Prosegui. */
  fillSpace?: boolean;
  onContinue: () => void;
  continueTestId: string;
}) {
  const bodyBlock = (
    <>
      <div className="relative flex items-start gap-3">
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-md",
            iconWrapClass,
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-primary">{label}</p>
          <h3 className="mt-1 text-lg font-bold leading-snug text-gray-900 break-words">{title}</h3>
        </div>
      </div>
      <p className="relative mt-3 text-sm font-semibold leading-[1.65] text-gray-900 break-words sm:text-[15px] sm:leading-[1.7]">
        {body}
      </p>
      {showVoteChatAttention ? (
        <aside
          role="alert"
          data-testid="banner-attention-vote-chat"
          className="relative mt-3.5 overflow-hidden rounded-xl border border-amber-500 bg-gradient-to-br from-amber-100 via-amber-50 to-orange-50 px-2.5 py-2.5 shadow-[0_2px_8px_rgba(245,158,11,0.2)]"
        >
          <div className="flex items-center gap-2">
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-500 text-white shadow-sm"
              aria-hidden
            >
              <AlertTriangle size={15} strokeWidth={2.5} />
            </div>
            <p className="min-w-0 flex-1 text-[11px] font-bold leading-snug text-amber-950 break-words sm:text-xs">
              Nella chat del gruppo, possono scrivere solo coloro che hanno votato il sondaggio
            </p>
          </div>
        </aside>
      ) : null}
    </>
  );

  return (
    <article
      data-testid={testId}
      className={cn(
        "relative isolate w-full overflow-hidden px-4 pt-4 animate-in fade-in duration-500 fill-mode-both motion-reduce:animate-none",
        DEMO_CARD_CLASS,
        fillSpace ? "grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] gap-3 pb-4" : "shrink-0 pb-5",
      )}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10"
        aria-hidden
      />
      {fillSpace ? (
        <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
          {bodyBlock}
        </div>
      ) : (
        <div className="relative">{bodyBlock}</div>
      )}
      {!hideContinue ? (
        <button
          type="button"
          data-testid={continueTestId}
          onClick={onContinue}
          className={cn("relative z-10 mt-0 shrink-0", DEMO_CTA_CLASS)}
        >
          Prosegui
          <ChevronRight size={18} strokeWidth={2.5} aria-hidden />
        </button>
      ) : null}
    </article>
  );
}

export function PianificaGroupLifeAnimation({ onComplete }: Props) {
  const [step, setStep] = useState<0 | 1>(0);
  const [exiting, setExiting] = useState(false);
  const finishedRef = useRef(false);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setExiting(true);
    window.setTimeout(() => onComplete(), 280);
  }, [onComplete]);

  const goNext = useCallback(() => {
    if (finishedRef.current) return;
    if (step === 0) {
      setStep(1);
      return;
    }
    finish();
  }, [step, finish]);

  const progressPct = step === 0 ? 50 : 100;

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-1 flex-col overflow-hidden transition-opacity duration-300 ease-out",
        DEMO_SURFACE_CLASS,
        exiting && "opacity-0",
      )}
      data-testid="pianifica-group-life-demo"
    >
      <div data-testid="group-life-header" className={DEMO_SECTION_HEADER_CLASS}>
        <p className="text-center text-[10px] font-bold uppercase tracking-wide text-primary">Dopo la creazione</p>
        <p className="mt-1 text-center text-sm font-bold text-gray-900">Cosa succede su LineUp</p>
        <p className="mt-1 text-center text-[11px] text-gray-500">
          {step === 0 ? "1 di 2 · Chat, sondaggio e calendario" : "2 di 2 · Pubblica il tuo evento"}
        </p>
        {step === 0 ? (
          <div
            className="mt-2 border-t border-primary/10 pt-2.5 text-center sm:mt-3 sm:pt-3"
            data-testid="group-life-intro"
          >
            <p className="text-lg font-bold text-emerald-600 sm:text-xl">Perfetto,</p>
            <p className="mt-1 text-sm font-semibold leading-snug text-gray-900 sm:text-[15px]">
              hai creato la chat/gruppo per il tuo evento, cosa succede ora?
            </p>
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          "relative z-0 flex min-h-0 flex-1 flex-col overflow-hidden px-4",
          step === 1 ? "pt-5 sm:pt-6" : "pt-3",
          "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        )}
      >
        <div className={cn(DEMO_MODAL_CONTENT, "flex min-h-0 flex-1 flex-col")}>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {step === 0 ? (
              <InfoBanner
                testId="banner-chat-survey-demo"
                icon={<MessageCircle size={24} strokeWidth={2.25} />}
                iconWrapClass="bg-gradient-to-br from-primary to-primary/75 shadow-primary/25"
                label="Chat e sondaggio"
                title="Organizza insieme al gruppo"
                body={CHAT_SURVEY_COPY}
                showVoteChatAttention
                fillSpace
                onContinue={goNext}
                continueTestId="button-prosegui-group-life-demo"
              />
            ) : (
              <InfoBanner
                testId="banner-publish-group-fixed"
                icon={<Megaphone size={24} strokeWidth={2.25} />}
                iconWrapClass="bg-gradient-to-br from-sky-400 to-sky-600 shadow-sky-500/30"
                label="Pubblica con LineUp"
                title="Raggiungi più persone"
                body={PUBLISH_EVENT_COPY}
                fillSpace
                onContinue={goNext}
                continueTestId="button-prosegui-group-life-demo"
              />
            )}
          </div>

          <div className="mt-3 shrink-0">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200/90" aria-hidden>
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="mt-3 flex items-center justify-center gap-4 text-[10px] font-medium text-gray-500">
              <span className={cn("flex items-center gap-1", step === 0 && "font-bold text-primary")}>
                <Vote size={12} aria-hidden />
                Sondaggio
              </span>
              <span className={cn("flex items-center gap-1", step === 1 && "font-bold text-sky-600")}>
                <Sparkles size={12} aria-hidden />
                Pubblicazione
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
