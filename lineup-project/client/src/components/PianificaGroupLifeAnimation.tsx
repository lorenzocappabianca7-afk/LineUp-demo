import { useCallback, useRef, useState } from "react";
import { AlertTriangle, ChevronRight, Megaphone, MessageCircle, Sparkles, Vote } from "lucide-react";
import { cn } from "@/lib/utils";

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
  compact,
  onContinue,
  continueTestId,
}: {
  testId: string;
  icon: React.ReactNode;
  iconWrapClass: string;
  label: string;
  title: string;
  body: string;
  /** Banner attenzione chat/sondaggio sopra Prosegui. */
  showVoteChatAttention?: boolean;
  /** Layout più compatto (primo step «Dopo la creazione»). */
  compact?: boolean;
  onContinue: () => void;
  continueTestId: string;
}) {
  return (
    <article
      data-testid={testId}
      className={cn(
        "relative w-full shrink-0 overflow-hidden rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-[#F4FAFF] via-white to-primary/5 shadow-xl animate-in fade-in duration-500 fill-mode-both motion-reduce:animate-none",
        compact ? "px-3 pb-4 pt-3.5" : "px-4 pb-6 pt-5",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-10 -top-10 rounded-full bg-primary/10",
          compact ? "h-24 w-24" : "h-32 w-32",
        )}
        aria-hidden
      />
      <div className="relative flex items-start gap-2.5">
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-2xl text-white shadow-md",
            compact ? "h-10 w-10 rounded-xl" : "h-12 w-12",
            iconWrapClass,
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-primary">{label}</p>
          <h3
            className={cn(
              "mt-0.5 font-bold leading-snug text-gray-900 break-words",
              compact ? "text-[15px]" : "mt-1 text-base",
            )}
          >
            {title}
          </h3>
        </div>
      </div>
      <p
        className={cn(
          "relative font-semibold text-gray-900 break-words",
          compact
            ? "mt-2.5 text-[11.5px] leading-[1.55]"
            : "mt-4 text-[13px] leading-[1.65] sm:text-[14px] sm:leading-[1.7]",
        )}
      >
        {body}
      </p>
      {showVoteChatAttention ? (
        <aside
          role="alert"
          data-testid="banner-attention-vote-chat"
          className={cn(
            "relative overflow-hidden rounded-lg border-2 border-amber-500 bg-gradient-to-br from-amber-100 via-amber-50 to-orange-50 shadow-[0_2px_8px_rgba(245,158,11,0.22)] ring-1 ring-amber-400/35",
            compact ? "mt-2.5 px-2.5 py-2" : "mt-4 rounded-xl px-3 py-2.5 shadow-[0_3px_10px_rgba(245,158,11,0.28)]",
          )}
        >
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex shrink-0 items-center justify-center rounded-md bg-amber-500 text-white shadow-sm",
                compact ? "h-6 w-6" : "h-8 w-8 rounded-lg",
              )}
              aria-hidden
            >
              <AlertTriangle size={compact ? 14 : 17} strokeWidth={2.5} />
            </div>
            <p
              className={cn(
                "min-w-0 flex-1 font-bold leading-snug text-amber-950 break-words",
                compact ? "text-[10px]" : "text-xs",
              )}
            >
              Nella chat del gruppo, possono scrivere solo coloro che hanno votato il sondaggio
            </p>
          </div>
        </aside>
      ) : null}
      <button
        type="button"
        data-testid={continueTestId}
        onClick={onContinue}
        className={cn(
          "relative flex w-full touch-manipulation items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-primary to-primary/80 font-bold text-primary-foreground shadow-lg shadow-primary/25 active:scale-[0.98] motion-reduce:active:scale-100",
          compact ? "mt-3 min-h-11 py-3 text-sm" : "mt-5 min-h-12 py-3.5 text-base",
        )}
      >
        Prosegui
        <ChevronRight size={18} strokeWidth={2.5} aria-hidden />
      </button>
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
        "flex h-full min-h-0 flex-col overflow-hidden bg-[#F4FAFF] transition-opacity duration-300 ease-out",
        exiting && "opacity-0",
      )}
      data-testid="pianifica-group-life-demo"
    >
      <div
        data-testid="group-life-header"
        className={cn(
          "relative z-10 shrink-0 border-b border-primary/15 bg-white px-4 shadow-sm",
          step === 0 ? "pt-2.5 pb-2" : "pt-3 pb-4",
        )}
      >
        <p className="text-center text-[10px] font-bold uppercase tracking-wide text-primary">Dopo la creazione</p>
        <p className="mt-0.5 text-center text-sm font-bold text-gray-900">Cosa succede su LineUp</p>
        <p className="mt-0.5 text-center text-[11px] text-gray-500">
          {step === 0 ? "1 di 2 · Chat, sondaggio e calendario" : "2 di 2 · Pubblica il tuo evento"}
        </p>
        {step === 0 ? (
          <div className="mt-2 border-t border-primary/10 pt-2 text-center" data-testid="group-life-intro">
            <p className="text-base font-bold text-emerald-600">Perfetto,</p>
            <p className="mt-0.5 text-xs font-semibold leading-snug text-gray-900">
              hai creato la chat/gruppo per il tuo evento, cosa succede ora?
            </p>
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          "relative z-0 flex min-h-0 flex-1 flex-col items-center px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))]",
          step === 0
            ? "justify-start overflow-hidden pt-1.5"
            : "justify-start overflow-y-auto overscroll-y-contain py-4 pt-3",
        )}
      >
        <div className="flex w-full max-w-[340px] flex-col">
          {step === 0 ? (
            <>
              <InfoBanner
                testId="banner-chat-survey-demo"
                icon={<MessageCircle size={20} strokeWidth={2.25} />}
                iconWrapClass="bg-gradient-to-br from-primary to-primary/75 shadow-primary/25"
                label="Chat e sondaggio"
                title="Organizza insieme al gruppo"
                body={CHAT_SURVEY_COPY}
                showVoteChatAttention
                compact
                onContinue={goNext}
                continueTestId="button-prosegui-group-life-demo"
              />
            </>
          ) : (
            <InfoBanner
              testId="banner-publish-group-fixed"
              icon={<Megaphone size={22} strokeWidth={2.25} />}
              iconWrapClass="bg-gradient-to-br from-sky-400 to-sky-600 shadow-sky-500/30"
              label="Pubblica con LineUp"
              title="Raggiungi più persone"
              body={PUBLISH_EVENT_COPY}
              onContinue={goNext}
              continueTestId="button-prosegui-group-life-demo"
            />
          )}
        </div>

        <div
          className={cn(
            "mx-auto h-1 w-full max-w-[340px] overflow-hidden rounded-full bg-gray-200",
            step === 0 ? "mt-2 shrink-0" : "mt-5 h-1.5",
          )}
          aria-hidden
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div
          className={cn(
            "mx-auto flex max-w-[340px] shrink-0 items-center justify-center gap-4 text-[10px] font-medium text-gray-500",
            step === 0 ? "mt-2" : "mt-4",
          )}
        >
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
  );
}
