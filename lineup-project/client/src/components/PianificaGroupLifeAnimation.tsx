import { useCallback, useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Megaphone,
  MessageCircle,
  Plus,
  Search,
  Send,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getAvatarColor, getInitials } from "@/lib/appUtils";

const STEP_COUNT = 4;
const FADE_MS = 520;
/** Ritmo lento tra i micro-passi dentro ogni step (solo telefono, senza vignetta). */
const SLOW_PHASE_MS = 2200;

type StepMode = "playing" | "explain";

type GuideVignetteContent = { title: string; text: string };

type DemoStepConfig = {
  guide: GuideVignetteContent;
  /** Micro-animazioni sul telefono prima della vignetta esplicativa. */
  subPhaseCount: number;
};

const DEMO_STEPS: DemoStepConfig[] = [
  {
    guide: {
      title: "1 · Chat e sondaggio",
      text: "Dalla chat del gruppo aprite il sondaggio: proponete date, orari e luoghi, poi votate insieme fino a trovare l'opzione migliore.",
    },
    subPhaseCount: 5,
  },
  {
    guide: {
      title: "2 · Organizza e conferma",
      text: "Concordate i dettagli in chat. Il creatore dell'evento conferma data, ora e luogo: tutto il gruppo resta allineato.",
    },
    subPhaseCount: 5,
  },
  {
    guide: {
      title: "3 · Calendario",
      text: "L'evento confermato compare nel calendario LineUp, così non perdete l'appuntamento.",
    },
    subPhaseCount: 2,
  },
  {
    guide: {
      title: "4 · Pubblica con LineUp",
      text: "Pubblica annunci per feste, calcetto o cene: i follower possono chiedere di partecipare e tu accetti chi vuoi.",
    },
    subPhaseCount: 0,
  },
];

type Props = {
  onComplete: () => void;
  creatorName?: string;
};

function MiniAvatar({ name, size = 28, className }: { name: string; size?: number; className?: string }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold text-white",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.38, backgroundColor: getAvatarColor(name) }}
    >
      {getInitials(name)}
    </span>
  );
}

function TapHint({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 shadow-md ring-2 ring-primary/30",
        "animate-[tap-hint_1.4s_ease-in-out_infinite] motion-reduce:animate-none",
        className,
      )}
      aria-hidden
    />
  );
}

function PollMini({
  label,
  pct,
  voters,
  selected,
  highlight,
}: {
  label: string;
  pct: number;
  voters: string[];
  selected?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-gray-200/90 bg-white shadow-sm transition-all duration-700 ease-out",
        selected && "ring-2 ring-primary/25",
        highlight && "scale-[1.01] shadow-md",
      )}
    >
      <button type="button" className="w-full px-2.5 py-2 text-left">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-gray-900">{label}</span>
          <span className="text-[10px] font-bold text-primary tabular-nums">{pct}%</span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-1.5 flex -space-x-1">
          {voters.map((v) => (
            <MiniAvatar key={v} name={v} size={18} className="ring-2 ring-white" />
          ))}
        </div>
      </button>
    </div>
  );
}

function PhoneScreen({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("absolute inset-0 overflow-hidden", className)}>{children}</div>;
}

function SceneChatList({ active }: { active: boolean }) {
  return (
    <PhoneScreen className="bg-gray-50">
      <div className="bg-white px-4 pb-2 pt-10 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Chat</h2>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/75">
            <Plus size={16} className="text-white" strokeWidth={2.5} />
          </span>
        </div>
        <div className="mb-2 flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2">
          <Search size={14} className="text-gray-400" />
          <span className="text-xs text-gray-400">Cerca</span>
        </div>
        <div className="flex gap-1 pb-1">
          {["Tutte", "In programma", "Confermate"].map((t, i) => (
            <span
              key={t}
              className={cn(
                "rounded-full px-2.5 py-1 text-[9px] font-semibold transition-colors duration-300",
                i === 1 ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500",
              )}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
      <div className="mx-3 mt-2 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {[
          { name: "Marco, Giulia", sub: "1 in programma", dot: true },
          { name: "Calcetto del sabato", sub: "Sondaggio aperto · Sport", dot: true, highlight: true },
          { name: "Cena centro", sub: "2 confermati", dot: false },
        ].map((row, i, arr) => (
          <div
            key={row.name}
            className={cn(
              "relative flex items-center gap-3 px-3 py-3 transition-all duration-500 ease-out",
              i < arr.length - 1 && "border-b border-gray-50",
              row.highlight && (active ? "bg-primary/8 ring-2 ring-inset ring-primary/35" : "bg-transparent"),
            )}
          >
            <div className="relative">
              <MiniAvatar name={row.name} size={40} />
              {row.dot && (
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-900">{row.name}</p>
              <p className="text-[10px] text-gray-500">{row.sub}</p>
            </div>
            <ChevronRight size={14} className="text-gray-300" />
            {row.highlight && active && <TapHint className="right-5 top-1/2 -translate-y-1/2" />}
          </div>
        ))}
      </div>
    </PhoneScreen>
  );
}

function SceneChatPoll({
  mode = "intro",
  phase,
  creatorName,
}: {
  mode?: "intro" | "propose" | "vote";
  phase: number;
  creatorName: string;
}) {
  const expanded = mode !== "intro" || phase >= 1;
  const proposed = mode === "propose" ? phase >= 1 : mode === "vote" ? false : phase >= 2;
  const voted = mode === "vote" || phase >= 3;
  const highlightProposeBtn = mode === "propose" && phase === 0;

  return (
    <PhoneScreen className="flex flex-col bg-white">
      <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2.5 pt-9">
        <MiniAvatar name="Marco" size={32} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-gray-900">Calcetto del sabato</p>
          <p className="text-[10px] text-gray-500">Sport · Marco, Giulia, Luca…</p>
        </div>
      </div>
      <div className="flex border-b border-gray-100 text-center text-[10px] font-semibold">
        <span
          className={cn(
            "flex-1 py-2 transition-colors duration-300",
            expanded ? "border-b-2 border-primary text-primary" : "text-gray-400",
          )}
        >
          Voto
        </span>
        <span className="flex-1 py-2 text-gray-400">Chat</span>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden bg-blue-600">
        <div className="px-2 py-2">
          <p className="px-1 text-[10px] font-bold uppercase tracking-wide text-blue-100">Sondaggio</p>
          <div className="mt-1.5 space-y-1.5">
            <PollMini
              label="Sab 24 mag"
              pct={voted ? 78 : 62}
              voters={["Marco", "Giulia", "Luca"]}
              selected={voted}
              highlight={voted}
            />
            <PollMini label="19:00" pct={voted ? 71 : 48} voters={["Marco", creatorName]} selected={voted} />
            <div
              className={cn(
                "grid transition-[grid-template-rows,opacity] duration-500 ease-out",
                proposed ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden">
                <div className="overflow-hidden rounded-lg border-2 border-dashed border-amber-300 bg-amber-50">
                  <div className="flex items-center gap-2 px-2.5 py-2">
                    <Plus size={14} className="text-primary" />
                    <div>
                      <p className="text-[11px] font-bold text-gray-900">Campo San Salvario · 20:30</p>
                      <p className="text-[9px] text-gray-500">Proposta di {creatorName}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <PollMini label="Campo PalaTorino" pct={55} voters={["Elena", "Luca"]} />
          </div>
          <button
            type="button"
            className={cn(
              "relative mt-2 flex w-full items-center justify-center gap-1 rounded-lg border py-1.5 text-[10px] font-semibold text-white transition-all duration-400",
              highlightProposeBtn
                ? "border-white bg-white/25 ring-2 ring-white/60"
                : "border-white/25 bg-white/10",
            )}
          >
            <Plus size={12} /> Proponi un&apos;opzione
            {highlightProposeBtn && <TapHint className="right-2 top-1/2 -translate-y-1/2 scale-75" />}
          </button>
        </div>
      </div>
    </PhoneScreen>
  );
}

function SceneChatMessages({ visibleCount }: { visibleCount: number }) {
  const messages = [
    { side: "left" as const, text: "Ragazzi, Sab 24 alle 19 va bene per tutti?", who: "Marco · 18:02" },
    { side: "right" as const, text: "Perfetto! Io porto le bibite 🥤", who: "Giulia · 18:03" },
    { side: "left" as const, text: "Io prenoto il campo se confermiamo oggi", who: "Luca · 18:04" },
  ];

  return (
    <PhoneScreen className="flex flex-col bg-[#ECE5DD]">
      <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-3 py-2.5 pt-9">
        <MiniAvatar name="Marco" size={32} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-gray-900">Calcetto del sabato</p>
          <p className="text-[10px] text-emerald-600">online</p>
        </div>
      </div>
      <div className="flex border-b border-gray-100 bg-white text-center text-[10px] font-semibold">
        <span className="flex-1 py-2 text-gray-400">Voto</span>
        <span className="flex-1 border-b-2 border-primary py-2 text-primary">Chat</span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-end gap-2 p-3">
        {messages.map((m, i) => (
          <div
            key={m.text}
            className={cn(
              "max-w-[88%] rounded-xl px-3 py-2 shadow-sm transition-all duration-500 ease-out",
              m.side === "right" ? "ml-auto rounded-tr-sm bg-[#DCF8C6]" : "rounded-tl-sm bg-white",
              i < visibleCount ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
            )}
          >
            <p className="text-[11px] text-gray-800">{m.text}</p>
            <p className={cn("mt-0.5 text-[9px]", m.side === "right" ? "text-gray-500" : "text-gray-400")}>
              {m.who}
            </p>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t border-gray-200 bg-white px-2 py-2">
        <div className="flex-1 rounded-full bg-gray-100 px-3 py-2 text-[10px] text-gray-400">Scrivi un messaggio…</div>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white">
          <Send size={16} />
        </span>
      </div>
    </PhoneScreen>
  );
}

function SceneConfirmed({ creatorName, showCheck }: { creatorName: string; showCheck: boolean }) {
  return (
    <PhoneScreen className="flex flex-col bg-white">
      <div className="bg-emerald-600 px-3 pb-3 pt-10 text-white">
        <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-100">Evento confermato</p>
        <p className="mt-1 text-sm font-bold">Sab 24 mag · 19:00</p>
        <p className="text-xs text-emerald-100">Campo PalaTorino · Torino</p>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-4">
        <div
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 transition-all duration-700 ease-out",
            showCheck ? "scale-100 opacity-100" : "scale-75 opacity-0",
          )}
        >
          <CheckCircle2 size={36} className="text-emerald-600" />
        </div>
        <p
          className={cn(
            "text-center text-sm font-bold text-gray-900 transition-opacity duration-500 delay-150",
            showCheck ? "opacity-100" : "opacity-0",
          )}
        >
          Tutto il gruppo è allineato
        </p>
        <p className="text-center text-xs text-gray-500">
          Creato da <span className="font-semibold text-gray-800">{creatorName}</span>
        </p>
        <button
          type="button"
          className={cn(
            "mt-2 w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white transition-opacity duration-500 delay-300",
            showCheck ? "opacity-100" : "opacity-0",
          )}
        >
          Nel calendario LineUp
        </button>
      </div>
    </PhoneScreen>
  );
}

function SceneCalendar({ highlightDay }: { highlightDay: boolean }) {
  const days = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
  const grid = [
    null, null, null, null, null, null, 1,
    2, 3, 4, 5, 6, 7, 8,
    9, 10, 11, 12, 13, 14, 15,
    16, 17, 18, 19, 20, 21, 22,
    23, 24, 25, 26, 27, 28, 29,
    30, 31, null, null, null, null, null, null,
  ];

  return (
    <PhoneScreen className="bg-white">
      <div className="px-4 pb-2 pt-10">
        <div className="flex items-center justify-between">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600">‹</span>
          <h2 className="text-base font-bold text-gray-900">Maggio 2026</h2>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600">›</span>
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[9px] font-semibold text-gray-400">
          {days.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {grid.map((d, i) =>
            d == null ? (
              <span key={`e-${i}`} className="aspect-square" />
            ) : (
              <span
                key={`d-${d}`}
                className={cn(
                  "relative flex aspect-square items-center justify-center rounded-full text-[11px] font-semibold transition-all duration-700 ease-out",
                  d === 24 && highlightDay
                    ? "bg-primary text-white ring-4 ring-primary/25 scale-105"
                    : "text-gray-800",
                )}
              >
                {d}
                {d === 24 && highlightDay && (
                  <span className="absolute -bottom-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                )}
              </span>
            ),
          )}
        </div>
      </div>
      <div
        className={cn(
          "mx-4 mt-2 rounded-xl border border-primary/20 bg-[#F4FAFF] p-3 transition-all duration-600 ease-out",
          highlightDay ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
        )}
      >
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-lg">⚽</span>
          <div>
            <p className="text-xs font-bold text-gray-900">Calcetto del sabato</p>
            <p className="text-[10px] text-gray-500">Sab 24 mag · 19:00 · Campo PalaTorino</p>
          </div>
        </div>
      </div>
      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-6 border-t border-gray-100 bg-white pt-2">
        <CalendarDays size={18} className="text-primary" />
        <MessageCircle size={18} className="text-gray-300" />
      </div>
    </PhoneScreen>
  );
}

const PUBLISH_EVENT_COPY =
  "Devi organizzare una festa, un calcetto o una cena tra nuovi amici? LineUp ti permette di pubblicare annunci dei tuoi eventi e i tuoi followers potranno far richiesta di partecipazione. Sarai poi tu che hai organizzato ad accettarli e permetterli di farne parte!";

function GuideVignette({ content, stepKey }: { content: GuideVignetteContent; stepKey: string }) {
  return (
    <div
      key={stepKey}
      data-testid="guide-vignette"
      aria-live="polite"
      className="mt-4 w-full max-w-[300px] shrink-0 animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500 motion-reduce:animate-none"
    >
      <div className="rounded-xl border-2 border-primary/25 bg-white px-4 py-3.5 shadow-lg">
        <p className="text-[10px] font-bold uppercase tracking-wide text-primary">{content.title}</p>
        <p className="mt-2 text-sm font-medium leading-relaxed text-gray-900">{content.text}</p>
      </div>
    </div>
  );
}

function StepPhonePreview({
  step,
  subPhase,
  creatorName,
}: {
  step: number;
  subPhase: number;
  creatorName: string;
}) {
  if (step === 0) {
    if (subPhase <= 1) return <SceneChatList active={subPhase >= 1} />;
    if (subPhase === 2) return <SceneChatPoll mode="intro" phase={0} creatorName={creatorName} />;
    if (subPhase === 3) return <SceneChatPoll mode="propose" phase={0} creatorName={creatorName} />;
    return <SceneChatPoll mode="vote" phase={0} creatorName={creatorName} />;
  }
  if (step === 1) {
    if (subPhase <= 2) return <SceneChatMessages visibleCount={subPhase + 1} />;
    return <SceneConfirmed creatorName={creatorName} showCheck={subPhase >= 4} />;
  }
  if (step === 2) {
    return <SceneCalendar highlightDay={subPhase >= 1} />;
  }
  return <SceneCalendar highlightDay />;
}

function FixedPublishBanner({ visible, onContinue }: { visible: boolean; onContinue: () => void }) {
  return (
    <div
      className={cn(
        "w-full max-w-[300px] transition-all duration-500 ease-out",
        visible ? "mt-4 max-h-[640px] opacity-100" : "pointer-events-none mt-0 max-h-0 overflow-hidden opacity-0",
      )}
      aria-hidden={!visible}
    >
      <article
        className="relative overflow-hidden rounded-2xl border-2 border-sky-400 bg-gradient-to-br from-sky-50 via-white to-primary/10 px-4 pb-6 pt-5 shadow-xl"
        data-testid="banner-publish-group-fixed"
      >
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-sky-300/25"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-6 left-6 h-20 w-20 rounded-full bg-primary/10"
          aria-hidden
        />

        <div className="relative flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-sky-600 text-white shadow-md shadow-sky-500/30">
            <Megaphone size={22} strokeWidth={2.25} />
          </div>
          <p className="flex items-center gap-1.5 pt-1.5 text-xs font-bold uppercase tracking-wide text-gray-900">
            <Sparkles size={13} className="shrink-0 text-sky-600" />
            Pubblica con LineUp
          </p>
        </div>

        <p className="relative mt-4 text-[13px] font-bold leading-[1.65] text-gray-900 sm:text-[14px] sm:leading-[1.7]">
          {PUBLISH_EVENT_COPY}
        </p>

        <button
          type="button"
          data-testid="button-prosegui-group-life-demo"
          onClick={onContinue}
          disabled={!visible}
          tabIndex={visible ? 0 : -1}
          className="relative mt-5 flex min-h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-primary to-primary/80 py-3.5 text-base font-bold text-primary-foreground shadow-lg shadow-primary/25 active:scale-[0.98] disabled:pointer-events-none motion-reduce:active:scale-100"
        >
          Prosegui
          <ChevronRight size={18} strokeWidth={2.5} aria-hidden />
        </button>
      </article>
    </div>
  );
}

export function PianificaGroupLifeAnimation({ onComplete, creatorName = "Tu" }: Props) {
  const [step, setStep] = useState(0);
  const [subPhase, setSubPhase] = useState(0);
  const [mode, setMode] = useState<StepMode>("playing");
  const [exiting, setExiting] = useState(false);
  const finishedRef = useRef(false);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const safeName = creatorName.trim() || "Tu";
  const stepConfig = DEMO_STEPS[step] ?? DEMO_STEPS[0];
  const isLastStep = step === STEP_COUNT - 1;
  const isPlaying = mode === "playing" && !isLastStep;
  const isExplain = mode === "explain" || isLastStep;

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
    setExiting(true);
    exitTimerRef.current = setTimeout(() => onComplete(), 320);
  }, [onComplete]);

  useEffect(() => {
    return () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (finishedRef.current) return;
    setStep(STEP_COUNT - 1);
    setMode("explain");
  }, []);

  useEffect(() => {
    if (finishedRef.current || mode !== "playing" || isLastStep) return;

    const max = stepConfig.subPhaseCount;
    if (max === 0) {
      setMode("explain");
      return;
    }

    if (subPhase >= max - 1) {
      phaseTimerRef.current = setTimeout(() => setMode("explain"), SLOW_PHASE_MS);
      return () => {
        if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
      };
    }

    phaseTimerRef.current = setTimeout(() => setSubPhase((p) => p + 1), SLOW_PHASE_MS);
    return () => {
      if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
    };
  }, [step, subPhase, mode, isLastStep, stepConfig.subPhaseCount]);

  const goToNextStep = useCallback(() => {
    if (finishedRef.current) return;
    if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
    if (step >= STEP_COUNT - 1) {
      finish();
      return;
    }
    const next = step + 1;
    setStep(next);
    setSubPhase(0);
    setMode(DEMO_STEPS[next]?.subPhaseCount === 0 ? "explain" : "playing");
  }, [step, finish]);

  /** Senza `mode`: evita remount del telefono al passaggio playing → explain. */
  const phoneKey = `${step}-${subPhase}`;

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col bg-[#F4FAFF] transition-opacity duration-300 ease-out",
        exiting && "opacity-0",
      )}
      data-testid="pianifica-group-life-demo"
    >
      <style>{`
        @keyframes tap-hint {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.95; }
          50% { transform: translate(-50%, -50%) scale(1.08); opacity: 0.65; }
        }
      `}</style>

      <div className="shrink-0 border-b border-primary/15 bg-white px-4 py-3">
        <p className="text-center text-[10px] font-bold uppercase tracking-wide text-primary">Dopo la creazione</p>
        <p className="mt-1 text-center text-sm font-bold text-gray-900">Segui il flusso su LineUp</p>
        <p className="mt-1 text-center text-[11px] text-gray-500">
          Passo {step + 1} di {STEP_COUNT}
          {isPlaying ? " · guarda il telefono" : " · leggi e continua"}
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto overscroll-y-contain px-4 py-3">
        <div className="flex w-full max-w-[300px] flex-col items-center">
          {!isLastStep && (
            <div
              className={cn(
                "relative h-[300px] w-full overflow-hidden rounded-[24px] border-2 border-primary/20 bg-white shadow-xl transition-opacity duration-500",
                isExplain && "opacity-95",
              )}
              style={{ transform: "translateZ(0)" }}
            >
              <div
                key={phoneKey}
                className="absolute inset-0 animate-in fade-in duration-500 motion-reduce:animate-none"
              >
                <StepPhonePreview step={step} subPhase={subPhase} creatorName={safeName} />
              </div>
              {isPlaying && (
                <p className="pointer-events-none absolute bottom-2 left-0 right-0 text-center text-[10px] font-semibold text-primary/80">
                  Anteprima in corso…
                </p>
              )}
            </div>
          )}

          {isExplain && !isLastStep && (
            <>
              <GuideVignette content={stepConfig.guide} stepKey={`explain-${step}`} />
              <button
                type="button"
                data-testid="button-demo-step-continue"
                onClick={goToNextStep}
                className="mt-4 flex min-h-12 w-full max-w-[300px] touch-manipulation items-center justify-center gap-2 rounded-xl bg-black py-3.5 text-base font-semibold text-white active:opacity-90"
              >
                Ho capito, continua
                <ChevronRight size={18} strokeWidth={2.5} aria-hidden />
              </button>
            </>
          )}

          {isLastStep && isExplain && (
            <>
              <GuideVignette content={stepConfig.guide} stepKey="explain-publish" />
              <FixedPublishBanner visible={!exiting} onContinue={finish} />
            </>
          )}
        </div>

        <div className="mt-4 flex gap-1.5" aria-hidden>
          {Array.from({ length: STEP_COUNT }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all duration-400 ease-out",
                i === step ? "w-6 bg-primary" : i < step ? "w-2 bg-primary/45" : "w-2 bg-gray-300",
              )}
            />
          ))}
        </div>
      </div>

      <div className="shrink-0 border-t border-gray-100 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          data-testid="button-skip-group-life-demo"
          onClick={finish}
          disabled={exiting}
          className="min-h-11 w-full touch-manipulation rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-semibold text-gray-700 active:bg-gray-50 disabled:opacity-50"
        >
          Salta anteprima
        </button>
      </div>
    </div>
  );
}
