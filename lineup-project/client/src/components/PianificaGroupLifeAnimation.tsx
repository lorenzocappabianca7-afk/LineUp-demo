import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const SCENE_COUNT = 8;
const SCENE_MS = 3000;
const FADE_MS = 420;
const PHASE_MS = 950;
const LAST_SCENE_INDEX = SCENE_COUNT - 1;

function sceneLayer(scene: number): number {
  if (scene === 0) return 0;
  if (scene <= 3) return 1;
  return scene - 2;
}

const LAYER_COUNT = 6;

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

function ScenePublishBanner({ visible }: { visible: boolean }) {
  return (
    <PhoneScreen className="flex flex-col items-center justify-center bg-[#F4FAFF] p-3">
      <article
        className={cn(
          "flex max-h-[88%] w-full flex-col overflow-y-auto rounded-2xl border-2 border-sky-400 bg-white px-3.5 py-3.5 shadow-md transition-all duration-600 ease-out",
          visible ? "translate-y-0 opacity-100 scale-100" : "translate-y-4 opacity-0 scale-[0.98]",
        )}
      >
        <div className="flex items-start gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
            <Megaphone size={20} />
          </div>
          <p className="pt-1 text-[11px] font-semibold leading-snug text-sky-800">Pubblica il tuo evento</p>
        </div>
        <p className="mt-2.5 text-[12px] leading-relaxed text-gray-800">{PUBLISH_EVENT_COPY}</p>
      </article>
    </PhoneScreen>
  );
}

type GuideVignetteContent = { title: string; text: string };

const VIGNETTE_BY_STEP: Record<string, GuideVignetteContent> = {
  "0:0": { title: "Chat", text: "Vedi gruppi ed eventi in programma." },
  "0:1": { title: "Apri il gruppo", text: "Tocca la chat del calcetto." },
  "1:0": { title: "Sondaggio", text: "Data, orario e luogo da votare insieme." },
  "1:1": { title: "Tab Voto", text: "Qui si decide quando e dove." },
  "2:0": { title: "Proponi", text: "Tocca per suggerire un'opzione." },
  "2:1": { title: "Nuova opzione", text: "Tutti la vedono nel sondaggio." },
  "3:0": { title: "Vota", text: "Ogni partecipante sceglie con un tap." },
  "3:1": { title: "Preferenze", text: "Le barre mostrano chi è d'accordo." },
  "4:0": { title: "Chat", text: "Passate al tab Chat per organizzarvi." },
  "4:1": { title: "Messaggi", text: "Concordate dettagli in tempo reale." },
  "4:2": { title: "Gruppo allineato", text: "Tutti sulla stessa pagina." },
  "5:0": { title: "Conferma", text: "Il creatore fissa l'evento." },
  "5:1": { title: "Confermato", text: "Data, ora e luogo sono definitivi." },
  "6:0": { title: "Calendario", text: "LineUp segna il giorno scelto." },
  "6:1": { title: "In agenda", text: "L'evento compare nel calendario." },
  "7:0": { title: "Pubblica", text: "Annunci per festa, calcetto o cena con i follower." },
};

const CAPTION_FALLBACK: GuideVignetteContent[] = [
  { title: "Chat", text: "Apri il gruppo dell'evento." },
  { title: "Sondaggio", text: "Votate data, orario e luogo." },
  { title: "Proponi", text: "Aggiungi un'opzione al sondaggio." },
  { title: "Vota", text: "Scegli le preferenze con un tap." },
  { title: "Organizza", text: "Parlatene in chat." },
  { title: "Conferma", text: "L'evento è ufficiale." },
  { title: "Calendario", text: "Lo trovi in agenda." },
  { title: "Condividi", text: "Invita chi vuole unirsi." },
];

function resolveGuideVignette(
  scene: number,
  phase: number,
  showProseguiHint: boolean,
): GuideVignetteContent {
  if (showProseguiHint) {
    return { title: "Prossimo passo", text: "Leggi come funziona la pubblicazione, poi tocca Prosegui." };
  }
  const exact = VIGNETTE_BY_STEP[`${scene}:${phase}`];
  if (exact) return exact;
  const sceneOnly = VIGNETTE_BY_STEP[`${scene}:0`];
  if (sceneOnly) return sceneOnly;
  return CAPTION_FALLBACK[scene] ?? CAPTION_FALLBACK[0];
}

function GuideVignette({ content, stepKey }: { content: GuideVignetteContent; stepKey: string }) {
  return (
    <div
      key={stepKey}
      data-testid="guide-vignette"
      aria-live="polite"
      className="mb-2 w-full max-w-[300px] shrink-0 animate-in fade-in slide-in-from-top-1 fill-mode-both duration-350 motion-reduce:animate-none"
    >
      <div className="rounded-lg border border-primary/20 bg-white/95 px-2.5 py-1.5 shadow-md ring-1 ring-black/[0.04] backdrop-blur-sm">
        <p className="text-[9px] font-bold uppercase tracking-wide text-primary leading-none">{content.title}</p>
        <p className="mt-0.5 text-[11px] font-medium leading-snug text-gray-800">{content.text}</p>
      </div>
    </div>
  );
}

function FixedPublishBanner({ visible, onContinue }: { visible: boolean; onContinue: () => void }) {
  return (
    <div
      className={cn(
        "w-full max-w-[300px] transition-all duration-500 ease-out",
        visible ? "mt-4 max-h-[560px] opacity-100" : "pointer-events-none mt-0 max-h-0 overflow-hidden opacity-0",
      )}
      aria-hidden={!visible}
    >
      <article
        className="relative overflow-hidden rounded-2xl border-2 border-sky-400 bg-gradient-to-br from-sky-50 via-white to-primary/10 px-4 pb-5 pt-4 shadow-xl"
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
          <p className="flex items-center gap-1 pt-1 text-[11px] font-bold uppercase tracking-wide text-sky-700">
            <Sparkles size={12} className="shrink-0" />
            Pubblica con LineUp
          </p>
        </div>

        <p className="relative mt-3 text-[13px] leading-[1.55] text-gray-800 sm:text-sm">{PUBLISH_EVENT_COPY}</p>

        <button
          type="button"
          data-testid="button-prosegui-group-life-demo"
          onClick={onContinue}
          disabled={!visible}
          tabIndex={visible ? 0 : -1}
          className="relative mt-4 flex min-h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-primary to-primary/80 py-3.5 text-base font-bold text-primary-foreground shadow-lg shadow-primary/25 active:scale-[0.98] disabled:pointer-events-none motion-reduce:active:scale-100"
        >
          Prosegui
          <ChevronRight size={18} strokeWidth={2.5} aria-hidden />
        </button>
      </article>
    </div>
  );
}

function LayerContent({
  layer,
  scene,
  phase,
  creatorName,
  publishBannerVisible,
}: {
  layer: number;
  scene: number;
  phase: number;
  creatorName: string;
  publishBannerVisible: boolean;
}) {
  switch (layer) {
    case 0:
      return <SceneChatList active={phase >= 1} />;
    case 1: {
      const modes: Array<"intro" | "propose" | "vote"> = ["intro", "propose", "vote"];
      const mode = modes[Math.min(Math.max(scene, 1), 3) - 1] ?? "intro";
      return <SceneChatPoll mode={mode} phase={phase} creatorName={creatorName} />;
    }
    case 2:
      return <SceneChatMessages visibleCount={Math.min(phase + 1, 3)} />;
    case 3:
      return <SceneConfirmed creatorName={creatorName} showCheck={phase >= 1} />;
    case 4:
      return <SceneCalendar highlightDay={phase >= 1} />;
    case 5:
      return <ScenePublishBanner visible={publishBannerVisible} />;
    default:
      return null;
  }
}

export function PianificaGroupLifeAnimation({ onComplete, creatorName = "Tu" }: Props) {
  const [scene, setScene] = useState(0);
  const [phase, setPhase] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [publishBannerVisible, setPublishBannerVisible] = useState(false);
  const [fixedBannerVisible, setFixedBannerVisible] = useState(false);
  const finishedRef = useRef(false);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sceneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const safeName = creatorName.trim() || "Tu";
  const activeLayer = sceneLayer(scene);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (sceneTimerRef.current) clearTimeout(sceneTimerRef.current);
    if (phaseTimerRef.current) clearInterval(phaseTimerRef.current);
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    setExiting(true);
    exitTimerRef.current = setTimeout(() => onComplete(), 320);
  }, [onComplete]);

  useEffect(() => {
    return () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      if (sceneTimerRef.current) clearTimeout(sceneTimerRef.current);
      if (phaseTimerRef.current) clearInterval(phaseTimerRef.current);
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (finishedRef.current) return;
    setScene(LAST_SCENE_INDEX);
    setPublishBannerVisible(true);
    setFixedBannerVisible(true);
  }, []);

  const maxPhaseForScene = useMemo(() => {
    if (scene === 0) return 2;
    if (scene >= 1 && scene <= 3) return 2;
    if (scene === 4) return 3;
    if (scene === 5 || scene === 6) return 2;
    return 0;
  }, [scene]);

  useEffect(() => {
    if (finishedRef.current) return;
    setPhase(0);
    if (maxPhaseForScene === 0) return;

    let p = 0;
    phaseTimerRef.current = setInterval(() => {
      p += 1;
      if (p >= maxPhaseForScene) {
        if (phaseTimerRef.current) clearInterval(phaseTimerRef.current);
        return;
      }
      setPhase(p);
    }, PHASE_MS);

    return () => {
      if (phaseTimerRef.current) clearInterval(phaseTimerRef.current);
    };
  }, [scene, maxPhaseForScene]);

  useEffect(() => {
    if (finishedRef.current) return;
    setPublishBannerVisible(false);
    setFixedBannerVisible(false);

    if (scene === LAST_SCENE_INDEX) {
      bannerTimerRef.current = setTimeout(() => {
        setPublishBannerVisible(true);
        setFixedBannerVisible(true);
      }, 700);
      return () => {
        if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
      };
    }

    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : SCENE_MS;

    sceneTimerRef.current = setTimeout(() => {
      if (finishedRef.current) return;
      setScene((s) => s + 1);
    }, delay);

    return () => {
      if (sceneTimerRef.current) clearTimeout(sceneTimerRef.current);
    };
  }, [scene]);

  const showProseguiHint = fixedBannerVisible && scene === LAST_SCENE_INDEX;
  const vignette = useMemo(
    () => resolveGuideVignette(scene, phase, showProseguiHint),
    [scene, phase, showProseguiHint],
  );
  const vignetteKey = `${scene}-${phase}-${showProseguiHint ? "prosegui" : "step"}`;

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
      </div>

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col items-center px-4 py-3",
          fixedBannerVisible ? "justify-start overflow-y-auto overscroll-y-contain" : "justify-center overflow-hidden",
        )}
      >
        <div className="flex w-full max-w-[300px] flex-col items-center">
          {!exiting && <GuideVignette content={vignette} stepKey={vignetteKey} />}
          <div
            className="relative h-[300px] w-full overflow-hidden rounded-[24px] border-2 border-primary/20 bg-white shadow-xl"
            style={{ transform: "translateZ(0)" }}
          >
            {Array.from({ length: LAYER_COUNT }).map((_, layer) => (
              <div
                key={layer}
                aria-hidden={activeLayer !== layer}
                className={cn(
                  "absolute inset-0 transition-opacity ease-in-out motion-reduce:transition-none",
                  activeLayer === layer ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0",
                )}
                style={{ transitionDuration: `${FADE_MS}ms` }}
              >
                <LayerContent
                  layer={layer}
                  scene={scene}
                  phase={activeLayer === layer ? phase : 0}
                  creatorName={safeName}
                  publishBannerVisible={publishBannerVisible}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-2.5 flex gap-1" aria-hidden>
          {Array.from({ length: SCENE_COUNT }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all duration-400 ease-out",
                i === scene ? "w-5 bg-primary" : i < scene ? "w-1.5 bg-primary/40" : "w-1.5 bg-gray-300",
              )}
            />
          ))}
        </div>

        <FixedPublishBanner visible={fixedBannerVisible && !exiting} onContinue={finish} />
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
