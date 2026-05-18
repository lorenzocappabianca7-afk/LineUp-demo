import { useCallback, useRef, useState } from "react";
import { ChevronRight, Megaphone, MessageCircle, Sparkles, Vote } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  onComplete: () => void;
  creatorName?: string;
};

const CHAT_SURVEY_COPY =
  "Quando crei l'evento, LineUp apre una chat di gruppo con un sondaggio su data, ora e luogo. Quando tutti sono d'accordo, l'organizzatore tocca il tasto di conferma e l'evento viene aggiunto al calendario LineUp.";

const PUBLISH_EVENT_COPY =
  "Devi organizzare una festa, un calcetto o una cena tra nuovi amici? LineUp ti permette di pubblicare annunci dei tuoi eventi e i tuoi followers potranno far richiesta di partecipazione. Sarai poi tu che hai organizzato ad accettarli e permetterli di farne parte!";

function InfoBanner({
  testId,
  icon,
  iconWrapClass,
  label,
  title,
  body,
  attentionNote,
  onContinue,
  continueTestId,
}: {
  testId: string;
  icon: React.ReactNode;
  iconWrapClass: string;
  label: string;
  title: string;
  body: string;
  /** Vignetta sopra il pulsante Prosegui. */
  attentionNote?: string;
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
      {attentionNote ? (
        <p
          className="relative mt-4 rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2.5 text-[11px] font-semibold leading-snug text-amber-950 break-words"
          data-testid="banner-attention-vote-chat"
        >
          {attentionNote}
        </p>
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
                attentionNote="Attenzione: solo chi ha votato il sondaggio potrà mandare messaggi nella chat del gruppo."
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
