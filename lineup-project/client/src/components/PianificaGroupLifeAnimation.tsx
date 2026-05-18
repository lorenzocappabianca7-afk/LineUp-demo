import { useCallback, useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Megaphone,
  MessageCircle,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getAvatarColor, getInitials } from "@/lib/appUtils";

const CONTENT_MAX_W = 340;
const PHONE_H_PX = 368;
const PHONE_TOP = "pt-7";

type GuideContent = { title: string; text: string };

type SceneId =
  | "chat_list"
  | "chat_open_poll"
  | "poll_survey"
  | "poll_vote"
  | "poll_propose"
  | "poll_new_option"
  | "poll_confirm"
  | "poll_in_calendar"
  | "calendar"
  | "calendar_event";

type TimelineBeat =
  | { kind: "caption"; guide: GuideContent; durationMs: number }
  | { kind: "scene"; scene: SceneId; durationMs: number }
  | { kind: "banner" };

const CAPTION_MIN_MS = 5_200;
const CAPTION_MAX_MS = 12_000;
const SCENE_MIN_MS = 5_000;
const SCENE_MAX_MS = 8_500;

/** ~1.9 parole/s + pausa iniziale per leggere con calma. */
function captionDuration(guide: GuideContent): number {
  const words = `${guide.title} ${guide.text}`.split(/\s+/).filter(Boolean).length;
  const ms = 2_800 + (words / 1.9) * 1000;
  return Math.round(Math.min(CAPTION_MAX_MS, Math.max(CAPTION_MIN_MS, ms)));
}

function sceneDuration(scene: SceneId): number {
  const long: SceneId[] = ["poll_vote", "poll_confirm", "calendar_event"];
  const ms = long.includes(scene) ? 6_800 : 5_600;
  return Math.min(SCENE_MAX_MS, Math.max(SCENE_MIN_MS, ms));
}

function cap(guide: GuideContent): TimelineBeat {
  return { kind: "caption", guide, durationMs: captionDuration(guide) };
}

function scene(id: SceneId): TimelineBeat {
  return { kind: "scene", scene: id, durationMs: sceneDuration(id) };
}

const PUBLISH_CAPTION: GuideContent = {
  title: "5 · Pubblica con LineUp",
  text: "Oltre al gruppo puoi pubblicare l'evento: i follower chiedono di partecipare e tu scegli chi accettare.",
};

/** Ogni azione: didascalia (lettura) → scena sul telefono (dimostrazione). */
const TIMELINE: TimelineBeat[] = [
  cap({
    title: "1 · Sondaggio in chat",
    text: "Dalla lista Chat apri la conversazione di gruppo dove è attivo il sondaggio per l'evento.",
  }),
  scene("chat_list"),

  cap({
    title: "1 · Scheda Voto",
    text: "Nella chat passa alla scheda «Voto»: qui trovi il sondaggio con giorno, ora e luogo da decidere insieme.",
  }),
  scene("chat_open_poll"),

  cap({
    title: "1 · Vota le opzioni",
    text: "Ogni partecipante tocca le proprie preferenze su data, orario e campo: le percentuali si aggiornano per tutti.",
  }),
  scene("poll_vote"),

  cap({
    title: "2 · Proponi un'opzione",
    text: "Se manca un'alternativa, usa «Proponi un'opzione» per suggerire una nuova data, un orario o un luogo al gruppo.",
  }),
  scene("poll_propose"),

  cap({
    title: "2 · Opzione aggiunta",
    text: "La proposta compare subito nel sondaggio con il tuo nome: gli altri possono votarla come le opzioni esistenti.",
  }),
  scene("poll_new_option"),

  cap({
    title: "3 · Conferma e calendario",
    text: "Quando siete d'accordo, l'organizzatore tocca «Aggiungi a calendario» per confermare data, ora e luogo.",
  }),
  scene("poll_confirm"),

  cap({
    title: "3 · Evento confermato",
    text: "Dopo la conferma l'evento risulta «Nel calendario» per tutto il gruppo: non serve ripetere i voti.",
  }),
  scene("poll_in_calendar"),

  cap({
    title: "4 · Calendario LineUp",
    text: "Apri il Calendario dell'app: l'appuntamento confermato è salvato insieme agli altri impegni del gruppo.",
  }),
  scene("calendar"),

  cap({
    title: "4 · Giorno evidenziato",
    text: "Il giorno scelto è evidenziato: sotto vedi titolo, orario e luogo dell'evento per non perdere l'appuntamento.",
  }),
  scene("calendar_event"),

  cap(PUBLISH_CAPTION),
  { kind: "banner" },
];

const BANNER_BEAT_INDEX = TIMELINE.length - 1;

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
        "animate-[tap-hint_1.35s_ease-in-out_infinite] motion-reduce:animate-none",
        className,
      )}
      aria-hidden
    />
  );
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden animate-in fade-in duration-500 fill-mode-both motion-reduce:animate-none">
      {children}
    </div>
  );
}

function PhoneScreen({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("absolute inset-0 flex flex-col overflow-hidden", className)}>{children}</div>;
}

function PollMini({
  label,
  pct,
  voters,
  selected,
  pulse,
}: {
  label: string;
  pct: number;
  voters: string[];
  selected?: boolean;
  pulse?: boolean;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-gray-200/90 bg-white shadow-sm transition-all duration-700 ease-out",
        selected && "ring-2 ring-primary/30",
        pulse && "scale-[1.02] shadow-md",
      )}
    >
      <div className="w-full px-2 py-1.5 text-left">
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-gray-900">{label}</span>
          <span className="shrink-0 text-[10px] font-bold text-primary tabular-nums">{pct}%</span>
        </div>
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-1 flex -space-x-1">
          {voters.map((v) => (
            <MiniAvatar key={v} name={v} size={16} className="ring-2 ring-white" />
          ))}
        </div>
      </div>
    </div>
  );
}

function ChatHeader() {
  return (
    <>
      <div className={cn("flex shrink-0 items-center gap-2 border-b border-gray-100 bg-white px-3 py-2", PHONE_TOP)}>
        <MiniAvatar name="Marco" size={28} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold text-gray-900">Calcetto del sabato</p>
          <p className="truncate text-[10px] text-gray-500">Sport · Marco, Giulia, Luca…</p>
        </div>
      </div>
      <div className="flex shrink-0 border-b border-gray-100 bg-white text-center text-[10px] font-semibold">
        <span className="flex-1 border-b-2 border-primary py-1.5 text-primary">Voto</span>
        <span className="flex-1 py-1.5 text-gray-400">Chat</span>
      </div>
    </>
  );
}

function SceneChatList({ highlightRow }: { highlightRow: boolean }) {
  return (
    <PhoneScreen className="bg-gray-50">
      <div className={cn("shrink-0 bg-white px-3 pb-2 shadow-sm", PHONE_TOP)}>
        <div className="mb-1.5 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Chat</h2>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/75">
            <Plus size={14} className="text-white" strokeWidth={2.5} />
          </span>
        </div>
        <div className="mb-1.5 flex items-center gap-2 rounded-lg bg-gray-100 px-2.5 py-1.5">
          <Search size={13} className="shrink-0 text-gray-400" />
          <span className="text-[11px] text-gray-400">Cerca</span>
        </div>
        <div className="flex gap-1">
          {["Tutte", "In programma", "Confermate"].map((t, i) => (
            <span
              key={t}
              className={cn(
                "rounded-full px-2 py-0.5 text-[9px] font-semibold",
                i === 1 ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500",
              )}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
      <div className="mx-3 mt-2 min-h-0 flex-1 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div
          className={cn(
            "relative flex items-center gap-2.5 px-2.5 py-2.5 transition-all duration-500",
            highlightRow ? "bg-primary/8 ring-2 ring-inset ring-primary/35 pr-9" : "",
          )}
        >
          <div className="relative shrink-0">
            <MiniAvatar name="Calcetto" size={36} />
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border-2 border-white bg-red-500" />
            {highlightRow && <TapHint className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-gray-900">Calcetto del sabato</p>
            <p className="truncate text-[10px] text-gray-500">Sondaggio aperto · Sport</p>
          </div>
          <ChevronRight size={14} className="shrink-0 text-gray-300" />
        </div>
      </div>
    </PhoneScreen>
  );
}

type PollPhase = "survey" | "vote" | "propose" | "new_option" | "confirm" | "in_calendar";

function phoneMountKey(scene: SceneId): string {
  if (scene.startsWith("poll_") || scene === "chat_open_poll") return "phone-poll";
  if (scene.startsWith("calendar")) return "phone-calendar";
  return scene;
}

function sceneToPollPhase(scene: SceneId): PollPhase {
  const map: Partial<Record<SceneId, PollPhase>> = {
    chat_open_poll: "survey",
    poll_survey: "survey",
    poll_vote: "vote",
    poll_propose: "propose",
    poll_new_option: "new_option",
    poll_confirm: "confirm",
    poll_in_calendar: "in_calendar",
  };
  return map[scene] ?? "survey";
}

function SceneGroupPoll({
  phase,
  creatorName,
}: {
  phase: PollPhase;
  creatorName: string;
}) {
  const voted = phase === "vote" || phase === "new_option" || phase === "confirm" || phase === "in_calendar";
  const showNew = phase === "new_option" || phase === "confirm" || phase === "in_calendar";
  const highlightPropose = phase === "propose";
  const showAction = phase === "confirm" || phase === "in_calendar";
  const confirmed = phase === "in_calendar";
  const compactPoll = showAction || highlightPropose;

  return (
    <PhoneScreen className="bg-white">
      <ChatHeader />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-blue-600">
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain px-2 py-2">
            <p className="shrink-0 px-1 text-[10px] font-bold uppercase tracking-wide text-blue-100">Sondaggio</p>
            <div className="mt-1 space-y-1">
              <PollMini
                label="Sab 24 mag"
                pct={voted ? 82 : 58}
                voters={["Marco", "Giulia", "Luca"]}
                selected={voted}
                pulse={phase === "vote"}
              />
              <PollMini
                label="19:00"
                pct={voted ? 76 : 44}
                voters={["Marco", creatorName]}
                selected={voted}
                pulse={phase === "vote"}
              />
              {!compactPoll ? (
                <PollMini label="Campo PalaTorino" pct={voted ? 61 : 38} voters={["Elena"]} selected={voted} />
              ) : null}
              <div
                className={cn(
                  "grid transition-[grid-template-rows,opacity] duration-600 ease-out",
                  showNew ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                )}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="rounded-lg border-2 border-dashed border-amber-300 bg-amber-50">
                    <div className="flex items-center gap-2 px-2 py-1.5">
                      <Plus size={13} className="shrink-0 text-primary" />
                      <div className="min-w-0">
                        <p className="truncate text-[10px] font-bold text-gray-900">San Salvario · 20:30</p>
                        <p className="truncate text-[9px] text-gray-500">Proposta di {creatorName}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {!showAction && (
            <div className="shrink-0 border-t border-white/15 px-2 pb-2 pt-1.5">
              <button
                type="button"
                className={cn(
                  "relative flex w-full items-center justify-center gap-1 rounded-lg border py-1.5 text-[10px] font-semibold text-white transition-all duration-500",
                  highlightPropose
                    ? "border-white bg-white/25 pr-9 ring-2 ring-white/60"
                    : "border-white/25 bg-white/10",
                )}
              >
                <Plus size={12} className="shrink-0" />
                <span>Proponi un&apos;opzione</span>
                {highlightPropose && <TapHint className="right-1.5 top-1/2 -translate-y-1/2 scale-[0.85]" />}
              </button>
            </div>
          )}
        </div>
        {showAction && (
          <div className="shrink-0 border-t border-gray-100 bg-white px-2 py-2">
            <div className="flex items-center gap-2">
              {confirmed ? (
                <div className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-green-200 bg-green-50 py-2 text-[11px] font-semibold text-green-700">
                  <CheckCircle2 size={14} />
                  Nel calendario
                </div>
              ) : (
                <button
                  type="button"
                  className="relative flex flex-1 items-center justify-center rounded-xl bg-primary py-2 pr-8 text-[11px] font-semibold text-white transition-all duration-500"
                >
                  Aggiungi a calendario
                  <TapHint className="right-2 top-1/2 -translate-y-1/2 scale-[0.85]" />
                </button>
              )}
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-100 bg-red-50">
                <Trash2 size={15} className="text-red-400" />
              </span>
            </div>
          </div>
        )}
      </div>
    </PhoneScreen>
  );
}

function SceneCalendar({ showEvent }: { showEvent: boolean }) {
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
      <div className={cn("flex min-h-0 flex-1 flex-col", PHONE_TOP)}>
        <div className="shrink-0 px-3 pb-1">
          <div className="flex items-center justify-between">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-sm text-gray-600">‹</span>
            <h2 className="text-sm font-bold text-gray-900">Maggio 2026</h2>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-sm text-gray-600">›</span>
          </div>
          <div className="mt-2 grid grid-cols-7 gap-0.5 text-center text-[8px] font-semibold text-gray-400">
            {days.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="mt-0.5 grid grid-cols-7 gap-0.5">
            {grid.map((d, i) =>
              d == null ? (
                <span key={`e-${i}`} className="h-7" />
              ) : (
                <span
                  key={`d-${d}`}
                  className={cn(
                    "relative flex h-7 items-center justify-center rounded-full text-[10px] font-semibold transition-all duration-700 ease-out",
                    d === 24 && showEvent ? "bg-primary text-white ring-2 ring-primary/25" : "text-gray-800",
                  )}
                >
                  {d}
                  {d === 24 && showEvent && (
                    <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-emerald-500" />
                  )}
                </span>
              ),
            )}
          </div>
        </div>
        <div
          className={cn(
            "mx-3 mt-2 shrink-0 overflow-hidden rounded-xl border border-primary/20 bg-[#F4FAFF] transition-all duration-700 ease-out",
            showEvent ? "max-h-28 opacity-100 p-2.5" : "max-h-0 border-0 p-0 opacity-0",
          )}
        >
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-base">⚽</span>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-bold text-gray-900">Calcetto del sabato</p>
              <p className="truncate text-[9px] text-gray-500">Sab 24 mag · 19:00 · PalaTorino</p>
            </div>
          </div>
        </div>
        <div className="mt-auto flex shrink-0 justify-center gap-6 border-t border-gray-100 px-4 py-2">
          <CalendarDays size={17} className="text-primary" />
          <MessageCircle size={17} className="text-gray-300" />
        </div>
      </div>
    </PhoneScreen>
  );
}

function ScenePhone({ scene, creatorName }: { scene: SceneId; creatorName: string }) {
  if (scene === "chat_list") {
    return <SceneChatList highlightRow />;
  }
  if (scene === "chat_open_poll" || scene.startsWith("poll_")) {
    return <SceneGroupPoll phase={sceneToPollPhase(scene)} creatorName={creatorName} />;
  }
  if (scene === "calendar" || scene === "calendar_event") {
    return <SceneCalendar showEvent={scene === "calendar_event"} />;
  }
  return null;
}

const PUBLISH_EVENT_COPY =
  "Devi organizzare una festa, un calcetto o una cena tra nuovi amici? LineUp ti permette di pubblicare annunci dei tuoi eventi e i tuoi followers potranno far richiesta di partecipazione. Sarai poi tu che hai organizzato ad accettarli e permetterli di farne parte!";

function GuideCaption({ content }: { content: GuideContent }) {
  return (
    <div
      data-testid="guide-vignette"
      aria-live="polite"
      className="w-full shrink-0 animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both motion-reduce:animate-none"
    >
      <div className="rounded-xl border-2 border-primary/25 bg-white px-4 py-3.5 shadow-lg">
        <p className="text-[10px] font-bold uppercase tracking-wide text-primary">{content.title}</p>
        <p className="mt-2 text-sm font-medium leading-relaxed text-gray-900">{content.text}</p>
      </div>
    </div>
  );
}

function FixedPublishBanner({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="w-full shrink-0 animate-in fade-in duration-500 fill-mode-both motion-reduce:animate-none">
      <article
        className="relative overflow-hidden rounded-2xl border-2 border-sky-400 bg-gradient-to-br from-sky-50 via-white to-primary/10 px-4 pb-6 pt-5 shadow-xl"
        data-testid="banner-publish-group-fixed"
      >
        <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-sky-300/25" aria-hidden />
        <div className="pointer-events-none absolute -bottom-6 left-6 h-20 w-20 rounded-full bg-primary/10" aria-hidden />

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
          className="relative mt-5 flex min-h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-primary to-primary/80 py-3.5 text-base font-bold text-primary-foreground shadow-lg shadow-primary/25 active:scale-[0.98] motion-reduce:active:scale-100"
        >
          Prosegui
          <ChevronRight size={18} strokeWidth={2.5} aria-hidden />
        </button>
      </article>
    </div>
  );
}

export function PianificaGroupLifeAnimation({ onComplete, creatorName = "Tu" }: Props) {
  const [beatIndex, setBeatIndex] = useState(0);
  const [showBanner, setShowBanner] = useState(false);
  const [exiting, setExiting] = useState(false);
  const finishedRef = useRef(false);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const safeName = creatorName.trim() || "Tu";
  const beat = TIMELINE[beatIndex];
  const atBanner = beatIndex >= BANNER_BEAT_INDEX || showBanner;
  const showCaption = beat?.kind === "caption";
  const showPhone = beat?.kind === "scene";
  const captionGuide = showCaption ? beat.guide : null;
  const activeScene = showPhone ? beat.scene : null;
  const phoneKey = activeScene ? phoneMountKey(activeScene) : null;
  const progressPct = Math.min(100, ((beatIndex + (atBanner ? 1 : 0.4)) / TIMELINE.length) * 100);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    setExiting(true);
    exitTimerRef.current = setTimeout(() => onComplete(), 320);
  }, [onComplete]);

  useEffect(() => {
    return () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (finishedRef.current) return;
    setBeatIndex(BANNER_BEAT_INDEX);
    setShowBanner(true);
  }, []);

  useEffect(() => {
    if (finishedRef.current || exiting) return;
    const current = TIMELINE[beatIndex];
    if (!current) return;

    if (current.kind === "banner") {
      setShowBanner(true);
      return;
    }

    advanceTimerRef.current = setTimeout(() => {
      if (finishedRef.current) return;
      setBeatIndex((i) => i + 1);
    }, current.durationMs);

    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, [beatIndex, exiting]);

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
        {!atBanner && (
          <p className="mt-1 text-center text-[11px] text-gray-500">Leggi la didascalia, poi guarda l&apos;anteprima</p>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto overscroll-y-contain px-4 py-3">
        <div className="flex w-full flex-col items-stretch gap-4" style={{ maxWidth: CONTENT_MAX_W }}>
          {showCaption && captionGuide ? <GuideCaption content={captionGuide} /> : null}

          {showPhone && activeScene && phoneKey ? (
            <div
              className="relative w-full shrink-0 overflow-hidden rounded-[26px] border-2 border-primary/20 bg-white shadow-xl"
              style={{ height: PHONE_H_PX, transform: "translateZ(0)" }}
              aria-label="Anteprima app LineUp"
            >
              <PhoneFrame key={phoneKey}>
                <ScenePhone scene={activeScene} creatorName={safeName} />
              </PhoneFrame>
            </div>
          ) : null}

          {(showBanner || beat?.kind === "banner") && !exiting ? (
            <FixedPublishBanner onContinue={finish} />
          ) : null}
        </div>

        <div className="mt-4 h-1.5 w-full shrink-0 overflow-hidden rounded-full bg-gray-200" style={{ maxWidth: CONTENT_MAX_W }} aria-hidden>
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
            style={{ width: `${progressPct}%` }}
          />
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
