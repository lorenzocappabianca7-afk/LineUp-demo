import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronRight, Megaphone, MessageCircle, Plus, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAvatarColor, getInitials } from "@/lib/appUtils";

const SCENE_COUNT = 5;
const SCENE_MS = 3000;
const LAST_SCENE_INDEX = SCENE_COUNT - 1;

type Props = {
  onComplete: () => void;
  creatorName?: string;
};

function MiniAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white",
        className,
      )}
      style={{ backgroundColor: getAvatarColor(name) }}
    >
      {getInitials(name)}
    </span>
  );
}

function PollRow({
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
        "rounded-lg border px-2.5 py-2 transition-all duration-500 ease-out",
        selected ? "border-primary bg-blue-50 ring-2 ring-primary/20" : "border-gray-200 bg-white",
        highlight && "scale-[1.02] shadow-md",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-gray-900">{label}</span>
        <span className="text-[10px] font-bold text-primary">{pct}%</span>
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1.5 flex -space-x-1">
        {voters.map((v) => (
          <MiniAvatar key={v} name={v} className="ring-2 ring-white" />
        ))}
      </div>
    </div>
  );
}

function SceneContent({ scene, creatorName }: { scene: number; creatorName: string }) {
  if (scene === 0) {
    return (
      <div className="flex flex-col justify-end space-y-2">
        <div className="rounded-xl bg-white/95 px-3 py-2 shadow-sm">
          <p className="text-[10px] font-bold text-emerald-600">Gruppo creato</p>
          <p className="mt-0.5 text-xs text-gray-800">
            Ciao a tutti! Ho aperto il sondaggio per il <span className="font-semibold">calcetto</span>.
          </p>
        </div>
        <div className="ml-6 max-w-[85%] rounded-xl rounded-tl-sm bg-white px-3 py-2 shadow-sm">
          <p className="text-[11px] text-gray-800">Perfetto, votiamo! ⚽</p>
          <p className="mt-0.5 text-[9px] text-gray-400">Marco · ora</p>
        </div>
        <div className="mr-6 ml-auto max-w-[85%] rounded-xl rounded-tr-sm bg-primary px-3 py-2 text-white shadow-sm">
          <p className="text-[11px]">Io propongo sabato pomeriggio</p>
          <p className="mt-0.5 text-[9px] text-blue-100">Giulia · ora</p>
        </div>
      </div>
    );
  }

  if (scene === 1) {
    return (
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-blue-100">Sondaggio</p>
        <PollRow label="Sab 24 mag" pct={72} voters={["Marco", "Giulia", "Luca"]} selected highlight />
        <PollRow label="19:00" pct={55} voters={["Marco", creatorName]} selected highlight />
        <PollRow label="Campo PalaTorino" pct={60} voters={["Giulia", "Luca", "Elena"]} selected />
      </div>
    );
  }

  if (scene === 2) {
    return (
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-blue-100">Nuova proposta</p>
        <PollRow label="Sab 24 mag" pct={72} voters={["Marco", "Giulia", "Luca"]} selected />
        <div className="flex items-center gap-2 rounded-lg border-2 border-dashed border-amber-300 bg-amber-50 px-2.5 py-2 shadow-sm">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-primary bg-white text-primary">
            <Plus size={12} strokeWidth={3} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-gray-900">20:30 · Campo San Salvario</p>
            <p className="text-[9px] text-gray-500">Proposta di {creatorName}</p>
          </div>
        </div>
        <p className="flex items-center justify-center gap-1 py-1 text-[10px] font-semibold text-white/90">
          <Plus size={12} /> Proponi un&apos;opzione
        </p>
      </div>
    );
  }

  if (scene === 3) {
    return (
      <div className="flex h-full flex-col items-center justify-center py-2">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/40">
          <Check size={28} className="text-white" strokeWidth={3} />
        </div>
        <p className="mt-3 text-center text-sm font-bold text-white">Evento confermato</p>
        <p className="mt-1 text-center text-[11px] text-blue-100">Sab 24 mag · 19:00 · Campo PalaTorino</p>
        <div className="mt-4 w-full rounded-xl bg-white px-3 py-2.5 text-center shadow-md">
          <p className="text-[10px] font-bold text-gray-500">Creato da</p>
          <p className="text-xs font-bold text-gray-900">{creatorName}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 shadow-md">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
          <Megaphone size={18} />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="text-xs font-bold text-gray-900">Pubblica con il gruppo</p>
          <p className="text-[10px] leading-snug text-gray-600">
            I follower vedono l&apos;evento e chiedono di unirsi
          </p>
        </div>
      </div>
      {[
        { name: "Sofia B.", msg: "Posso unirmi al calcetto?" },
        { name: "Andrea R.", msg: "Cercate ancora un giocatore?" },
      ].map((req, i) => (
        <div
          key={req.name}
          className={cn(
            "flex items-center gap-2 rounded-xl border bg-white px-2.5 py-2 shadow-sm",
            i === 0 ? "border-emerald-300 ring-2 ring-emerald-200" : "border-gray-100",
          )}
        >
          <MiniAvatar name={req.name} className="h-8 w-8 text-[10px]" />
          <div className="min-w-0 flex-1 text-left">
            <p className="text-[11px] font-semibold text-gray-900">{req.name}</p>
            <p className="truncate text-[10px] text-gray-500">{req.msg}</p>
          </div>
          {i === 0 ? (
            <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-emerald-500 px-2 py-1 text-[9px] font-bold text-white">
              <Check size={10} /> Accetta
            </span>
          ) : (
            <ChevronRight size={14} className="shrink-0 text-gray-300" />
          )}
        </div>
      ))}
      <p className="pt-0.5 text-center text-[10px] text-blue-100">
        Anche per una festa: stesso flusso per trovare persone
      </p>
    </div>
  );
}

const CAPTIONS = [
  "Il gruppo è nato: entri in chat con tutti gli invitati.",
  "Data, orario e luogo si votano insieme — come su WhatsApp.",
  "Chi vuole propone nuove opzioni per il sondaggio.",
  "Il creatore conferma la combinazione vincente.",
  "Pubblichi l’evento: i follower possono chiedere di unirsi.",
];

/** Anteprima animata: vita del gruppo dopo la creazione (demo QR). */
export function PianificaGroupLifeAnimation({ onComplete, creatorName = "Tu" }: Props) {
  const [scene, setScene] = useState(0);
  const [exiting, setExiting] = useState(false);
  const finishedRef = useRef(false);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sceneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (sceneTimerRef.current) clearTimeout(sceneTimerRef.current);
    setExiting(true);
    exitTimerRef.current = setTimeout(() => {
      onComplete();
    }, 320);
  }, [onComplete]);

  useEffect(() => {
    return () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      if (sceneTimerRef.current) clearTimeout(sceneTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      finish();
      return;
    }
  }, [finish]);

  useEffect(() => {
    if (finishedRef.current) return;

    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : SCENE_MS;

    sceneTimerRef.current = setTimeout(() => {
      if (finishedRef.current) return;
      if (scene >= LAST_SCENE_INDEX) {
        finish();
        return;
      }
      setScene((s) => s + 1);
    }, delay);

    return () => {
      if (sceneTimerRef.current) clearTimeout(sceneTimerRef.current);
    };
  }, [scene, finish]);

  const safeName = creatorName.trim() || "Tu";

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col bg-[#F4FAFF] transition-opacity duration-300 ease-out",
        exiting && "opacity-0",
      )}
      data-testid="pianifica-group-life-demo"
    >
      <div className="shrink-0 border-b border-primary/15 bg-white px-4 py-3">
        <p className="text-center text-[10px] font-bold uppercase tracking-wide text-primary">
          Dopo la creazione
        </p>
        <p className="mt-1 text-center text-sm font-bold text-gray-900">Ecco come vivrà il gruppo su LineUp</p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden px-4 py-3">
        <div
          className="w-full max-w-[300px] overflow-hidden rounded-[22px] border-2 border-primary/20 bg-white shadow-xl will-change-transform"
          style={{ transform: "translateZ(0)" }}
        >
          <div className="flex items-center gap-2 border-b border-blue-700/30 bg-blue-600 px-3 py-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20">
              <Users size={16} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">Calcetto del sabato</p>
              <p className="text-[10px] text-blue-100">Sport · 6 partecipanti</p>
            </div>
            <MessageCircle size={18} className="shrink-0 text-white/80" />
          </div>

          <div className="relative h-[280px] overflow-hidden bg-gradient-to-b from-blue-600 to-blue-600/95 p-3">
            <div
              key={scene}
              className="absolute inset-3 animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500 ease-out motion-reduce:animate-none"
            >
              <SceneContent scene={scene} creatorName={safeName} />
            </div>
          </div>
        </div>

        <p
          key={`cap-${scene}`}
          className="mt-4 max-w-[300px] animate-in fade-in fill-mode-both text-center text-xs leading-relaxed text-gray-600 duration-300 motion-reduce:animate-none"
        >
          {CAPTIONS[scene]}
        </p>

        <div className="mt-3 flex gap-1" aria-hidden>
          {Array.from({ length: SCENE_COUNT }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300 ease-out",
                i === scene ? "w-5 bg-primary" : i < scene ? "w-1.5 bg-primary/40" : "w-1.5 bg-gray-300",
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
          className="min-h-11 w-full touch-manipulation rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-semibold text-gray-700 active:bg-gray-50"
        >
          Salta anteprima
        </button>
      </div>
    </div>
  );
}
