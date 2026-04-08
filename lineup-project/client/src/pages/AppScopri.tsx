import { useEffect, useRef, useState, type MouseEvent, type TouchEvent } from "react";
import {
  ChevronLeft, Sparkles, MapPin, Star, Tag, RefreshCw,
  Utensils, Landmark, Dumbbell, Ticket,
  Calendar, Bus, Car, Globe, Sun,
  Gamepad2,
  Building2, Film, Music, Drama, Trophy,
  UtensilsCrossed, Coffee, ShoppingBag, PartyPopper,
  Activity, ExternalLink, CalendarPlus, CheckCircle2
} from "lucide-react";
import { VENUES_BY_ACTIVITY, type VenueOption } from "@/lib/appUtils";

interface AiVenue {
  name: string;
  address: string;
  description: string;
  rating: number;
  priceRange: string;
  bookingUrl: string;
  websiteUrl: string;
  mapsUrl: string;
  safariUrl?: string;
}

interface AiQuestion {
  id: string;
  text: string;
  options: { key: string; label: string }[];
}

/* ─── Data ─── */
const MACRO = [
  {
    key: "cibo",
    label: "Cibo",
    desc: "Ristoranti, bar e locali",
    Icon: Utensils,
    color: "#d97706",
    bg: "#FEF3C7",
    accent: "#f59e0b",
  },
  {
    key: "cultura",
    label: "Cultura",
    desc: "Arte, mostre e musei",
    Icon: Landmark,
    color: "#7c3aed",
    bg: "#EDE9FE",
    accent: "#8b5cf6",
  },
  {
    key: "sport",
    label: "Sport",
    desc: "Attivita fisiche e outdoor",
    Icon: Dumbbell,
    color: "#059669",
    bg: "#D1FAE5",
    accent: "#10b981",
  },
  {
    key: "eventi",
    label: "Eventi",
    desc: "Concerti, fiere e teatro",
    Icon: Ticket,
    color: "#dc2626",
    bg: "#FEE2E2",
    accent: "#ef4444",
  },
  {
    key: "svago",
    label: "Svago",
    desc: "Uscite libere e passeggiate",
    Icon: Gamepad2,
    color: "#0f766e",
    bg: "#CCFBF1",
    accent: "#14b8a6",
  },
];

type SubItem = { key: string; Icon: any; label: string; activity?: string };

const SUBCATEGORIES: Record<string, SubItem[]> = {
  cibo: [
    { key: "aperitivo",  Icon: UtensilsCrossed, label: "Aperitivo",   activity: "aperitivo" },
    { key: "cena",       Icon: Utensils,        label: "Cena",        activity: "cena" },
    { key: "spuntino",   Icon: Coffee,          label: "Spuntino",    activity: "cibo" },
    { key: "pranzo",     Icon: Utensils,        label: "Pranzo",      activity: "cena" },
    { key: "colazione",  Icon: Coffee,          label: "Colazione",   activity: "cibo" },
    { key: "brunch",     Icon: Coffee,          label: "Brunch",      activity: "cibo" },
  ],
  cultura: [
    { key: "mostre",     Icon: Film,           label: "Mostre",     activity: "gita" },
    { key: "musei",      Icon: Landmark,       label: "Musei",      activity: "gita" },
  ],
  sport: [
    { key: "arti-marziali",Icon: Activity,     label: "Arti marziali", activity: "sport" },
    { key: "basket",       Icon: Trophy,       label: "Basket",      activity: "sport" },
    { key: "beach-volley", Icon: Trophy,       label: "Beach volley", activity: "sport" },
    { key: "bici",         Icon: Activity,     label: "Bici", activity: "sport" },
    { key: "calcio",       Icon: Trophy,       label: "Calcio", activity: "calcio" },
    { key: "camminata",    Icon: Activity,     label: "Camminata", activity: "sport" },
    { key: "canoa",        Icon: Activity,     label: "Canoa", activity: "sport" },
    { key: "corsa",        Icon: Activity,     label: "Corsa", activity: "sport" },
    { key: "hockey",       Icon: Trophy,       label: "Hockey", activity: "sport" },
    { key: "padel",        Icon: Activity,     label: "Padel", activity: "padel" },
    { key: "palestra",     Icon: Dumbbell,     label: "Palestra", activity: "sport" },
    { key: "pallavolo",    Icon: Trophy,       label: "Pallavolo", activity: "sport" },
    { key: "pattinaggio",  Icon: Activity,     label: "Pattinaggio", activity: "sport" },
    { key: "ping-pong",    Icon: Trophy,       label: "Ping pong", activity: "sport" },
    { key: "piscina",      Icon: Activity,     label: "Piscina", activity: "sport" },
    { key: "sci",          Icon: Activity,     label: "Sci", activity: "sport" },
    { key: "snowboard",    Icon: Activity,     label: "Snowboard", activity: "sport" },
    { key: "tennis",       Icon: Trophy,       label: "Tennis", activity: "sport" },
    { key: "arrampicata",  Icon: Activity,     label: "Arrampicata", activity: "sport" },
    { key: "skateboard",   Icon: Activity,     label: "Skateboard", activity: "sport" },
    { key: "skateboard-park", Icon: Activity,  label: "Skateboard park", activity: "sport" },
    { key: "tiro-arco",    Icon: Activity,     label: "Tiro con l'arco", activity: "sport" },
    { key: "parchi-ciclismo", Icon: Activity,  label: "Parchi per ciclismo", activity: "sport" },
    { key: "nuoto",        Icon: Activity,     label: "Nuoto", activity: "sport" },
    { key: "minigolf",     Icon: Trophy,       label: "Minigolf", activity: "sport" },
    { key: "bowling",      Icon: Trophy,       label: "Bowling", activity: "sport" },
    { key: "go-kart",      Icon: Trophy,       label: "Go-kart", activity: "sport" },
  ],
  eventi: [
    { key: "concerti",   Icon: Music,          label: "Concerti",        activity: "cinema" },
    { key: "discoteche", Icon: PartyPopper,    label: "Discoteche",      activity: "cinema" },
    { key: "festival",   Icon: PartyPopper,    label: "Festival",        activity: "cinema" },
    { key: "fiere",      Icon: Building2,      label: "Fiere",           activity: "gita" },
    { key: "teatro",     Icon: Drama,          label: "Teatro",          activity: "cinema" },
  ],
  svago: [
    { key: "giro-centro", Icon: MapPin,      label: "Giro in centro", activity: "altro" },
    { key: "giornata-mare", Icon: Sun,       label: "Giornata al mare", activity: "mare" },
    { key: "mercatino", Icon: ShoppingBag,   label: "Mercatino", activity: "fiere" },
    { key: "passeggiata", Icon: Activity,    label: "Passeggiata", activity: "altro" },
    { key: "uscita", Icon: PartyPopper,      label: "Uscita", activity: "altro" },
    { key: "uscita-montagna", Icon: Trophy,  label: "Uscita in montagna", activity: "montagna" },
    { key: "sala-giochi", Icon: Gamepad2,    label: "Sala giochi", activity: "altro" },
    { key: "acqua-park", Icon: Activity,     label: "Acqua park", activity: "altro" },
    { key: "parco-giochi", Icon: Activity,   label: "Parco giochi", activity: "altro" },
    { key: "escape-room", Icon: Building2,   label: "Escape room", activity: "altro" },
  ],
};

function getPianificaStyleQuestions(): AiQuestion[] {
  return [
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

const PRICE_OPTIONS = [
  { key: "gratis", label: "Gratis" },
  { key: "euro", label: "€" },
  { key: "due-euro", label: "€€" },
  { key: "tre-euro", label: "€€€" },
  { key: "qualsiasi", label: "Qualsiasi" },
];

/* ─── Result generator ─── */
function generateResults(
  subObj: SubItem,
  answers: Record<string, string>
): (VenueOption & { reason: string })[] {
  const activity = subObj.activity ?? "altro";
  const pool = [...(VENUES_BY_ACTIVITY[activity] ?? VENUES_BY_ACTIVITY.altro)];
  pool.sort((a, b) => b.rating - a.rating);
  // Soft-filter based on budget (prefer, but don't hard-exclude)
  let preferred = [...pool];
  if (answers.budget === "gratis") preferred = preferred.filter(v => !v.discount);
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
  if (answers.chi === "coppia") parts.push("ottimo per una serata romantica");
  if (answers.chi === "famiglia") parts.push("adatto a tutta la famiglia");
  if (answers.chi === "amici") parts.push("perfetto per un gruppo");
  if (answers.quando === "stasera") parts.push("disponibile stasera");
  if (v.discount) parts.push(`offerta: ${v.discount}`);
  if (parts.length === 0) parts.push(`valutazione ${v.rating} stelle`);
  return parts.slice(0, 2).join(" · ");
}

/* ─── Component ─── */
type Phase = "macro" | "sub" | "loading-questions" | "day-calendar" | "question" | "zone-map" | "price" | "preferences" | "loading-venues" | "results";

export default function AppScopri({ embedded = false, onCreateEvent }: { embedded?: boolean; onCreateEvent?: (venues: VenueOption[]) => void }) {
  const [phase, setPhase] = useState<Phase>("macro");
  const [macro, setMacro] = useState<string | null>(null);
  const [sub, setSub] = useState<SubItem | null>(null);
  const [qIdx, setQIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [aiQuestions, setAiQuestions] = useState<AiQuestion[]>([]);
  const [results, setResults] = useState<ReturnType<typeof generateResults>>([]);
  const [aiVenues, setAiVenues] = useState<AiVenue[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
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
  const [selectedPrice, setSelectedPrice] = useState<string | null>(null);
  const [userRequest, setUserRequest] = useState("");
  const [selectedResultVenues, setSelectedResultVenues] = useState<VenueOption[]>([]);

  const macroObj = MACRO.find(m => m.key === macro) ?? MACRO[0];
  const currentQ = aiQuestions[qIdx];

  const reset = () => {
    setPhase("macro"); setMacro(null); setSub(null);
    setQIdx(0); setAnswers({}); setResults([]); setAiVenues([]);
    setAiQuestions([]); setAiError(null);
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
  };

  useEffect(() => {
    return () => {
      if (drawFrameRef.current !== null) {
        cancelAnimationFrame(drawFrameRef.current);
      }
    };
  }, []);

  const selectSub = async (s: SubItem) => {
    setSub(s);
    setPhase("loading-questions");
    setAiError(null);
    const questions = getPianificaStyleQuestions();
    setAiQuestions(questions);
    setQIdx(0);
    setPhase("day-calendar");
  };

  const runVenueSearch = async (finalAnswers: Record<string, string>) => {
    setPhase("loading-venues");
    setAiError(null);
    try {
      const resp = await fetch("/api/scopri/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: macro,
          subcategory: sub?.label,
          answers: finalAnswers,
            userRequest: userRequest.trim() || undefined,
        }),
      });
      if (!resp.ok) throw new Error("Errore API");
      const data = await resp.json();
      if (data.venues && data.venues.length > 0) {
        setAiVenues(data.venues);
        if (data.venues.length < 5) {
          setResults(generateResults(sub!, finalAnswers));
        } else {
          setResults([]);
        }
      } else {
        setResults(generateResults(sub!, finalAnswers));
      }
    } catch {
      setAiError("Non riesco a connettermi all'AI. Mostro suggerimenti locali.");
      setResults(generateResults(sub!, finalAnswers));
    } finally {
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

  /* ── Phase: Macro ── */
  if (phase === "macro") return (
    <div className="flex flex-col min-h-full bg-gray-50">
      {!embedded && (
        <div className="bg-white px-5 pt-12 pb-5">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={18} className="text-[#4A9BD9]" />
            <h1 className="text-2xl font-bold text-gray-900">Scopri</h1>
          </div>
          <p className="text-sm text-gray-400">Cosa vuoi fare oggi?</p>
        </div>
      )}

      <div className="flex-1 px-4 pt-4 pb-6">
        <div className="grid grid-cols-2 gap-3">
          {MACRO.map(m => {
            const Icon = m.Icon;
            return (
              <button
                key={m.key}
                data-testid={`macro-${m.key}`}
                onClick={() => { setMacro(m.key); setPhase("sub"); }}
                className={`flex flex-col items-start p-5 rounded-2xl bg-white border border-gray-100 shadow-sm active:scale-[0.97] transition-transform text-left gap-3 ${
                  m.key === "svago" ? "col-span-2 w-full max-w-[180px] justify-self-center" : ""
                }`}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: m.bg }}
                >
                  <Icon size={22} style={{ color: m.color }} strokeWidth={1.8} />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm leading-tight">{m.label}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">{m.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Bottom promo strip */}
        <div
          className="mt-4 p-4 rounded-2xl flex items-center gap-3"
          style={{ background: "linear-gradient(135deg, #4A9BD9, #7CB9E8)" }}
        >
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">Scegli per me</p>
            <p className="text-white/70 text-xs">Lascia decidere all'AI</p>
          </div>
        </div>
      </div>
    </div>
  );

  /* ── Phase: Sub ── */
  if (phase === "sub") return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className={`bg-white px-5 pb-5 ${embedded ? "pt-4" : "pt-12"}`}>
        <button onClick={reset} className="flex items-center gap-1 text-sm text-gray-400 mb-4">
          <ChevronLeft size={16} /> Indietro
        </button>
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: macroObj.bg }}
          >
            <macroObj.Icon size={22} style={{ color: macroObj.color }} strokeWidth={1.8} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{macroObj.label}</h2>
            <p className="text-sm text-gray-400">Cosa hai in mente?</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-4">
        <div className="grid grid-cols-3 gap-2.5">
          {(SUBCATEGORIES[macro!] ?? []).map(s => {
            const Icon = s.Icon;
            return (
              <button
                key={s.key}
                data-testid={`sub-${s.key}`}
                onClick={() => selectSub(s)}
                className="flex flex-col items-center gap-2 py-4 px-2 rounded-2xl bg-white border border-gray-100 shadow-sm active:scale-95 transition-transform"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: macroObj.bg }}
                >
                  <Icon size={17} style={{ color: macroObj.color }} strokeWidth={1.8} />
                </div>
                <span className="text-xs font-semibold text-gray-700 text-center leading-tight">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  /* ── Phase: Loading Questions ── */
  if (phase === "loading-questions") return (
    <div className="flex flex-col items-center justify-center min-h-full gap-4 bg-gray-50">
      <div className="relative">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: macroObj.bg }}
        >
          {sub && <sub.Icon size={30} style={{ color: macroObj.color }} strokeWidth={1.8} />}
        </div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#4A9BD9] rounded-full flex items-center justify-center">
          <Sparkles size={12} className="text-white animate-pulse" />
        </div>
      </div>
      <div className="text-center">
        <p className="font-bold text-gray-900">Preparo le domande giuste...</p>
        <p className="text-sm text-gray-400 mt-1">L'AI sta analizzando {sub?.label}</p>
      </div>
      <div className="flex gap-1.5 mt-2">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-2 h-2 rounded-full bg-[#4A9BD9] animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );

  /* ── Phase: Loading Venues ── */
  if (phase === "loading-venues") return (
    <div className="flex flex-col items-center justify-center min-h-full gap-4 bg-gray-50">
      <div className="relative">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #4A9BD9, #7CB9E8)" }}
        >
          <MapPin size={30} className="text-white" strokeWidth={1.8} />
        </div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#4A9BD9] rounded-full flex items-center justify-center">
          <Sparkles size={12} className="text-white animate-pulse" />
        </div>
      </div>
      <div className="text-center">
        <p className="font-bold text-gray-900">Cerco i posti migliori a Torino...</p>
        <p className="text-sm text-gray-400 mt-1">L'AI sta analizzando le tue preferenze</p>
      </div>
      <div className="flex gap-1.5 mt-2">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-2 h-2 rounded-full bg-[#4A9BD9] animate-bounce"
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
                      isEdge ? "bg-[#4A9BD9] text-white" :
                      isSelected ? "bg-[#EBF5FB] text-[#2e6f9f]" :
                      "bg-gray-50 text-gray-700"
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-[#c7e3f4] bg-[#EBF5FB] px-3 py-2">
            <p className="text-xs font-semibold text-[#2e6f9f]">
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
              className="h-full bg-[#4A9BD9] rounded-full transition-all duration-500"
              style={{ width: `${((qIdx + 1) / aiQuestions.length) * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 font-medium shrink-0">{qIdx + 1}/{aiQuestions.length}</span>
        </div>

        {/* Sub label */}
        <div className="flex items-center gap-2 mb-4">
          {sub && (
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: macroObj.bg }}>
              <sub.Icon size={14} style={{ color: macroObj.color }} />
            </div>
          )}
          <span className="text-sm font-semibold text-gray-600">{sub?.label}</span>
        </div>

        {/* AI bubble */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #4A9BD9, #7CB9E8)" }}>
            <Sparkles size={18} className="text-white" />
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
              onClick={() => answer(currentQ.id, opt.label)}
              className="flex items-center justify-center p-4 rounded-2xl bg-white border-2 border-gray-100 active:border-[#4A9BD9] active:bg-[#EBF5FB] active:scale-[0.97] transition-all shadow-sm text-center min-h-[72px]"
            >
              <span className="text-sm font-semibold text-gray-800 leading-snug">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  /* ── Phase: Zone map ── */
  if (phase === "zone-map") return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className={`bg-white px-5 pb-5 ${embedded ? "pt-4" : "pt-12"}`}>
        <button
          onClick={() => {
            setQIdx(aiQuestions.length - 1);
            setPhase("question");
          }}
          className="flex items-center gap-1 text-sm text-gray-400 mb-4"
        >
          <ChevronLeft size={16} /> Indietro
        </button>
        <div className="flex items-center gap-2 mb-1">
          <MapPin size={16} className="text-[#4A9BD9]" />
          <p className="text-sm font-bold text-gray-900">Disegna un area sulla mappa</p>
        </div>
        <p className="text-xs text-gray-500">Attiva lo strumento e delimita con il cursore la zona di ricerca.</p>
      </div>

      <div className="px-4 pt-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-3">
          <div
            ref={mapDrawRef}
            className="relative h-[220px] rounded-xl overflow-hidden border border-[#c7e3f4]"
            style={{ touchAction: "none" }}
            onMouseDown={startDraw}
            onMouseMove={moveDraw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDrawTouch}
            onTouchMove={moveDrawTouch}
            onTouchEnd={endDrawTouch}
          >
            <iframe
              title="Torino Google Maps"
              className={`absolute inset-0 w-full h-full ${isAreaSelectionActive ? "pointer-events-none" : ""}`}
              src="https://www.google.com/maps?q=Torino&z=12&output=embed"
              loading="lazy"
            />
            {previewPoints.length > 1 && (
              <svg className="absolute inset-0 w-full h-full">
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
                  ? "text-white bg-[#4A9BD9] border-[#4A9BD9]"
                  : "text-[#2e6f9f] bg-[#EBF5FB] border-[#c7e3f4]"
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
        <div className="rounded-xl border border-[#c7e3f4] bg-[#EBF5FB] p-3">
          <p className="text-xs font-semibold text-[#2e6f9f]">
            {drawnPolygon.length > 2
              ? "Area selezionata pronta: l'AI cerchera luoghi dentro questa zona."
              : "Disegna l'area con il mouse per filtrare i risultati."}
          </p>
        </div>
      </div>

      <div className="px-6 py-4 shrink-0 border-t border-gray-100">
        <button
          data-testid="button-zone-next"
          disabled={!isAreaSelectionActive || drawnPolygon.length < 3}
          onClick={() => {
            const xs = drawnPolygon.map((p) => p.x);
            const ys = drawnPolygon.map((p) => p.y);
            const bounds = xs.length > 0 && ys.length > 0
              ? `bbox:${Math.min(...xs).toFixed(3)},${Math.min(...ys).toFixed(3)}-${Math.max(...xs).toFixed(3)},${Math.max(...ys).toFixed(3)}`
              : "bbox:torino";
            const finalAnswers = { ...answers, zona: "Area disegnata Torino", areaDisegnata: bounds };
            setAnswers(finalAnswers);
            setPhase("price");
          }}
          className="w-full py-3.5 rounded-xl font-semibold text-white bg-black transition-opacity disabled:opacity-40"
        >
          Continua
        </button>
      </div>
    </div>
  );

  if (phase === "price") return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className={`bg-white px-5 pb-5 ${embedded ? "pt-4" : "pt-12"}`}>
        <button
          onClick={() => setPhase("zone-map")}
          className="flex items-center gap-1 text-sm text-gray-400 mb-4"
        >
          <ChevronLeft size={16} /> Indietro
        </button>
        <p className="text-sm font-bold text-gray-900">Seleziona il prezzo</p>
        <p className="text-xs text-gray-500 mt-1">Filtriamo i luoghi anche per fascia di costo.</p>
      </div>
      <div className="flex-1 px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          {PRICE_OPTIONS.map((opt) => {
            const selected = selectedPrice === opt.key;
            return (
              <button
                key={opt.key}
                data-testid={`price-${opt.key}`}
                onClick={() => setSelectedPrice(opt.key)}
                className={`min-h-[64px] rounded-2xl border-2 text-sm font-semibold transition-all ${
                  opt.key === "qualsiasi" ? "col-span-2 max-w-[160px] justify-self-center w-full " : ""
                }${
                  selected ? "border-[#4A9BD9] bg-[#EBF5FB] text-[#2e6f9f]" : "border-gray-100 bg-white text-gray-800"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="px-6 py-4 shrink-0 border-t border-gray-100">
        <button
          data-testid="button-price-next"
          disabled={!selectedPrice}
          onClick={() => {
            const priceLabel = PRICE_OPTIONS.find((p) => p.key === selectedPrice)?.label ?? "Qualsiasi";
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

  if (phase === "preferences") return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className={`bg-white px-5 pb-5 ${embedded ? "pt-4" : "pt-12"}`}>
        <button
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
          className="w-full min-h-[140px] rounded-2xl bg-white border border-gray-100 px-3 py-3 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-[#4A9BD9]/20"
        />
      </div>
      <div className="px-6 py-4 shrink-0 border-t border-gray-100">
        <button
          data-testid="button-preferences-search"
          onClick={() => {
            const finalAnswers = {
              ...answers,
              prezzo: PRICE_OPTIONS.find((p) => p.key === selectedPrice)?.label ?? "Qualsiasi",
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
                <Sparkles size={14} className="text-[#4A9BD9]" />
                <p className="text-xs font-bold text-[#4A9BD9] uppercase tracking-wide">
                  {isAi ? "Suggeriti dall'AI · Torino" : "Suggeriti per te"}
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
            {sub && (
              <span className="text-xs bg-[#EBF5FB] text-[#4A9BD9] font-semibold px-2.5 py-1 rounded-full">
                {sub.label}
              </span>
            )}
            {answers.giorno && (
              <span className="text-xs bg-gray-100 text-gray-600 font-medium px-2.5 py-1 rounded-full">
                {answers.giorno}
              </span>
            )}
            {answers.mezzo && (
              <span className="text-xs bg-gray-100 text-gray-600 font-medium px-2.5 py-1 rounded-full">
                {answers.mezzo}
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

          {/* ── AI Venues ── */}
          {isAi && aiVenues.map((venue, i) => (
            <div
              key={`ai-${i}`}
              data-testid={`result-${i}`}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 pb-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                      style={{ background: "linear-gradient(135deg, #4A9BD9, #7CB9E8)" }}
                    >
                      {i + 1}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 leading-tight">{venue.name}</h3>
                      <p className="text-[11px] text-gray-400 truncate">{venue.address}</p>
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
                </div>

                {/* AI description bubble */}
                <div className="flex items-start gap-2 bg-gray-50 rounded-xl p-3">
                  <Sparkles size={12} className="text-[#4A9BD9] mt-0.5 shrink-0" />
                  <p className="text-xs text-gray-600 leading-relaxed">{venue.description}</p>
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
                  href={venue.safariUrl || venue.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid={`button-safari-${i}`}
                  className="flex flex-col items-center gap-1 py-3 text-gray-500 active:bg-gray-50 transition-colors"
                >
                  <ExternalLink size={15} />
                  <span className="text-[10px] font-semibold">Safari</span>
                </a>
                <a
                  href={venue.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid={`button-book-${i}`}
                  className="flex flex-col items-center gap-1 py-3 active:bg-blue-50 transition-colors"
                  style={{ color: "#4A9BD9" }}
                >
                  <CalendarPlus size={15} />
                  <span className="text-[10px] font-semibold">Prenota</span>
                </a>
              </div>
              {onCreateEvent && (
                <div className="border-t border-gray-100 px-4 py-3">
                  <button
                    data-testid={`toggle-select-event-${i}`}
                    onClick={() => toggleResultVenue({ name: venue.name, rating: venue.rating, distance: venue.address, discount: venue.priceRange })}
                    className="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all border-2"
                    style={selectedResultVenues.some((v) => v.name === venue.name)
                      ? { color: "#2e6f9f", borderColor: "#4A9BD9", background: "#EBF5FB" }
                      : { color: "#4b5563", borderColor: "#e5e7eb", background: "#fff" }}
                  >
                    <CheckCircle2 size={15} />
                    {selectedResultVenues.some((v) => v.name === venue.name) ? "Luogo selezionato" : "Seleziona luogo"}
                  </button>
                </div>
              )}
            </div>
          ))}

          {isAi && supplemental.map((venue, i) => (
            <div
              key={`supp-${venue.name}`}
              data-testid={`result-supplemental-${i}`}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
            >
              <div className="flex items-start justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ background: "linear-gradient(135deg, #4A9BD9, #7CB9E8)" }}>
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
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <MapPin size={11} />{venue.distance}
                </span>
              </div>
              {venue.reason && (
                <div className="flex items-start gap-2 bg-gray-50 rounded-xl p-3 mb-3">
                  <Sparkles size={12} className="text-[#4A9BD9] mt-0.5 shrink-0" />
                  <p className="text-xs text-gray-500 leading-relaxed">{venue.reason}</p>
                </div>
              )}
              {onCreateEvent && (
                <button
                  data-testid={`toggle-select-supplemental-${i}`}
                  onClick={() => toggleResultVenue(venue)}
                  className="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all border-2"
                  style={selectedResultVenues.some((v) => v.name === venue.name)
                    ? { color: "#2e6f9f", borderColor: "#4A9BD9", background: "#EBF5FB" }
                    : { color: "#4b5563", borderColor: "#e5e7eb", background: "#fff" }}
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
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ background: "linear-gradient(135deg, #4A9BD9, #7CB9E8)" }}
                  >
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
                  <MapPin size={11} />{venue.distance}
                </span>
              </div>
              {venue.reason && (
                <div className="flex items-start gap-2 bg-gray-50 rounded-xl p-3 mb-3">
                  <Sparkles size={12} className="text-[#4A9BD9] mt-0.5 shrink-0" />
                  <p className="text-xs text-gray-500 leading-relaxed">{venue.reason}</p>
                </div>
              )}
              {onCreateEvent && (
                <button
                  data-testid={`toggle-select-fallback-${i}`}
                  onClick={() => toggleResultVenue(venue)}
                  className="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all border-2"
                  style={selectedResultVenues.some((v) => v.name === venue.name)
                    ? { color: "#2e6f9f", borderColor: "#4A9BD9", background: "#EBF5FB" }
                    : { color: "#4b5563", borderColor: "#e5e7eb", background: "#fff" }}
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
              <button onClick={reset} className="mt-4 px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: "#4A9BD9" }}>
                Riprova
              </button>
            </div>
          )}
        </div>
        {onCreateEvent && selectedResultVenues.length > 0 && (
          <div className="px-4 pb-5">
            <button
              data-testid="button-create-event-from-selected"
              onClick={() => onCreateEvent(selectedResultVenues)}
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
