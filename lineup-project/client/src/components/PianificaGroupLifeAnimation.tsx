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
  onContinue: () => void;
  continueTestId: string;
}) {
  return (
    <article
      data-testid={testId}
      className="relative w-full shrink-0 overflow-hidden rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-[#F4FAFF] via-white to-primary/5 px-4 pb-6 pt-5 shadow-xl animate-in fade-in duration-500 fill-mode-both motion-reduce:animate-none"
    >
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10"
        aria-hidden
      />
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
          <h3 className="mt-1 text-base font-bold leading-snug text-gray-900 break-words">{title}</h3>
        </div>
      </div>
      <p className="relative mt-4 text-[13px] font-semibold leading-[1.65] text-gray-900 break-words sm:text-[14px] sm:leading-[1.7]">
        {body}
      </p>
      {showVoteChatAttention ? (
        <aside
          role="alert"
          data-testid="banner-attention-vote-chat"
          className="relative mt-4 overflow-hidden rounded-xl border-2 border-amber-500 bg-gradient-to-br from-amber-100 via-amber-50 to-orange-50 px-3 py-2.5 shadow-[0_3px_10px_rgba(245,158,11,0.28)] ring-1 ring-amber-400/35"
        >
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white shadow-sm"
              aria-hidden
            >
              <AlertTriangle size={17} strokeWidth={2.5} />
            </div>
            <p className="min-w-0 flex-1 text-xs font-bold leading-snug text-amber-950 break-words">
              Nella chat del gruppo, possono scrivere solo coloro che hanno votato il sondaggio
            </p>
          </div>
        </aside>
      ) : null}
      <button
        type="button"
        data-testid={continueTestId}
        onClick={onContinue}
        className="relative mt-5 flex min-h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-primary to-primary/80 py-3.5 text-base font-bold text-primary-foreground shadow-lg shadow-primary/25 active:scale-[0.98] motion-reduce:active:scale-100"
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
        className="relative z-10 shrink-0 border-b border-primary/15 bg-white px-4 pt-3 pb-4 shadow-sm"
      >
        <p className="text-center text-[10px] font-bold uppercase tracking-wide text-primary">Dopo la creazione</p>
        <p className="mt-1 text-center text-sm font-bold text-gray-900">Cosa succede su LineUp</p>
        <p className="mt-1 text-center text-[11px] text-gray-500">
          {step === 0 ? "1 di 2 · Chat, sondaggio e calendario" : "2 di 2 · Pubblica il tuo evento"}
        </p>
        {step === 0 ? (
          <div className="mt-4 border-t border-primary/10 pt-4 text-center" data-testid="group-life-intro">
            <p className="text-lg font-bold text-emerald-600 sm:text-xl">Perfetto,</p>
            <p className="mt-1 text-sm font-semibold leading-snug text-gray-900 sm:text-[15px]">
              hai creato la chat/gruppo per il tuo evento, cosa succede ora?
            </p>
          </div>
        ) : null}
      </div>

      <div className="relative z-0 flex min-h-0 flex-1 flex-col items-center justify-start overflow-y-auto overscroll-y-contain px-4 pt-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex w-full max-w-[340px] flex-col">
          {step === 0 ? (
            <>
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

        <div className="mx-auto mt-5 h-1.5 w-full max-w-[340px] overflow-hidden rounded-full bg-gray-200" aria-hidden>
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="mx-auto mt-4 flex max-w-[340px] items-center justify-center gap-4 text-[10px] font-medium text-gray-500">
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
