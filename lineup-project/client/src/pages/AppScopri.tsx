import { useEffect, useRef, useState, type MouseEvent, type TouchEvent } from "react";
import {
  ChevronLeft, Sparkles, MapPin, Star, Tag, RefreshCw,
  Calendar, ExternalLink, CalendarPlus, CheckCircle2,
} from "lucide-react";
import {
  VENUES_BY_ACTIVITY,
  venuePollSubtitle,
  venueOptionFromScopriAi,
  type VenueOption,
  type ScopriToCreatePrefill,
} from "@/lib/appUtils";
import { PLAN_CATEGORIES, PLAN_SUBCATEGORIES, venuePoolKeyForPlanSubcategory } from "@/lib/planCategories";
import ScopriTorinoLeafletMap from "@/components/ScopriTorinoLeafletMap";

interface AiVenue {
  name: string;
  address: string;
  /** Zona / quartiere (anteprima lista). */
  quartiere?: string;
  description: string;
  rating: number;
  priceRange: string;
  bookingUrl: string;
  websiteUrl: string;
  mapsUrl: string;
  safariUrl?: string;
  score?: number;
  why?: string[];
  openStatus?: "open" | "closed" | "unknown";
  /** Dal server: "verified" = catalogo o controlli link/geo; "suggestion" = altre idee meno verificate. */
  scopriVerification?: "verified" | "suggestion";
}

interface AiQuestion {
  id: string;
  text: string;
  options: { key: string; label: string }[];
}

type ScopriConstraintMemory = {
  category: string;
  subcategory: string;
  giorno?: string;
  prezzo?: string;
  mezzo?: string;
  areaDisegnata?: string;
  zonaLabel?: string;
};


const CHI_LABEL: Record<string, string> = {
  amici: "Amici",
  famiglia: "Familiari",
  coppia: "Coppia",
  solo: "Da solo",
};

const MEZZO_LABEL: Record<string, string> = {
  piedi: "A piedi",
  mezzi: "Bus / Metro",
  auto: "In auto",
  moto: "Moto / Scooter",
};

function getPianificaStyleQuestions(): AiQuestion[] {
  return [
    {
      id: "chi",
      text: "Con chi ci vuoi andare?",
      options: [
        { key: "amici", label: "Amici" },
        { key: "famiglia", label: "Familiari" },
        { key: "coppia", label: "Coppia" },
        { key: "solo", label: "Da solo" },
      ],
    },
    {
      id: "mezzo",
      text: "Come vuoi arrivarci?",
      options: [
        { key: "piedi", label: "A piedi" },
        { key: "mezzi", label: "Bus / Metro" },
        { key: "auto", label: "In auto" },
        { key: "moto", label: "Moto / Scooter" },
      ],
    },
  ];
}

/** Fasce prezzo Scopri: pagamento (€/€€/€€€) o indifferente. Non includere mai "Gratis". */
const SCOPRI_PRICE_TIERS: readonly { key: string; label: string }[] = [
  { key: "euro", label: "€" },
  { key: "due-euro", label: "€€" },
  { key: "tre-euro", label: "€€€" },
  { key: "qualsiasi", label: "Qualsiasi" },
];

/* ─── Result generator (fallback locale) ─── */
function generateResults(
  subcategoryLabel: string,
  answers: Record<string, string>,
): (VenueOption & { reason: string })[] {
  const activity = venuePoolKeyForPlanSubcategory(subcategoryLabel);
  const pool = [...(VENUES_BY_ACTIVITY[activity] ?? VENUES_BY_ACTIVITY.altro)];
  pool.sort((a, b) => b.rating - a.rating);
  // Soft-filter based on budget (prefer, but don't hard-exclude)
  let preferred = [...pool];
  if (answers.budget === "alto") preferred = preferred.filter(v => v.rating >= 4.7);
  // Always return 5: fill from full pool if preferred is short
  const combined = [...preferred, ...pool.filter(v => !preferred.includes(v))];
  return combined.slice(0, 5).map(v => ({
    ...v,
    reason: buildReason(answers, v),
  }));
}

function buildReason(answers: Record<string, string>, v: VenueOption): string {
  const parts: string[] = [];
  const chi = answers.chi?.toLowerCase();
  if (chi === "coppia") parts.push("ottimo per una serata romantica");
  if (chi === "famiglia") parts.push("adatto a tutta la famiglia");
  if (chi === "amici") parts.push("perfetto per un gruppo");
  if (chi === "solo") parts.push("adatto anche a chi va da solo");
  if (answers.quando === "stasera") parts.push("disponibile stasera");
  if (v.discount) parts.push(`offerta: ${v.discount}`);
  if (parts.length === 0) parts.push(`valutazione ${v.rating} stelle`);
  return parts.slice(0, 2).join(" · ");
}

/* ─── Component ─── */
type Phase = "macro" | "sub" | "day-calendar" | "question" | "zone-map" | "price" | "preferences" | "loading-venues" | "results";

export default function AppScopri({ embedded = false, onCreateEvent }: {
  embedded?: boolean;
  onCreateEvent?: (prefill: ScopriToCreatePrefill) => void;
}) {
  const [phase, setPhase] = useState<Phase>("macro");
  const [macro, setMacro] = useState<string | null>(null);
  const [subLabel, setSubLabel] = useState<string | null>(null);
  const [qIdx, setQIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [aiQuestions, setAiQuestions] = useState<AiQuestion[]>([]);
  const [results, setResults] = useState<ReturnType<typeof generateResults>>([]);
  const [aiVenues, setAiVenues] = useState<AiVenue[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiPrefetchStatus, setAiPrefetchStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [aiPrefetchCount, setAiPrefetchCount] = useState(0);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [firstSelectedDate, setFirstSelectedDate] = useState<Date | null>(null);
  const [secondSelectedDate, setSecondSelectedDate] = useState<Date | null>(null);
  const [isDayConfirmed, setIsDayConfirmed] = useState(false);
  const [isAreaSelectionActive, setIsAreaSelectionActive] = useState(false);
  const [isDrawingArea, setIsDrawingArea] = useState(false);
  const [drawnPolygon, setDrawnPolygon] = useState<Array<{ x: number; y: number }>>([]);
  const [livePoint, setLivePoint] = useState<{ x: number; y: number } | null>(null);
  const mapDrawRef = useRef<HTMLDivElement | null>(null);
  const drawFrameRef = useRef<number | null>(null);
  const pendingPointRef = useRef<{ x: number; y: number } | null>(null);
  const lastCommittedPointRef = useRef<{ x: number; y: number } | null>(null);
  const searchProfileIdRef = useRef<string | null>(null);
  /** Backup se macro/sub in state non fossero disponibili al tap su "Crea evento". */
  const lastScopriContextRef = useRef<{ macro: string; subLabel: string } | null>(null);
  const [selectedPrice, setSelectedPrice] = useState<string | null>(null);
  const [userRequest, setUserRequest] = useState("");
  const [selectedResultVenues, setSelectedResultVenues] = useState<VenueOption[]>([]);

  const categoryDef = PLAN_CATEGORIES.find((c) => c.key === macro) ?? PLAN_CATEGORIES[0];
  const CategoryIcon = categoryDef.Icon;
  const currentQ = aiQuestions[qIdx];

  const reset = () => {
    setPhase("macro"); setMacro(null); setSubLabel(null);
    setQIdx(0); setAnswers({}); setResults([]); setAiVenues([]);
    setAiQuestions([]); setAiError(null);
    setAiPrefetchStatus("idle");
    setAiPrefetchCount(0);
    setCalendarMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    setFirstSelectedDate(null);
    setSecondSelectedDate(null);
    setIsDayConfirmed(false);
    setIsAreaSelectionActive(false);
    setIsDrawingArea(false);
    setDrawnPolygon([]);
    setLivePoint(null);
    setSelectedPrice(null);
    setUserRequest("");
    setSelectedResultVenues([]);
    pendingPointRef.current = null;
    lastCommittedPointRef.current = null;
    if (drawFrameRef.current !== null) {
      cancelAnimationFrame(drawFrameRef.current);
      drawFrameRef.current = null;
    }
    lastScopriContextRef.current = null;
    searchProfileIdRef.current = null;
  };

  useEffect(() => {
    return () => {
      if (drawFrameRef.current !== null) {
        cancelAnimationFrame(drawFrameRef.current);
      }
    };
  }, []);

  const selectSub = async (label: string) => {
    if (macro) lastScopriContextRef.current = { macro, subLabel: label };
    if (!searchProfileIdRef.current) {
      searchProfileIdRef.current = `scopri-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }
    setSubLabel(label);
    setAiError(null);
    const questions = getPianificaStyleQuestions();
    setAiQuestions(questions);
    setQIdx(0);
    if (macro) {
      setAiPrefetchStatus("running");
      const prefetchAc = new AbortController();
      const prefetchDeadline = window.setTimeout(() => prefetchAc.abort(), 3000);
      void fetch("/api/scopri/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: prefetchAc.signal,
        body: JSON.stringify({
          category: macro,
          subcategory: label,
          answers: {},
          prefetch: true,
          profileId: searchProfileIdRef.current,
          constraints: {
            category: macro,
            subcategory: label,
          },
        }),
      })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error("prefetch failed"))))
        .then((d) => {
          const count = Array.isArray(d?.venues) ? d.venues.length : 0;
          setAiPrefetchCount(count);
          setAiPrefetchStatus("done");
        })
        .catch(() => setAiPrefetchStatus("error"))
        .finally(() => window.clearTimeout(prefetchDeadline));
    }
    setPhase("day-calendar");
  };

  const runVenueSearch = async (finalAnswers: Record<string, string>) => {
    setPhase("loading-venues");
    setAiError(null);
    const memory: ScopriConstraintMemory = {
      category: macro ?? "",
      subcategory: subLabel ?? "",
      giorno: finalAnswers.giorno,
      prezzo: finalAnswers.prezzo,
      mezzo: finalAnswers.mezzo,
      areaDisegnata: finalAnswers.areaDisegnata,
      zonaLabel: finalAnswers.zona,
    };
    let venueSearchTimedOut = false;
    const venueSearchAc = new AbortController();
    const venueSearchDeadline = window.setTimeout(() => {
      venueSearchTimedOut = true;
      venueSearchAc.abort();
    }, 3000);
    try {
      const resp = await fetch("/api/scopri/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: venueSearchAc.signal,
        body: JSON.stringify({
          category: macro,
          subcategory: subLabel,
          answers: finalAnswers,
          userRequest: userRequest.trim() || undefined,
          profileId: searchProfileIdRef.current,
          constraints: memory,
        }),
      });
      if (!resp.ok) throw new Error("Errore API");
      const data = await resp.json();
      if (data.venues && data.venues.length > 0) {
        setAiVenues(data.venues);
        if (data.venues.length < 5) {
          setResults(generateResults(subLabel ?? "", finalAnswers));
        } else {
          setResults([]);
        }
      } else {
        setResults(generateResults(subLabel ?? "", finalAnswers));
      }
    } catch {
      setAiError(
        venueSearchTimedOut
          ? "L'AI ha impiegato oltre 3 secondi. Mostro suggerimenti locali."
          : "Non riesco a connettermi all'AI. Mostro suggerimenti locali.",
      );
      setResults(generateResults(subLabel ?? "", finalAnswers));
    } finally {
      window.clearTimeout(venueSearchDeadline);
      setPhase("results");
    }
  };

  const answer = async (qId: string, val: string) => {
    const newAnswers = { ...answers, [qId]: val };
    setAnswers(newAnswers);
    if (qIdx < aiQuestions.length - 1) {
      setQIdx(i => i + 1);
    } else {
      setPhase("zone-map");
    }
  };

  const formatDayLabel = (date: Date) =>
    date.toLocaleDateString("it-IT", { weekday: "short", day: "2-digit", month: "2-digit" });

  const toDateOnly = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const getSelectedRangeLabel = () => {
    if (!firstSelectedDate) return "";
    if (!secondSelectedDate) return formatDayLabel(firstSelectedDate);
    return `${formatDayLabel(firstSelectedDate)} - ${formatDayLabel(secondSelectedDate)}`;
  };

  const isWithinSelectedRange = (date: Date) => {
    if (!firstSelectedDate) return false;
    if (!secondSelectedDate) return toDateOnly(date).getTime() === toDateOnly(firstSelectedDate).getTime();
    const t = toDateOnly(date).getTime();
    const start = toDateOnly(firstSelectedDate).getTime();
    const end = toDateOnly(secondSelectedDate).getTime();
    return t >= Math.min(start, end) && t <= Math.max(start, end);
  };

  const handleCalendarClick = (day: number) => {
    const clicked = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
    const today = toDateOnly(new Date());
    if (toDateOnly(clicked).getTime() < today.getTime()) return;

    if (!firstSelectedDate || (firstSelectedDate && secondSelectedDate)) {
      setFirstSelectedDate(clicked);
      setSecondSelectedDate(null);
      setIsDayConfirmed(false);
      return;
    }

    if (!secondSelectedDate) {
      if (toDateOnly(clicked).getTime() === toDateOnly(firstSelectedDate).getTime()) {
        setIsDayConfirmed(true);
        return;
      }
      const [start, end] = toDateOnly(clicked).getTime() < toDateOnly(firstSelectedDate).getTime()
        ? [clicked, firstSelectedDate]
        : [firstSelectedDate, clicked];
      setFirstSelectedDate(start);
      setSecondSelectedDate(end);
      setIsDayConfirmed(true);
    }
  };

  const getMapPoint = (ev: MouseEvent<HTMLDivElement>) => {
    const rect = mapDrawRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (ev.clientY - rect.top) / rect.height));
    return { x, y };
  };

  const getTouchMapPoint = (ev: TouchEvent<HTMLDivElement>) => {
    const touch = ev.touches[0];
    if (!touch) return null;
    const rect = mapDrawRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (touch.clientY - rect.top) / rect.height));
    return { x, y };
  };

  const startDraw = (ev: MouseEvent<HTMLDivElement>) => {
    if (!isAreaSelectionActive) return;
    const p = getMapPoint(ev);
    if (!p) return;
    setIsDrawingArea(true);
    setDrawnPolygon([p]);
    setLivePoint(p);
    pendingPointRef.current = p;
    lastCommittedPointRef.current = p;
  };

  const commitPendingPoint = () => {
    const pending = pendingPointRef.current;
    if (!pending) return;
    const last = lastCommittedPointRef.current;
    if (last) {
      const dx = pending.x - last.x;
      const dy = pending.y - last.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.006) return;
    }
    setDrawnPolygon((prev) => [...prev, pending]);
    lastCommittedPointRef.current = pending;
  };

  const schedulePointCommit = () => {
    if (drawFrameRef.current !== null) return;
    drawFrameRef.current = requestAnimationFrame(() => {
      commitPendingPoint();
      drawFrameRef.current = null;
    });
  };

  const moveDraw = (ev: MouseEvent<HTMLDivElement>) => {
    if (!isDrawingArea || !isAreaSelectionActive) return;
    const p = getMapPoint(ev);
    if (!p) return;
    pendingPointRef.current = p;
    schedulePointCommit();
    setLivePoint(p);
  };

  const endDraw = () => {
    if (!isDrawingArea) return;
    commitPendingPoint();
    pendingPointRef.current = null;
    setIsDrawingArea(false);
    setLivePoint(null);
  };

  const startDrawTouch = (ev: TouchEvent<HTMLDivElement>) => {
    if (!isAreaSelectionActive) return;
    ev.preventDefault();
    const p = getTouchMapPoint(ev);
    if (!p) return;
    setIsDrawingArea(true);
    setDrawnPolygon([p]);
    setLivePoint(p);
    pendingPointRef.current = p;
    lastCommittedPointRef.current = p;
  };

  const moveDrawTouch = (ev: TouchEvent<HTMLDivElement>) => {
    if (!isDrawingArea || !isAreaSelectionActive) return;
    ev.preventDefault();
    const p = getTouchMapPoint(ev);
    if (!p) return;
    pendingPointRef.current = p;
    schedulePointCommit();
    setLivePoint(p);
  };

  const endDrawTouch = (ev: TouchEvent<HTMLDivElement>) => {
    ev.preventDefault();
    endDraw();
  };

  const closedPolygonPoints = (() => {
    if (drawnPolygon.length < 2) return drawnPolygon;
    const first = drawnPolygon[0];
    const last = drawnPolygon[drawnPolygon.length - 1];
    const isClosed = Math.abs(first.x - last.x) < 0.005 && Math.abs(first.y - last.y) < 0.005;
    return isClosed ? drawnPolygon : [...drawnPolygon, first];
  })();

  const previewPoints = isDrawingArea && livePoint
    ? [...drawnPolygon, livePoint]
    : drawnPolygon;
  const mapWidth = mapDrawRef.current?.clientWidth ?? 1;
  const mapHeight = mapDrawRef.current?.clientHeight ?? 1;
  const toSvgPoints = (points: Array<{ x: number; y: number }>) =>
    points.map((p) => `${p.x * mapWidth},${p.y * mapHeight}`).join(" ");

  const toggleResultVenue = (venue: VenueOption) => {
    setSelectedResultVenues((prev) =>
      prev.some((v) => v.name === venue.name)
        ? prev.filter((v) => v.name !== venue.name)
        : [...prev, venue],
    );
  };

  /* ── Phase: Macro — stessa griglia categorie del Pianifica ── */
  if (phase === "macro") return (
    <div className="flex flex-col min-h-full bg-gray-50">
      {!embedded && (
        <div className="bg-white px-5 pt-12 pb-5">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={18} className="text-primary" />
            <h1 className="text-2xl font-bold text-gray-900">Scopri</h1>
          </div>
          <p className="text-sm text-gray-400">Cosa vuoi fare oggi?</p>
        </div>
      )}

      <div className="flex-1 px-5 pt-4 pb-6">
        <p className="text-sm text-gray-500 mb-4">Scegli una categoria per la tua proposta di attività.</p>
        <div className="grid grid-cols-5 gap-2">
          {PLAN_CATEGORIES.map(({ key, label, Icon, cols, radius }) => (
            <button
              key={key}
              data-testid={`macro-${key}`}
              type="button"
              onClick={() => {
                setMacro(key);
                setPhase("sub");
              }}
              style={{
                gridColumn: `span ${cols}`,
                borderRadius: radius,
                height: cols >= 3 ? "108px" : cols === 1 ? "80px" : "88px",
              }}
              className="flex flex-col items-center justify-center gap-2 bg-primary/10 text-black hover:bg-primary/15 transition-all active:scale-95"
            >
              <Icon size={cols >= 3 ? 28 : 22} strokeWidth={1.6} />
              <span className="text-xs font-semibold tracking-wide">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  /* ── Phase: Sub — stesse sottocategorie del Pianifica (pill) ── */
  if (phase === "sub") return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className={`bg-white px-5 pb-5 ${embedded ? "pt-4" : "pt-12"}`}>
        <button type="button" onClick={reset} className="flex items-center gap-1 text-sm text-gray-400 mb-4">
          <ChevronLeft size={16} /> Indietro
        </button>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-primary/10">
            <CategoryIcon size={22} className="text-gray-900" strokeWidth={1.6} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{categoryDef.label}</h2>
            <p className="text-sm text-gray-400">Scegli una sottocategoria.</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-5 py-4">
        <div className="flex flex-wrap gap-2">
          {(PLAN_SUBCATEGORIES[macro!] ?? []).map((sub) => (
            <button
              key={sub}
              type="button"
              data-testid={`subcategory-${sub.replace(/\s+/g, "-").toLowerCase()}`}
              onClick={() => void selectSub(sub)}
              className="px-4 py-2 rounded-full text-sm font-medium bg-primary/10 text-black hover:bg-gray-200 transition-all active:scale-95"
            >
              {sub}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  /* ── Phase: Loading Venues ── */
  if (phase === "loading-venues") return (
    <div className="flex flex-col items-center justify-center min-h-full gap-4 bg-gray-50">
      <div className="relative">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/75">
          <MapPin size={30} className="text-primary-foreground" strokeWidth={1.8} />
        </div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
          <Sparkles size={12} className="text-white animate-pulse" />
        </div>
      </div>
      <div className="text-center">
        <p className="font-bold text-gray-900">Cerco i posti migliori a Torino...</p>
        <p className="text-sm text-gray-400 mt-1">L&apos;AI sta incrociando categoria, giorno, mezzo, area sulla mappa, prezzo e preferenze.</p>
      </div>
      <div className="flex gap-1.5 mt-2">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );

  /* ── Phase: Day Calendar ── */
  if (phase === "day-calendar") {
    const month = calendarMonth.getMonth();
    const year = calendarMonth.getFullYear();
    const firstDayWeek = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthLabel = calendarMonth.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
    const cells = Array.from({ length: Math.ceil((firstDayWeek + daysInMonth) / 7) * 7 }, (_, idx) => idx - firstDayWeek + 1);

    return (
      <div className="flex flex-col min-h-full bg-gray-50">
        <div className={`bg-white px-5 pb-5 ${embedded ? "pt-4" : "pt-12"}`}>
          <button onClick={() => setPhase("sub")} className="flex items-center gap-1 text-sm text-gray-400 mb-4">
            <ChevronLeft size={16} /> Indietro
          </button>
          <p className="text-sm font-bold text-gray-900">Che giorno vuoi uscire?</p>
          <p className="text-xs text-gray-500 mt-1">Primo clic seleziona, secondo clic conferma o crea un intervallo.</p>
          <p className="text-[11px] text-primary mt-2 font-semibold">
            {aiPrefetchStatus === "running" && "AI in pre-ricerca: sto gia filtrando luoghi coerenti con categoria e sottocategoria."}
            {aiPrefetchStatus === "done" && `Pre-ricerca completata: ${aiPrefetchCount} candidati iniziali pronti per il filtraggio finale.`}
            {aiPrefetchStatus === "error" && "Pre-ricerca momentaneamente non disponibile: continuo con ricerca completa a fine selezione."}
          </p>
        </div>

        <div className="flex-1 px-4 py-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setCalendarMonth(new Date(year, month - 1, 1))} className="w-8 h-8 rounded-full bg-gray-100 text-gray-600">{"<"}</button>
              <p className="text-sm font-bold text-gray-900 capitalize">{monthLabel}</p>
              <button onClick={() => setCalendarMonth(new Date(year, month + 1, 1))} className="w-8 h-8 rounded-full bg-gray-100 text-gray-600">{">"}</button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-[11px] text-gray-400 mb-2">
              {["L", "M", "M", "G", "V", "S", "D"].map((d, i) => <div key={`${d}-${i}`} className="text-center py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((d, idx) => {
                if (d < 1 || d > daysInMonth) return <div key={`empty-${idx}`} className="h-9" />;
                const date = new Date(year, month, d);
                const isSelected = isWithinSelectedRange(date);
                const isEdge = (firstSelectedDate && toDateOnly(firstSelectedDate).getTime() === toDateOnly(date).getTime())
                  || (secondSelectedDate && toDateOnly(secondSelectedDate).getTime() === toDateOnly(date).getTime());
                const isPast = toDateOnly(date).getTime() < toDateOnly(new Date()).getTime();
                return (
                  <button
                    key={d}
                    data-testid={`calendar-day-${d}`}
                    disabled={isPast}
                    onClick={() => handleCalendarClick(d)}
                    className={`h-9 rounded-lg text-sm font-semibold transition-all ${
                      isPast ? "text-gray-300" :
                      isEdge ? "bg-primary text-white" :
                      isSelected ? "bg-primary/10 text-primary" :
                      "bg-gray-50 text-gray-700"
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-primary/35 bg-primary/10 px-3 py-2">
            <p className="text-xs font-semibold text-primary">
              {isDayConfirmed && firstSelectedDate ? `Selezione confermata: ${getSelectedRangeLabel()}` : "Seleziona e conferma il giorno o il periodo."}
            </p>
          </div>
        </div>

        <div className="px-6 py-4 shrink-0 border-t border-gray-100">
          <button
            data-testid="button-day-continue"
            disabled={!isDayConfirmed || !firstSelectedDate}
            onClick={() => {
              if (!firstSelectedDate) return;
              const dayAnswer = secondSelectedDate
                ? `${formatDayLabel(firstSelectedDate)} - ${formatDayLabel(secondSelectedDate)}`
                : formatDayLabel(firstSelectedDate);
              setAnswers((prev) => ({ ...prev, giorno: dayAnswer }));
              setPhase("question");
            }}
            className="w-full py-3.5 rounded-xl font-semibold text-white bg-black transition-opacity disabled:opacity-40"
          >
            Continua
          </button>
        </div>
      </div>
    );
  }

  /* ── Phase: Questions ── */
  if (phase === "question") return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className={`bg-white px-5 pb-5 ${embedded ? "pt-4" : "pt-12"}`}>
        <button
          onClick={() => qIdx === 0 ? setPhase("day-calendar") : setQIdx(i => i - 1)}
          className="flex items-center gap-1 text-sm text-gray-400 mb-4"
        >
          <ChevronLeft size={16} /> Indietro
        </button>

        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-5">
          <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${((qIdx + 1) / aiQuestions.length) * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 font-medium shrink-0">{qIdx + 1}/{aiQuestions.length}</span>
        </div>

        {/* Sottocategoria */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary/10">
            <CategoryIcon size={14} className="text-gray-800" strokeWidth={1.6} />
          </div>
          <span className="text-sm font-semibold text-gray-600">{subLabel}</span>
        </div>

        {/* AI bubble */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/75">
            <Sparkles size={18} className="text-primary-foreground" />
          </div>
          <div className="flex-1 bg-gray-50 rounded-2xl rounded-tl-sm px-4 py-3">
            <p className="text-gray-900 font-semibold text-sm leading-snug">{currentQ?.text}</p>
          </div>
        </div>

        {aiError && <p className="text-xs text-amber-600 mt-3">{aiError}</p>}
      </div>

      <div className="flex-1 px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          {currentQ?.options.map(opt => (
            <button
              key={opt.key}
              data-testid={`answer-${opt.key}`}
              onClick={() => answer(currentQ.id, opt.key)}
              className="flex items-center justify-center p-4 rounded-2xl bg-white border-2 border-gray-100 active:border-primary active:bg-primary/10 active:scale-[0.97] transition-all shadow-sm text-center min-h-[72px]"
            >
              <span className="text-sm font-semibold text-gray-800 leading-snug">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  /* ── Phase: Price (dopo mappa area) ── */
  if (phase === "price") return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className={`bg-white px-5 pb-5 ${embedded ? "pt-4" : "pt-12"}`}>
        <button
          type="button"
          onClick={() => setPhase("zone-map")}
          className="flex items-center gap-1 text-sm text-gray-400 mb-4"
        >
          <ChevronLeft size={16} /> Indietro
        </button>
        <p className="text-sm font-bold text-gray-900">Seleziona il prezzo</p>
        <p className="text-xs text-gray-500 mt-1">Filtriamo i luoghi anche per fascia di costo.</p>
      </div>
      <div className="flex-1 px-4 py-4">
        <div className="flex flex-col gap-3">
          {[
            SCOPRI_PRICE_TIERS.slice(0, 2),
            SCOPRI_PRICE_TIERS.slice(2, 4),
          ].map((row, rowIdx) => (
            <div key={rowIdx} className="flex gap-3">
              {row.map((opt) => {
                const selected = selectedPrice === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    data-testid={`price-${opt.key}`}
                    onClick={() => setSelectedPrice(opt.key)}
                    className={`flex-1 min-h-[64px] min-w-0 rounded-2xl border-2 text-sm font-semibold transition-all ${
                      selected ? "border-primary bg-primary/10 text-primary" : "border-gray-100 bg-white text-gray-800"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="px-6 py-4 shrink-0 border-t border-gray-100">
        <button
          data-testid="button-price-next"
          disabled={!selectedPrice}
          onClick={() => {
            const priceLabel = SCOPRI_PRICE_TIERS.find((p) => p.key === selectedPrice)?.label ?? "Qualsiasi";
            setAnswers((prev) => ({ ...prev, prezzo: priceLabel }));
            setPhase("preferences");
          }}
          className="w-full py-3.5 rounded-xl font-semibold text-white bg-black transition-opacity disabled:opacity-40"
        >
          Continua
        </button>
      </div>
    </div>
  );

  /* ── Phase: Zone map — OpenStreetMap (mappa reale) + selezione area ── */
  if (phase === "zone-map") return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className={`bg-white px-5 pb-4 ${embedded ? "pt-4" : "pt-12"}`}>
        <button
          type="button"
          onClick={() => setPhase("question")}
          className="flex items-center gap-1 text-sm text-gray-400 mb-4"
        >
          <ChevronLeft size={16} /> Indietro
        </button>
        <div className="flex items-center gap-2 mb-1">
          <MapPin size={16} className="text-primary" />
          <p className="text-sm font-bold text-gray-900">Zona su Torino</p>
        </div>
        <p className="text-xs text-gray-500">
          Mappa reale (strade e quartieri). Puoi spostarti e zoomare quando lo strumento di selezione è spento.
          Attivalo per disegnare l&apos;area in cui l&apos;AI deve cercare i luoghi, oppure continua senza area.
        </p>
      </div>

      <div className="px-4 pt-1">
        <div className="rounded-2xl border border-gray-100 bg-white p-3">
          <div
            ref={mapDrawRef}
            className="relative h-[220px] rounded-xl overflow-hidden border border-primary/35 gpu-smooth"
          >
            <ScopriTorinoLeafletMap freezeInteraction={isAreaSelectionActive} />
            {isAreaSelectionActive && (
              <div
                className="absolute inset-0 z-[5]"
                style={{ touchAction: "none" }}
                onMouseDown={startDraw}
                onMouseMove={moveDraw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDrawTouch}
                onTouchMove={moveDrawTouch}
                onTouchEnd={endDrawTouch}
              />
            )}
            {previewPoints.length > 1 && (
              <svg className="absolute inset-0 z-[6] w-full h-full pointer-events-none">
                <polyline
                  points={toSvgPoints(previewPoints)}
                  fill="none"
                  stroke="rgba(52, 129, 200, 1)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {closedPolygonPoints.length > 3 && (
                  <polygon
                    points={toSvgPoints(closedPolygonPoints)}
                    fill="rgba(74, 155, 217, 0.22)"
                    stroke="rgba(74, 155, 217, 0.9)"
                    strokeWidth="2"
                  />
                )}
                {livePoint && (
                  <circle
                    cx={livePoint.x * mapWidth}
                    cy={livePoint.y * mapHeight}
                    r="4"
                    fill="rgba(52, 129, 200, 1)"
                  />
                )}
              </svg>
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              data-testid="button-activate-area-selection"
              onClick={() => setIsAreaSelectionActive((prev) => !prev)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border active:scale-[0.99] ${
                isAreaSelectionActive
                  ? "border-primary bg-primary text-white"
                  : "text-primary bg-primary/10 border-primary/35"
              }`}
            >
              {isAreaSelectionActive ? "Strumento selezione attivo" : "Attiva strumento selezione"}
            </button>
            <button
              data-testid="button-clear-drawn-area"
              onClick={() => { setDrawnPolygon([]); setLivePoint(null); }}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 border border-gray-200"
            >
              Pulisci
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-4">
        <div className="rounded-xl border border-primary/35 bg-primary/10 p-3">
          <p className="text-xs font-semibold text-primary">
            {drawnPolygon.length > 2
              ? "Area selezionata: l'AI cercherà luoghi compatibili con questa zona sulla mappa."
              : "Attiva lo strumento e disegna sull'area della mappa, oppure salta il passaggio."}
          </p>
        </div>
      </div>

      <div className="px-6 py-4 shrink-0 border-t border-gray-100 flex flex-col gap-2">
        <button
          type="button"
          data-testid="button-zone-skip"
          onClick={() => {
            setAnswers((prev) => {
              const next = { ...prev, zona: "Tutta Torino" };
              delete (next as { areaDisegnata?: string }).areaDisegnata;
              return next;
            });
            setPhase("price");
          }}
          className="w-full py-3 rounded-xl font-semibold text-gray-700 bg-gray-100 border border-gray-200"
        >
          Continua senza area
        </button>
        <button
          type="button"
          data-testid="button-zone-next"
          disabled={!isAreaSelectionActive || drawnPolygon.length < 3}
          onClick={() => {
            const xs = drawnPolygon.map((p) => p.x);
            const ys = drawnPolygon.map((p) => p.y);
            const bounds = xs.length > 0 && ys.length > 0
              ? `bbox:${Math.min(...xs).toFixed(3)},${Math.min(...ys).toFixed(3)}-${Math.max(...xs).toFixed(3)},${Math.max(...ys).toFixed(3)}`
              : "bbox:torino";
            setAnswers((prev) => ({ ...prev, zona: "Area disegnata sulla mappa", areaDisegnata: bounds }));
            setPhase("price");
          }}
          className="w-full py-3.5 rounded-xl font-semibold text-white bg-black transition-opacity disabled:opacity-40"
        >
          Continua con area
        </button>
      </div>
    </div>
  );

  if (phase === "preferences") return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className={`bg-white px-5 pb-5 ${embedded ? "pt-4" : "pt-12"}`}>
        <button
          type="button"
          onClick={() => setPhase("price")}
          className="flex items-center gap-1 text-sm text-gray-400 mb-4"
        >
          <ChevronLeft size={16} /> Indietro
        </button>
        <p className="text-sm font-bold text-gray-900">Preferenze finali</p>
        <p className="text-xs text-gray-500 mt-1">Aggiungi richieste libere per affinare la ricerca AI.</p>
      </div>
      <div className="flex-1 px-4 py-4">
        <textarea
          data-testid="input-user-request"
          value={userRequest}
          onChange={(e) => setUserRequest(e.target.value)}
          placeholder="Es. tavolo all'aperto, zona tranquilla, parcheggio vicino, senza glutine..."
          className="w-full min-h-[140px] rounded-2xl bg-white border border-gray-100 px-3 py-3 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>
      <div className="px-6 py-4 shrink-0 border-t border-gray-100">
        <button
          type="button"
          data-testid="button-preferences-search"
          onClick={() => {
            const finalAnswers = {
              ...answers,
              prezzo: answers.prezzo ?? SCOPRI_PRICE_TIERS.find((p) => p.key === selectedPrice)?.label ?? "Qualsiasi",
            };
            setAnswers(finalAnswers);
            runVenueSearch(finalAnswers);
          }}
          className="w-full py-3.5 rounded-xl font-semibold text-white bg-black transition-opacity"
        >
          Cerca luoghi
        </button>
      </div>
    </div>
  );

  /* ── Phase: Results ── */
  if (phase === "results") {
    const isAi = aiVenues.length > 0;
    const verifiedRows = aiVenues.filter((v) => v.scopriVerification !== "suggestion");
    const ideaRows = aiVenues.filter((v) => v.scopriVerification === "suggestion");
    const aiNames = new Set(aiVenues.map((v) => v.name.toLowerCase()));
    const supplemental = isAi
      ? results.filter((v) => !aiNames.has(v.name.toLowerCase())).slice(0, Math.max(0, 5 - aiVenues.length))
      : [];
    const venueCount = isAi ? aiVenues.length + supplemental.length : results.length;

    return (
      <div className="flex flex-col min-h-full bg-gray-50">
        <div className={`bg-white px-5 pb-5 ${embedded ? "pt-4" : "pt-12"}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <Sparkles size={14} className="text-primary" />
                <p className="text-xs font-bold text-primary uppercase tracking-wide">
                  {isAi ? "Scopri Torino" : "Suggeriti per te"}
                </p>
              </div>
              <h2 className="text-xl font-bold text-gray-900">{venueCount} risultati</h2>
            </div>
            <button
              data-testid="button-restart-search"
              onClick={reset}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 text-sm font-semibold text-gray-600 active:scale-95 transition-transform"
            >
              <RefreshCw size={13} />
              Ricerca
            </button>
          </div>

          {/* Summary chips */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {subLabel && (
              <span className="text-xs bg-primary/10 text-primary font-semibold px-2.5 py-1 rounded-full">
                {subLabel}
              </span>
            )}
            {answers.giorno && (
              <span className="text-xs bg-gray-100 text-gray-600 font-medium px-2.5 py-1 rounded-full">
                {answers.giorno}
              </span>
            )}
            {answers.chi && (
              <span className="text-xs bg-gray-100 text-gray-600 font-medium px-2.5 py-1 rounded-full">
                {CHI_LABEL[answers.chi] ?? answers.chi}
              </span>
            )}
            {answers.mezzo && (
              <span className="text-xs bg-gray-100 text-gray-600 font-medium px-2.5 py-1 rounded-full">
                {MEZZO_LABEL[answers.mezzo] ?? answers.mezzo}
              </span>
            )}
            {answers.prezzo && (
              <span className="text-xs bg-gray-100 text-gray-600 font-medium px-2.5 py-1 rounded-full">
                {answers.prezzo}
              </span>
            )}
          </div>

          {aiError && (
            <p className="text-xs text-amber-600 mt-2">{aiError}</p>
          )}
        </div>

        <div className="flex-1 px-4 py-4 space-y-3 pb-6">

          {/* ── AI Venues (verificati prima, poi altre idee) ── */}
          {isAi && verifiedRows.length > 0 && (
            <div className="space-y-2 mb-1">
              <p className="text-xs font-bold text-gray-800 px-1">Consigli verificati</p>
              <p className="text-[11px] text-gray-500 px-1 leading-snug">
                Catalogo LineUp o sito raggiungibile; se hai disegnato l’area, coordinate nella zona richiesta.
              </p>
            </div>
          )}
          {isAi &&
            verifiedRows.map((venue, i) => (
            <div
              key={`ai-v-${venue.name}-${i}`}
              data-testid={`result-${i}`}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 pb-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/75 text-sm font-bold text-primary-foreground">
                      {i + 1}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 leading-tight">{venue.name}</h3>
                      {venue.quartiere?.trim() ? (
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-gray-500">
                          <MapPin size={11} className="shrink-0" />
                          {venue.quartiere.trim()}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-gray-500 bg-gray-50 px-2 py-0.5 rounded-lg shrink-0">
                    {venue.priceRange}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-3 mt-2">
                  <span className="flex items-center gap-1 text-xs text-amber-500 font-semibold">
                    <Star size={11} fill="currentColor" />{venue.rating}
                  </span>
                  {typeof venue.score === "number" && (
                    <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-lg">
                      Score {venue.score}
                    </span>
                  )}
                  {venue.openStatus === "open" && (
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg">
                      Aperto
                    </span>
                  )}
                </div>

                {/* AI description bubble */}
                <div className="flex items-start gap-2 bg-gray-50 rounded-xl p-3">
                  <Sparkles size={12} className="text-primary mt-0.5 shrink-0" />
                  <div className="text-xs text-gray-600 leading-relaxed">
                    <p>{venue.description}</p>
                    {Array.isArray(venue.why) && venue.why.length > 0 && (
                      <p className="mt-1 text-[11px] text-primary">
                        {venue.why.slice(0, 2).join(" · ")}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="border-t border-gray-100 grid grid-cols-3 divide-x divide-gray-100">
                <a
                  href={venue.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid={`button-website-${i}`}
                  className="flex flex-col items-center gap-1 py-3 text-gray-500 active:bg-gray-50 transition-colors"
                >
                  <ExternalLink size={15} />
                  <span className="text-[10px] font-semibold">Sito</span>
                </a>
                <a
                  href={venue.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue.name} ${venue.address}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid={`button-maps-${i}`}
                  className="flex flex-col items-center gap-1 py-3 text-gray-500 active:bg-gray-50 transition-colors"
                >
                  <MapPin size={15} />
                  <span className="text-[10px] font-semibold">Maps</span>
                </a>
                <a
                  href={venue.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid={`button-book-${i}`}
                  className="flex flex-col items-center gap-1 py-3 text-primary transition-colors active:bg-primary/10"
                >
                  <CalendarPlus size={15} />
                  <span className="text-[10px] font-semibold">Prenota</span>
                </a>
              </div>
              {onCreateEvent && (
                <div className="border-t border-gray-100 px-4 py-3">
                  <button
                    data-testid={`toggle-select-event-${i}`}
                    onClick={() => toggleResultVenue(venueOptionFromScopriAi(venue))}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-sm font-bold transition-all ${
                      selectedResultVenues.some((v) => v.name === venue.name)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-gray-200 bg-white text-gray-600"
                    }`}
                  >
                    <CheckCircle2 size={15} />
                    {selectedResultVenues.some((v) => v.name === venue.name) ? "Luogo selezionato" : "Seleziona luogo"}
                  </button>
                </div>
              )}
            </div>
          ))}

          {isAi && ideaRows.length > 0 && (
            <div className="space-y-2 pt-2 mt-2 border-t border-gray-200">
              <p className="text-xs font-bold text-gray-600 px-1">Altre idee</p>
              <p className="text-[11px] text-gray-500 px-1 leading-snug">
                Suggerimenti meno controllati automaticamente: controlla sempre indirizzo e sito prima di prenotare.
              </p>
            </div>
          )}
          {isAi &&
            ideaRows.map((venue, j) => {
              const i = verifiedRows.length + j;
              return (
            <div
              key={`ai-s-${venue.name}-${j}`}
              data-testid={`result-idea-${j}`}
              className="bg-white rounded-2xl shadow-sm border border-dashed border-gray-200 overflow-hidden opacity-95"
            >
              <div className="p-4 pb-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 bg-gray-400"
                    >
                      {i + 1}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 leading-tight">{venue.name}</h3>
                      {venue.quartiere?.trim() ? (
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-gray-500">
                          <MapPin size={11} className="shrink-0" />
                          {venue.quartiere.trim()}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-gray-500 bg-gray-50 px-2 py-0.5 rounded-lg shrink-0">
                    {venue.priceRange}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-3 mt-2">
                  <span className="flex items-center gap-1 text-xs text-amber-500 font-semibold">
                    <Star size={11} fill="currentColor" />{venue.rating}
                  </span>
                  {typeof venue.score === "number" && (
                    <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-lg">
                      Score {venue.score}
                    </span>
                  )}
                  {venue.openStatus === "open" && (
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg">
                      Aperto
                    </span>
                  )}
                </div>

                <div className="flex items-start gap-2 bg-gray-50 rounded-xl p-3">
                  <Sparkles size={12} className="text-gray-400 mt-0.5 shrink-0" />
                  <div className="text-xs text-gray-600 leading-relaxed">
                    <p>{venue.description}</p>
                    {Array.isArray(venue.why) && venue.why.length > 0 && (
                      <p className="mt-1 text-[11px] text-primary">
                        {venue.why.slice(0, 2).join(" · ")}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 grid grid-cols-3 divide-x divide-gray-100">
                <a
                  href={venue.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid={`button-website-idea-${j}`}
                  className="flex flex-col items-center gap-1 py-3 text-gray-500 active:bg-gray-50 transition-colors"
                >
                  <ExternalLink size={15} />
                  <span className="text-[10px] font-semibold">Sito</span>
                </a>
                <a
                  href={venue.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue.name} ${venue.address}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid={`button-maps-idea-${j}`}
                  className="flex flex-col items-center gap-1 py-3 text-gray-500 active:bg-gray-50 transition-colors"
                >
                  <MapPin size={15} />
                  <span className="text-[10px] font-semibold">Maps</span>
                </a>
                <a
                  href={venue.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid={`button-book-idea-${j}`}
                  className="flex flex-col items-center gap-1 py-3 text-primary transition-colors active:bg-primary/10"
                >
                  <CalendarPlus size={15} />
                  <span className="text-[10px] font-semibold">Prenota</span>
                </a>
              </div>
              {onCreateEvent && (
                <div className="border-t border-gray-100 px-4 py-3">
                  <button
                    data-testid={`toggle-select-event-idea-${j}`}
                    onClick={() => toggleResultVenue(venueOptionFromScopriAi(venue))}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-sm font-bold transition-all ${
                      selectedResultVenues.some((v) => v.name === venue.name)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-gray-200 bg-white text-gray-600"
                    }`}
                  >
                    <CheckCircle2 size={15} />
                    {selectedResultVenues.some((v) => v.name === venue.name) ? "Luogo selezionato" : "Seleziona luogo"}
                  </button>
                </div>
              )}
            </div>
              );
            })}

          {isAi && supplemental.map((venue, i) => (
            <div
              key={`supp-${venue.name}`}
              data-testid={`result-supplemental-${i}`}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
            >
              <div className="flex items-start justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/75 text-sm font-bold text-primary-foreground">
                    {aiVenues.length + i + 1}
                  </div>
                  <h3 className="font-bold text-gray-900">{venue.name}</h3>
                </div>
                {venue.discount && (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg shrink-0">
                    <Tag size={9} />{venue.discount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mb-3">
                <span className="flex items-center gap-1 text-xs text-amber-500 font-semibold">
                  <Star size={11} fill="currentColor" />{venue.rating}
                </span>
              </div>
              {venue.reason && (
                <div className="flex items-start gap-2 bg-gray-50 rounded-xl p-3 mb-3">
                  <Sparkles size={12} className="text-primary mt-0.5 shrink-0" />
                  <p className="text-xs text-gray-500 leading-relaxed">{venue.reason}</p>
                </div>
              )}
              {onCreateEvent && (
                <button
                  data-testid={`toggle-select-supplemental-${i}`}
                  onClick={() => toggleResultVenue(venue)}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-sm font-bold transition-all ${
                    selectedResultVenues.some((v) => v.name === venue.name)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-gray-200 bg-white text-gray-600"
                  }`}
                >
                  <CheckCircle2 size={15} />
                  {selectedResultVenues.some((v) => v.name === venue.name) ? "Luogo selezionato" : "Seleziona luogo"}
                </button>
              )}
            </div>
          ))}

          {/* ── Fallback (non-AI) venues ── */}
          {!isAi && results.map((venue, i) => (
            <div
              key={venue.name}
              data-testid={`result-${i}`}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
            >
              <div className="flex items-start justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/75 text-sm font-bold text-primary-foreground">
                    {i + 1}
                  </div>
                  <h3 className="font-bold text-gray-900">{venue.name}</h3>
                </div>
                {venue.discount && (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg shrink-0">
                    <Tag size={9} />{venue.discount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mb-3">
                <span className="flex items-center gap-1 text-xs text-amber-500 font-semibold">
                  <Star size={11} fill="currentColor" />{venue.rating}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <MapPin size={11} />{venuePollSubtitle(venue)}
                </span>
              </div>
              {venue.reason && (
                <div className="flex items-start gap-2 bg-gray-50 rounded-xl p-3 mb-3">
                  <Sparkles size={12} className="text-primary mt-0.5 shrink-0" />
                  <p className="text-xs text-gray-500 leading-relaxed">{venue.reason}</p>
                </div>
              )}
              {onCreateEvent && (
                <button
                  data-testid={`toggle-select-fallback-${i}`}
                  onClick={() => toggleResultVenue(venue)}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-sm font-bold transition-all ${
                    selectedResultVenues.some((v) => v.name === venue.name)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-gray-200 bg-white text-gray-600"
                  }`}
                >
                  <CheckCircle2 size={14} />
                  {selectedResultVenues.some((v) => v.name === venue.name) ? "Luogo selezionato" : "Seleziona luogo"}
                </button>
              )}
            </div>
          ))}

          {venueCount === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MapPin size={28} className="text-gray-300" />
              </div>
              <p className="font-semibold text-gray-700">Nessun posto trovato</p>
              <p className="text-sm text-gray-400 mt-1">Prova con altre preferenze</p>
              <button
                type="button"
                onClick={reset}
                className="mt-4 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                Riprova
              </button>
            </div>
          )}
        </div>
        {onCreateEvent && selectedResultVenues.length > 0 && (
          <div className="px-4 pb-5">
            <button
              data-testid="button-create-event-from-selected"
              onClick={() => {
                const m = macro ?? lastScopriContextRef.current?.macro;
                const s = subLabel ?? lastScopriContextRef.current?.subLabel;
                if (!m || !s || !onCreateEvent) return;
                onCreateEvent({
                  venues: selectedResultVenues,
                  categoryKey: m,
                  subcategoryLabel: s,
                });
              }}
              className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 active:opacity-80 transition-opacity"
              style={{ background: "linear-gradient(135deg, #1a1a1a, #333)" }}
            >
              <Calendar size={15} />
              Crea evento con quel luogo
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
}
