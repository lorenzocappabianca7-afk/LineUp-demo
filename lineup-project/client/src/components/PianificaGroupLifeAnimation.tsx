import { useCallback, useRef, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, Megaphone, MessageCircle, Sparkles, Vote } from "lucide-react";
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
  "Pubblica l'evento oltre al tuo gruppo: raggiungi persone che seguono il tuo profilo e allarga il piano.";

const PUBLISH_PARTICIPATION_STEPS = [
  {
    title: "Posti disponibili",
    text: "Nell'annuncio indichi quanti posti sono liberi.",
  },
  {
    title: "Richieste",
    text: "Gli utenti interessati chiedono di partecipare.",
  },
  {
    title: "Accetti o rifiuti",
    text: "Decidi tu chi aggiungere al gruppo.",
  },
] as const;

function InfoBanner({
  testId,
  icon,
  iconWrapClass,
  label,
  title,
  body,
  showVoteChatAttention,
  hideContinue,
  compactPublish,
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
  /** Banner pubblicazione più basso (lascia spazio ai 3 step sotto). */
  compactPublish?: boolean;
  onContinue: () => void;
  continueTestId: string;
}) {
  return (
    <article
      data-testid={testId}
      className={cn(
        "relative isolate w-full shrink-0 overflow-hidden animate-in fade-in duration-500 fill-mode-both motion-reduce:animate-none",
        DEMO_CARD_CLASS,
        compactPublish ? "px-3.5 pb-3.5 pt-3" : "px-4 pb-5 pt-4",
      )}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary/10"
        aria-hidden
      />
      <div className="relative flex items-start gap-3">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-md",
            iconWrapClass,
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-primary">{label}</p>
          <h3 className="mt-0.5 text-base font-bold leading-snug text-gray-900 break-words">{title}</h3>
        </div>
      </div>
      <p
        className={cn(
          "relative font-semibold text-gray-900 break-words",
          compactPublish
            ? "mt-2 text-[11px] leading-snug"
            : "mt-3 text-xs leading-[1.6] sm:text-[13px] sm:leading-[1.65]",
        )}
      >
        {body}
      </p>
      {showVoteChatAttention ? (
        <aside
          role="alert"
          data-testid="banner-attention-vote-chat"
          className="relative mt-3 overflow-hidden rounded-xl border border-amber-500 bg-gradient-to-br from-amber-100 via-amber-50 to-orange-50 px-3 py-2.5 shadow-[0_2px_8px_rgba(245,158,11,0.2)]"
        >
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white shadow-sm"
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
      {!hideContinue ? (
        <button
          type="button"
          data-testid={continueTestId}
          onClick={onContinue}
          className={cn("relative mt-4", DEMO_CTA_CLASS)}
        >
          Prosegui
          <ChevronRight size={18} strokeWidth={2.5} aria-hidden />
        </button>
      ) : null}
    </article>
  );
}

/** Tre passaggi sotto il banner pubblicazione (spazio bianco del modale). */
function PublishParticipationFlow() {
  return (
    <ol
      className="flex w-full flex-col gap-0"
      data-testid="publish-participation-flow"
      aria-label="Come funzionano posti e richieste"
    >
      {PUBLISH_PARTICIPATION_STEPS.map((item, index) => (
        <li key={item.title} className="flex flex-col">
          <div className="flex items-start gap-2 rounded-lg bg-white px-2 py-1.5 shadow-sm ring-1 ring-sky-100">
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500 text-[10px] font-bold text-white"
              aria-hidden
            >
              {index + 1}
            </span>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-[11px] font-bold leading-tight text-gray-900">{item.title}</p>
              <p className="mt-px text-[10px] font-medium leading-snug text-gray-600">{item.text}</p>
            </div>
          </div>
          {index < PUBLISH_PARTICIPATION_STEPS.length - 1 ? (
            <ChevronDown className="mx-auto h-3.5 w-3.5 shrink-0 text-sky-400" strokeWidth={2.5} aria-hidden />
          ) : null}
        </li>
      ))}
    </ol>
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
          <div className="mt-3 border-t border-primary/10 pt-3 text-center" data-testid="group-life-intro">
            <p className="text-lg font-bold text-emerald-600">Perfetto,</p>
            <p className="mt-1 text-sm font-semibold leading-snug text-gray-900">
              hai creato la chat/gruppo per il tuo evento, cosa succede ora?
            </p>
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          "relative z-0 flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-4",
          "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        )}
      >
        <div className={cn(DEMO_MODAL_CONTENT, "flex min-h-0 flex-1 flex-col")}>
          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col",
              step === 0
                ? "overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]"
                : "overflow-hidden",
            )}
          >
            {step === 0 ? (
              <InfoBanner
                testId="banner-chat-survey-demo"
                icon={<MessageCircle size={22} strokeWidth={2.25} />}
                iconWrapClass="bg-gradient-to-br from-primary to-primary/75 shadow-primary/25"
                label="Chat e sondaggio"
                title="Organizza insieme al gruppo"
                body={CHAT_SURVEY_COPY}
                showVoteChatAttention
                onContinue={goNext}
                continueTestId="button-prosegui-group-life-demo"
              />
            ) : (
              <>
                <InfoBanner
                  testId="banner-publish-group-fixed"
                  icon={<Megaphone size={20} strokeWidth={2.25} />}
                  iconWrapClass="bg-gradient-to-br from-sky-400 to-sky-600 shadow-sky-500/30"
                  label="Pubblica con LineUp"
                  title="Raggiungi più persone"
                  body={PUBLISH_EVENT_COPY}
                  hideContinue
                  compactPublish
                  onContinue={goNext}
                  continueTestId="button-prosegui-group-life-demo"
                />
                <div className="mt-2 min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
                  <PublishParticipationFlow />
                </div>
                <button
                  type="button"
                  data-testid="button-prosegui-group-life-demo"
                  onClick={goNext}
                  className={cn("relative mt-2 shrink-0", DEMO_CTA_CLASS)}
                >
                  Prosegui
                  <ChevronRight size={18} strokeWidth={2.5} aria-hidden />
                </button>
              </>
            )}
          </div>

          <div className="mt-4 shrink-0">
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
