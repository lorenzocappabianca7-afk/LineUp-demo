import { useState, useMemo, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Star, MapPin, Tag, ChevronRight, ChevronLeft, Users, User, Search, UtensilsCrossed, Landmark, Dumbbell, Ticket, Gamepad2, PenLine, ArrowLeft, Plus, X, MessageCircle, Sunrise, Sun, Sunset, Moon, Coffee, Link2, Copy, Check } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  CONTACTS, GROUPS, ACTIVITIES, VENUES_BY_ACTIVITY,
  getCurrentUser, getAvatarColor, getInitials, getMyContacts, getEventChatInviteUrl, venuePollSubtitle, type VenueOption, type ScopriToCreatePrefill
} from "@/lib/appUtils";
import { PLAN_CATEGORIES, PLAN_SUBCATEGORIES, venuePoolKeyForPlanSubcategory } from "@/lib/planCategories";
import { VenueExternalLinks } from "@/components/VenueExternalLinks";
import { SurveyModePicker } from "@/components/SurveyModePicker";
import { PianificaStepGuide } from "@/components/PianificaStepGuide";
import {
  PianificaPreviewCompletion,
  type PreviewProfile,
} from "@/components/PianificaPreviewCompletion";
import { getPianificaPreviewGuide, type PreviewGuideId } from "@/lib/pianificaPreviewGuides";
import {
  DEFAULT_SURVEY_MODE,
  recommendSurveyModeFromPlanning,
  type SurveyModeId,
} from "@shared/surveyModes";


/* ─── Fasce orarie selezionabili (opzionali) ─── */
const TIME_WINDOWS: Array<{ key: string; label: string; Icon: any }> = [
  { key: "mattina",          label: "Mattina",          Icon: Sunrise },
  { key: "tarda-mattinata",  label: "Tarda mattinata",  Icon: Sunrise },
  { key: "pranzo",           label: "Ora di pranzo",    Icon: Coffee },
  { key: "primo-pomeriggio", label: "Primo pomeriggio", Icon: Sun },
  { key: "pomeriggio",       label: "Pomeriggio",       Icon: Sun },
  { key: "cena",             label: "Ora di cena",      Icon: Sunset },
  { key: "sera",             label: "Sera",             Icon: Moon },
  { key: "sera-tardi",       label: "Sera tardi",       Icon: Moon },
];

interface AppCreateEventProps {
  onClose: () => void;
  /** Se presente, il wizard salta scelta di categoria, sottocategoria e luoghi (già definiti in Scopri AI). */
  fromScopri?: ScopriToCreatePrefill;
  /** Pagina / QR prova: dopo la creazione niente chat e niente link invito. */
  previewMode?: boolean;
  /** Nome e email raccolti in gate demo (per feedback finale). */
  previewProfile?: PreviewProfile;
}

export default function AppCreateEvent({
  onClose,
  fromScopri,
  previewMode,
  previewProfile,
}: AppCreateEventProps) {
  const fromScopriFlow = Boolean(fromScopri && fromScopri.venues.length > 0);

  const renderPreviewGuide = (id: PreviewGuideId) => {
    if (!previewMode) return null;
    const guide = getPianificaPreviewGuide(id, fromScopriFlow);
    return <PianificaStepGuide {...guide} />;
  };
  const [surveyMode, setSurveyMode] = useState<SurveyModeId>(DEFAULT_SURVEY_MODE);
  const [step, setStep] = useState(0);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedTimeWindows, setSelectedTimeWindows] = useState<string[]>([]);
  const [dayTimeIdx, setDayTimeIdx] = useState<Record<string, number>>({});
  const [selectedDayTimes, setSelectedDayTimes] = useState<Record<string, string[]>>({});
  const [selectedVenues, setSelectedVenues] = useState<VenueOption[]>(() => fromScopri?.venues ?? []);
  const [isDirectPlan, setIsDirectPlan] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(() =>
    fromScopri ? fromScopri.categoryKey : null,
  );
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>(() =>
    fromScopri ? [fromScopri.subcategoryLabel] : [],
  );
  const [venueSearch, setVenueSearch] = useState("");
  const [aiVenueSuggestions, setAiVenueSuggestions] = useState<VenueOption[]>([]);
  const [aiVenueLoading, setAiVenueLoading] = useState(false);
  const [aiVenueRefining, setAiVenueRefining] = useState(false);
  const [aiVenueError, setAiVenueError] = useState<string | null>(null);
  const aiSearchAbortRef = useRef<AbortController | null>(null);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customSubcategory, setCustomSubcategory] = useState("");
  const [done, setDone] = useState(false);
  const [createdEventId, setCreatedEventId] = useState<number | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [calMonth, setCalMonth] = useState(() => new Date());
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const currentUser = getCurrentUser();

  const { data: friendsRes } = useQuery<{ friends: string[] }>({
    queryKey: ["/api/app/friends", currentUser],
    queryFn: async () => {
      const r = await fetch(`/api/app/friends/${encodeURIComponent(currentUser)}`);
      if (!r.ok) return { friends: [] };
      return r.json();
    },
  });
  const friendsList = friendsRes?.friends ?? [];

  const inviteEventUrl = useMemo(
    () => getEventChatInviteUrl(createdEventId ?? 0),
    [createdEventId],
  );

  const copyInviteLink = async () => {
    if (!inviteEventUrl) return;
    try {
      await navigator.clipboard.writeText(inviteEventUrl);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    } catch {
      toast({ title: "Impossibile copiare", description: "Seleziona il link e copialo manualmente.", variant: "destructive" });
    }
  };

  const idxToTime = (i: number) => {
    const h = Math.floor(i / 4);
    const m = (i % 4) * 15;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const { mutate: createEvent, isPending } = useMutation({
    mutationFn: async () => {
      const participants = [currentUser, ...(selectedGroup
        ? [selectedGroup]
        : selectedContacts
      )];
      const activityKey = selectedSubcategories.map(s => s.toLowerCase()).join("/");
      const title = selectedSubcategories.join(" / ");
      const dayTimesFlat = Object.entries(selectedDayTimes).flatMap(([day, times]) =>
        times.map(t => `${day} · ${t}`),
      );
      const mergedTimeOptions = [...selectedTimeWindows, ...dayTimesFlat];
      const confirmedDate = selectedDates[0] || null;
      const confirmedTime = mergedTimeOptions[0] || null;
      const confirmedVenue = selectedVenues[0]?.name || null;
      const res = await apiRequest("POST", "/api/app/events", {
        activity: activityKey,
        title,
        createdBy: currentUser,
        participants,
        dateOptions: selectedDates,
        timeOptions: mergedTimeOptions,
        venueOptions: selectedVenues,
        status: isDirectPlan && confirmedDate && confirmedTime && confirmedVenue ? "confirmed" : "planning",
        confirmedDate,
        confirmedTime,
        confirmedVenue,
        surveyMode,
      });
      return res.json();
    },
    onSuccess: (data: { id: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/app/events"] });
      setCreatedEventId(data.id);
      setDone(true);
    },
    onError: () => {
      toast({ title: "Errore nella creazione", variant: "destructive" });
    },
  });

  const toggleContact = (name: string) => {
    setSelectedGroup(null);
    setSelectedContacts(prev =>
      prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]
    );
  };

  const canProceed0 = selectedContacts.length > 0 || selectedGroup !== null;
  const canProceed1 = selectedSubcategories.length > 0;
  const canProceed2 = true; // date opzionali
  const canProceed3 = true; // fasce orarie opzionali
  const canProceed4 = true; // orari per giorno opzionali
  const canProceed5 = true;

  const groupLabel = selectedGroup ?? (
    selectedContacts.length === 1 ? selectedContacts[0] :
    selectedContacts.length > 1 ? `${selectedContacts[0]} +${selectedContacts.length - 1}` : ""
  );

  const timeOptionCount = useMemo(() => {
    const fromDays = Object.values(selectedDayTimes).reduce((n, arr) => n + arr.length, 0);
    return selectedTimeWindows.length + fromDays;
  }, [selectedTimeWindows, selectedDayTimes]);

  const surveyRecommendation = useMemo(
    () =>
      recommendSurveyModeFromPlanning({
        isDirectPlan,
        fromScopriFlow,
        dateCount: selectedDates.length,
        timeOptionCount,
        venueCount: selectedVenues.length,
      }),
    [isDirectPlan, fromScopriFlow, selectedDates.length, timeOptionCount, selectedVenues.length],
  );

  const venueKeys = selectedSubcategories
    .map((s) => venuePoolKeyForPlanSubcategory(s))
    .filter((k): k is string => Boolean(k));
  const allVenues =
    venueKeys.length === 0
      ? []
      : venueKeys.flatMap((k) => VENUES_BY_ACTIVITY[k] ?? VENUES_BY_ACTIVITY.altro);
  const activityVenues = venueSearch.trim()
    ? allVenues.filter(v => v.name.toLowerCase().includes(venueSearch.toLowerCase()))
    : allVenues;

  const catLabelForBanner = PLAN_CATEGORIES.find(c => c.key === selectedCategory)?.label ?? "";

  const toggleSubcategory = (sub: string) => {
    setSelectedSubcategories(prev =>
      prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]
    );
  };

  const toggleVenue = (venue: VenueOption) => {
    setSelectedVenues(prev =>
      prev.some(v => v.name === venue.name)
        ? prev.filter(v => v.name !== venue.name)
        : [...prev, venue]
    );
  };

  useEffect(() => {
    if (step !== 5) {
      aiSearchAbortRef.current?.abort();
      setAiVenueSuggestions([]);
      setAiVenueLoading(false);
      setAiVenueRefining(false);
      setAiVenueError(null);
    }
  }, [step]);

  useEffect(() => {
    if (step !== 5 || done || fromScopriFlow) return;
    const q = venueSearch.trim();
    if (q.length < 2) {
      aiSearchAbortRef.current?.abort();
      setAiVenueSuggestions([]);
      setAiVenueLoading(false);
      setAiVenueRefining(false);
      setAiVenueError(null);
      return;
    }
    const timer = setTimeout(() => {
      aiSearchAbortRef.current?.abort();
      const ac = new AbortController();
      aiSearchAbortRef.current = ac;
      setAiVenueLoading(true);
      setAiVenueRefining(false);
      setAiVenueError(null);
      void (async () => {
        const AI_DEADLINE_MS = 5500;
        let timedOut = false;
        let quickCount = 0;
        const deadline = window.setTimeout(() => {
          timedOut = true;
          ac.abort();
        }, AI_DEADLINE_MS);

        try {
          const quickRes = await fetch(
            `/api/app/venues/quick-search?q=${encodeURIComponent(q)}`,
            { signal: ac.signal },
          );
          if (quickRes.ok) {
            const quickData = (await quickRes.json()) as { venues?: VenueOption[] };
            const quickVenues = quickData.venues ?? [];
            quickCount = quickVenues.length;
            if (!ac.signal.aborted && quickVenues.length > 0) {
              setAiVenueSuggestions(quickVenues);
              setAiVenueLoading(false);
              setAiVenueRefining(true);
            }
          }
        } catch {
          /* anteprima catalogo opzionale */
        }

        try {
          const r = await fetch("/api/app/venues/ai-search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: q }),
            signal: ac.signal,
          });
          const rawText = await r.text();
          let data: { venues?: VenueOption[]; message?: string };
          try {
            data = JSON.parse(rawText) as { venues?: VenueOption[]; message?: string };
          } catch {
            throw new Error(
              "Il server ha inviato una risposta non JSON (spesso pagina HTML). Riavvia il terminale con cd lineup-project && npm run dev e ricarica la pagina.",
            );
          }
          if (!r.ok) throw new Error(data?.message || "Ricerca non riuscita");
          if (!ac.signal.aborted) setAiVenueSuggestions(data.venues ?? []);
        } catch (e: unknown) {
          const aborted =
            (e instanceof DOMException && e.name === "AbortError") ||
            (e instanceof Error && e.name === "AbortError");
          if (aborted) {
            if (timedOut && quickCount === 0) {
              setAiVenueError("Ricerca lenta: prova un altro termine o scegli dalla lista sotto.");
              setAiVenueSuggestions([]);
            }
            return;
          }
          if (!ac.signal.aborted) {
            setAiVenueError(e instanceof Error ? e.message : "Errore ricerca");
            if (quickCount === 0) setAiVenueSuggestions([]);
          }
        } finally {
          window.clearTimeout(deadline);
          if (!ac.signal.aborted) {
            setAiVenueLoading(false);
            setAiVenueRefining(false);
          }
        }
      })();
    }, 180);
    return () => clearTimeout(timer);
  }, [venueSearch, step, done, fromScopriFlow]);

  // Step 0: Chi — demo contacts + contatti importati (senza duplicati)
  const importedContacts = getMyContacts();
  const importedNames = importedContacts
    .map(c => c.name)
    .filter(n => !CONTACTS.includes(n) && n !== currentUser);
  const allContactNames = [...CONTACTS, ...importedNames].filter(
    (name, index, arr) => arr.indexOf(name) === index,
  );

  const sortedContacts = [...allContactNames].sort((a, b) => a.localeCompare(b, "it"));

  const invitePoolForIndividuals =
    friendsList.length > 0
      ? sortedContacts.filter((n) => friendsList.includes(n))
      : sortedContacts;

  const sortedGroups = [...GROUPS].sort((a, b) => a.name.localeCompare(b.name, "it"));

  if (step === 0) return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain no-scrollbar">
        {renderPreviewGuide("step0")}
        {fromScopriFlow && (
          <p className="text-xs text-primary font-semibold px-6 pt-1 leading-relaxed">
            {selectedSubcategories.join(", ")} · {selectedVenues.length}{" "}
            {selectedVenues.length === 1 ? "luogo già scelto" : "luoghi già scelti"} con Scopri AI. Indica chi vuoi invitare.
          </p>
        )}
        {friendsList.length > 0 && (
          <p className="text-[11px] text-gray-500 px-6 pt-2 leading-snug">
            Puoi invitare solo i tuoi <span className="font-bold text-primary">friends</span>. Aggiungili o modificali dal{" "}
            <span className="font-semibold text-gray-700">Profilo</span>.
          </p>
        )}
        <div className="px-6 py-3">
        {sortedGroups.length > 0 && (
          <>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Gruppi</p>
            <div className="space-y-2 mb-5">
              {sortedGroups.map(g => (
                <button
                  key={g.name}
                  data-testid={`group-${g.name}`}
                  onClick={() => { setSelectedGroup(selectedGroup === g.name ? null : g.name); setSelectedContacts([]); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl border-2 transition-all ${
                    selectedGroup === g.name
                      ? "border-primary bg-primary/10"
                      : "border-gray-100 bg-white"
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <Users size={15} className="text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 text-sm">{g.name}</p>
                    <p className="text-xs text-gray-400">{g.count} persone</p>
                  </div>
                  {selectedGroup === g.name && (
                    <CheckCircle2 size={16} className="text-primary ml-auto" />
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {invitePoolForIndividuals.length > 0 && (
          <>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Contatti</p>
            <div className="space-y-2">
              {invitePoolForIndividuals.map(name => {
                const isImported = importedNames.includes(name);
                const importedEntry = importedContacts.find(c => c.name === name);
                return (
                  <button
                    key={name}
                    data-testid={`contact-${name}`}
                    onClick={() => toggleContact(name)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl border-2 transition-all ${
                      selectedContacts.includes(name)
                        ? "border-primary bg-primary/10"
                        : "border-gray-100 bg-white"
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ backgroundColor: getAvatarColor(name) }}
                    >
                      {getInitials(name)}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <span className="font-medium text-gray-900 text-sm">{name}</span>
                      {isImported && importedEntry?.phone && (
                        <p className="text-[11px] text-gray-400">{importedEntry.phone}</p>
                      )}
                    </div>
                    {selectedContacts.includes(name)
                      ? <CheckCircle2 size={16} className="text-primary ml-auto shrink-0" />
                      : isImported
                        ? <span className="text-[10px] text-gray-300 font-medium shrink-0">mio contatto</span>
                        : null
                    }
                  </button>
                );
              })}
            </div>
          </>
        )}

        {sortedGroups.length === 0 && invitePoolForIndividuals.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">Nessun gruppo o contatto disponibile.</p>
        )}
        </div>
      </div>

      <div className="shrink-0 border-t border-gray-100 px-6 py-4">
        <button
          data-testid="button-step-0-next"
          onClick={() => setStep(fromScopriFlow ? 2 : 1)}
          disabled={!canProceed0}
          className="w-full py-3.5 rounded-xl font-semibold text-white bg-black transition-opacity disabled:opacity-40"
        >
          Continua{canProceed0 ? ` con ${groupLabel}` : ""}
        </button>
      </div>
    </div>
  );

  // Step 1: Cosa
  if (step === 1) return (
    <div className="flex h-full min-h-0 flex-col">

      {/* ── Vista categorie ── */}
      {!selectedCategory && (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain no-scrollbar">
            {renderPreviewGuide("step1-category")}
            <div className="px-5 pt-4 pb-3">
            <p className="text-sm text-gray-500 mb-4">Scegli una categoria per la tua proposta di attività.</p>
            <div className="grid grid-cols-5 gap-2">
              {PLAN_CATEGORIES.map(({ key, label, Icon, cols, radius }) => (
                <button
                  key={key}
                  data-testid={`category-${key}`}
                  onClick={() => { setSelectedCategory(key); setShowCustomInput(false); setCustomSubcategory(""); }}
                  style={{ gridColumn: `span ${cols}`, borderRadius: radius, height: cols >= 3 ? "108px" : cols === 1 ? "80px" : "88px" }}
                  className="flex flex-col items-center justify-center gap-2 bg-primary/10 text-black hover:bg-primary/15 transition-all active:scale-95"
                >
                  <Icon size={cols >= 3 ? 28 : 22} strokeWidth={1.6} />
                  <span className="text-xs font-semibold tracking-wide">{label}</span>
                </button>
              ))}
            </div>
            </div>
          </div>
          <div className="shrink-0 border-t border-gray-100 px-6 py-4">
            <button
              onClick={() => {
                setSelectedCategory(null);
                setSelectedSubcategories([]);
                setShowCustomInput(false);
                setCustomSubcategory("");
                setStep(0);
              }}
              className="w-full py-3.5 rounded-xl font-semibold text-gray-600 bg-gray-100"
            >
              Indietro
            </button>
          </div>
        </>
      )}

      {/* ── Vista sottocategorie ── */}
      {selectedCategory && (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain no-scrollbar">
            {renderPreviewGuide("step1-sub")}
            <div className="px-5 pt-4 pb-3">
            {/* Header con categoria selezionata */}
            <button
              onClick={() => { setSelectedCategory(null); setShowCustomInput(false); setCustomSubcategory(""); }}
              className="flex items-center gap-2 mb-4 text-sm font-semibold text-gray-500 hover:text-black transition-colors"
            >
              <ArrowLeft size={16} />
              {PLAN_CATEGORIES.find(c => c.key === selectedCategory)?.label}
            </button>

            <p className="text-sm text-gray-500 mb-3">Scegli una sottocategoria.</p>

            {/* Pillole sottocategorie */}
            <div className="flex flex-wrap gap-2">
              {(PLAN_SUBCATEGORIES[selectedCategory] ?? []).map(sub => (
                <button
                  key={sub}
                  data-testid={`subcategory-${sub}`}
                  onClick={() => toggleSubcategory(sub)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all active:scale-95 ${
                    selectedSubcategories.includes(sub)
                      ? "bg-black text-white"
                      : "bg-primary/10 text-black hover:bg-gray-200"
                  }`}
                >
                  {sub}
                </button>
              ))}

              {/* Bottone Altro */}
              {!showCustomInput && (
                <button
                  data-testid="subcategory-altro"
                  onClick={() => setShowCustomInput(true)}
                  className="px-4 py-2 rounded-full border-2 border-dashed border-gray-300 text-gray-500 text-sm font-medium flex items-center gap-1.5 hover:border-black hover:text-black transition-all"
                >
                  <PenLine size={13} />
                  Altro
                </button>
              )}
            </div>

            {/* Input personalizzato */}
            {showCustomInput && (
              <div className="mt-4 flex gap-2">
                <input
                  autoFocus
                  value={customSubcategory}
                  onChange={e => setCustomSubcategory(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && customSubcategory.trim()) { toggleSubcategory(customSubcategory.trim()); setCustomSubcategory(""); } }}
                  placeholder="Scrivi la tua attività…"
                  className="flex-1 px-4 py-2 rounded-xl bg-gray-100 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  onClick={() => { if (customSubcategory.trim()) { toggleSubcategory(customSubcategory.trim()); setCustomSubcategory(""); } }}
                  disabled={!customSubcategory.trim()}
                  className="px-4 py-2 rounded-xl bg-black text-white text-sm font-semibold disabled:opacity-40 transition-opacity"
                >
                  Ok
                </button>
              </div>
            )}
            </div>
          </div>

          {/* Footer sottocategorie */}
          <div className="flex shrink-0 gap-3 border-t border-gray-100 px-6 py-4">
            <button
              onClick={() => { setSelectedCategory(null); setSelectedSubcategories([]); setShowCustomInput(false); setCustomSubcategory(""); }}
              className="px-5 py-3.5 rounded-xl font-semibold text-gray-600 bg-gray-100"
            >
              Indietro
            </button>
            <button
              data-testid="button-step-1-next"
              onClick={() => setStep(2)}
              disabled={!canProceed1}
              className="flex-1 py-3.5 rounded-xl font-semibold text-white bg-black transition-opacity disabled:opacity-40"
            >
              Continua
            </button>
          </div>
        </>
      )}

    </div>
  );

  // Step 2: Quando — calendario (solo giorni)
  if (step === 2) {
    const MONTHS_IT = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
    const WEEK_HEADERS = ["L","M","M","G","V","S","D"];
    const today = new Date();
    const yr = calMonth.getFullYear();
    const mo = calMonth.getMonth();
    const firstDow = (new Date(yr, mo, 1).getDay() + 6) % 7; // Monday-first
    const daysInMo = new Date(yr, mo + 1, 0).getDate();
    const cells = Array.from({ length: Math.ceil((firstDow + daysInMo) / 7) * 7 }, (_, i) => {
      const day = i - firstDow + 1;
      return (day >= 1 && day <= daysInMo) ? day : null;
    });

    const toggleDay = (day: number) => {
      const d = new Date(yr, mo, day);
      const isPast = d < new Date(today.getFullYear(), today.getMonth(), today.getDate());
      if (isPast) return;
      const D = ["Dom","Lun","Mar","Mer","Gio","Ven","Sab"];
      const label = `${D[d.getDay()]} ${day}`;
      setSelectedDates(prev => {
        const exists = prev.includes(label);
        const next = exists ? prev.filter(x => x !== label) : [...prev, label];
        if (exists) {
          setSelectedDayTimes((m) => {
            const copy = { ...m };
            delete copy[label];
            return copy;
          });
          setDayTimeIdx((m) => {
            const copy = { ...m };
            delete copy[label];
            return copy;
          });
        }
        return next;
      });
    };

    const isDaySelected = (day: number) => {
      const d = new Date(yr, mo, day);
      const D = ["Dom","Lun","Mar","Mer","Gio","Ven","Sab"];
      return selectedDates.includes(`${D[d.getDay()]} ${day}`);
    };

    const isPastDay = (day: number) => {
      const d = new Date(yr, mo, day);
      return d < new Date(today.getFullYear(), today.getMonth(), today.getDate());
    };

    const isToday = (day: number) => yr === today.getFullYear() && mo === today.getMonth() && day === today.getDate();

    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain no-scrollbar">
          {renderPreviewGuide("step2")}

          {/* Navigazione mese */}
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <button
              onClick={() => setCalMonth(new Date(yr, mo - 1, 1))}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft size={18} className="text-gray-500" />
            </button>
            <span className="text-sm font-bold text-gray-900">{MONTHS_IT[mo]} {yr}</span>
            <button
              onClick={() => setCalMonth(new Date(yr, mo + 1, 1))}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              <ChevronRight size={18} className="text-gray-500" />
            </button>
          </div>

          {/* Intestazioni giorni */}
          <div className="grid grid-cols-7 px-3 mb-1">
            {WEEK_HEADERS.map((h, i) => (
              <div key={i} className="text-center text-[11px] font-semibold text-gray-400 py-1">{h}</div>
            ))}
          </div>

          {/* Griglia giorni */}
          <div className="grid grid-cols-7 px-3 gap-y-1">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const selected = isDaySelected(day);
              const past = isPastDay(day);
              const tod = isToday(day);
              return (
                <button
                  key={i}
                  data-testid={`cal-day-${day}`}
                  onClick={() => toggleDay(day)}
                  disabled={past}
                  className={`mx-auto flex items-center justify-center w-9 h-9 rounded-full text-sm font-medium transition-all
                    ${past ? "text-gray-300 cursor-default" :
                      selected ? "bg-black text-white" :
                      tod ? "ring-2 ring-black text-black" :
                      "text-gray-800 hover:bg-gray-100"}`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="h-6" />
        </div>

        <div className="px-6 py-4 shrink-0 border-t border-gray-100 flex gap-3">
          <button
            onClick={() => { setSelectedDates([]); setSelectedTimeWindows([]); setSelectedDayTimes({}); setDayTimeIdx({}); setStep(fromScopriFlow ? 0 : 1); }}
            className="px-5 py-3.5 rounded-xl font-semibold text-gray-600 bg-gray-100"
          >
            Indietro
          </button>
          <button
            data-testid="button-step-2-next"
            onClick={() => setStep(3)}
            disabled={!canProceed2}
            className="flex-1 py-3.5 rounded-xl font-semibold text-white bg-black transition-opacity disabled:opacity-40"
          >
            {selectedDates.length > 0 ? "Continua" : "Continua senza date"}
          </button>
        </div>
      </div>
    );
  }

  // Step 3: Fascia oraria (opzionale)
  if (step === 3 && !done) {
    const toggleWindow = (label: string) => {
      setSelectedTimeWindows(prev => (prev.includes(label) ? prev.filter(t => t !== label) : [...prev, label]));
    };

    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pt-4 pb-2 no-scrollbar">
          {renderPreviewGuide("step3")}
          <p className="text-sm text-gray-500 mb-4">
            Vuoi indicare una fascia oraria? Puoi anche saltare.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {TIME_WINDOWS.map(({ key, label, Icon }) => {
              const sel = selectedTimeWindows.includes(label);
              return (
                <button
                  key={key}
                  data-testid={`time-window-${key}`}
                  onClick={() => toggleWindow(label)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.99] ${
                    sel ? "border-primary bg-primary/10" : "border-gray-100 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      sel ? "bg-primary text-white" : "bg-gray-100 text-gray-500"
                    }`}>
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 text-sm leading-tight">{label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {sel ? "Selezionata" : "Opzionale"}
                      </p>
                    </div>
                    {sel && <CheckCircle2 size={18} className="text-primary ml-auto shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-6 py-4 shrink-0 border-t border-gray-100 flex gap-3">
          <button
            onClick={() => setStep(2)}
            className="px-5 py-3.5 rounded-xl font-semibold text-gray-600 bg-gray-100"
          >
            Indietro
          </button>
          <button
            data-testid="button-step-3-next"
            onClick={() => setStep(selectedDates.length > 0 ? 4 : 5)}
            disabled={!canProceed3}
            className="flex-1 py-3.5 rounded-xl font-semibold text-white bg-black transition-opacity disabled:opacity-40"
          >
            {selectedTimeWindows.length > 0 ? "Continua" : "Continua senza fasce orarie"}
          </button>
        </div>
      </div>
    );
  }

  // Step 4: Orari per giorno (opzionale)
  if (step === 4 && !done) {
    const anyTimes = Object.values(selectedDayTimes).some((arr) => (arr?.length ?? 0) > 0);

    const setIdxForDay = (day: string, idx: number) => {
      setDayTimeIdx((m) => ({ ...m, [day]: idx }));
    };

    const addTimeForDay = (day: string) => {
      const idx = dayTimeIdx[day] ?? 72;
      const t = idxToTime(idx);
      setSelectedDayTimes((m) => {
        const existing = m[day] ?? [];
        if (existing.includes(t)) return m;
        return { ...m, [day]: [...existing, t] };
      });
    };

    const removeTimeForDay = (day: string, t: string) => {
      setSelectedDayTimes((m) => {
        const existing = m[day] ?? [];
        const next = existing.filter((x) => x !== t);
        const copy = { ...m };
        if (next.length === 0) delete copy[day];
        else copy[day] = next;
        return copy;
      });
    };

    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-6 pt-4 pb-2 no-scrollbar">
          {renderPreviewGuide("step4")}
          <p className="text-sm text-gray-500">
            Vuoi indicare un orario per i giorni selezionati? Puoi anche saltare.
          </p>

          {selectedDates.map((day) => {
            const idx = dayTimeIdx[day] ?? 72;
            const times = selectedDayTimes[day] ?? [];
            const current = idxToTime(idx);
            return (
              <div key={day} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Giorno</p>
                    <p className="font-bold text-gray-900">{day}</p>
                  </div>
                  <button
                    data-testid={`button-add-time-${day}`}
                    onClick={() => addTimeForDay(day)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/75"
                    title="Aggiungi orario"
                  >
                    <Plus size={18} className="text-primary-foreground" strokeWidth={2.5} />
                  </button>
                </div>

                <div className="px-4 pt-4 pb-4">
                  <div className="rounded-2xl bg-gray-50 border border-gray-100 px-4 pt-4 pb-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Orario</span>
                      <span className="text-lg font-bold text-gray-900">{current}</span>
                    </div>
                    <input
                      data-testid={`slider-time-${day}`}
                      type="range"
                      className="time-slider w-full"
                      min={0}
                      max={95}
                      step={1}
                      value={idx}
                      onChange={(e) => setIdxForDay(day, +e.target.value)}
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 mt-2">
                      <span>00:00</span><span>12:00</span><span>23:45</span>
                    </div>
                  </div>

                  {times.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {times.slice().sort().map((t) => (
                        <span
                          key={t}
                          className="flex items-center gap-1 text-xs font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-full"
                        >
                          {t}
                          <button
                            data-testid={`remove-time-${day}-${t}`}
                            onClick={() => removeTimeForDay(day, t)}
                            className="ml-0.5"
                          >
                            <X size={11} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-6 py-4 shrink-0 border-t border-gray-100 flex gap-3">
          <button
            onClick={() => setStep(3)}
            className="px-5 py-3.5 rounded-xl font-semibold text-gray-600 bg-gray-100"
          >
            Indietro
          </button>
          <button
            data-testid="button-step-4-next"
            onClick={() => setStep(5)}
            disabled={!canProceed4}
            className="flex-1 py-3.5 rounded-xl font-semibold text-white bg-black transition-opacity disabled:opacity-40"
          >
            {anyTimes ? "Continua" : "Continua senza orari"}
          </button>
        </div>
      </div>
    );
  }

  // Step 5: Dove (wizard normale) oppure riepilogo luoghi da Scopri AI
  if (step === 5 && !done) {
    const createFooter = (
      <div className="px-6 py-4 shrink-0 border-t border-gray-100 flex gap-3">
        <button
          type="button"
          onClick={() => {
            if (!fromScopriFlow) {
              setSelectedVenues([]);
              setVenueSearch("");
            }
            setStep(selectedDates.length > 0 ? 4 : 3);
          }}
          className="px-5 py-3.5 rounded-xl font-semibold text-gray-600 bg-gray-100"
        >
          Indietro
        </button>
        <div className="flex-1">
          <label className="mb-2 flex items-center gap-2 text-xs font-semibold text-gray-500">
            <input
              type="checkbox"
              checked={isDirectPlan}
              onChange={(e) => setIsDirectPlan(e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary/30"
            />
            Evento già definito (senza votazione)
          </label>
          <button
            data-testid="button-step-venue-to-survey"
            type="button"
            onClick={() => setStep(6)}
            disabled={!canProceed5}
            className="w-full rounded-xl bg-gradient-to-br from-primary to-primary/75 py-3.5 font-semibold text-primary-foreground transition-opacity active:opacity-80 disabled:opacity-40"
          >
            Tipo di sondaggio
          </button>
        </div>
      </div>
    );

    const banner = (
      <div className="mb-1 flex items-center gap-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 p-3">
        <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <MapPin size={16} className="text-primary" />
        </div>
        <div>
          <p className="text-xs font-bold text-primary">
            {selectedSubcategories.length > 0 ? selectedSubcategories.join(" / ") : "Dove"} · {catLabelForBanner} · {groupLabel}
          </p>
          <p className="text-xs text-gray-500">
            {selectedDates.slice(0, 2).join(" · ")}{selectedDates.length > 2 ? ` +${selectedDates.length - 2}` : ""}
          </p>
        </div>
      </div>
    );

    if (fromScopriFlow) {
      return (
        <div className="flex h-full min-h-0 flex-col">
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-6 pt-4 pb-2 no-scrollbar">
            {renderPreviewGuide("step5")}
            {banner}
            <p className="text-sm text-gray-500">
              Categoria e luoghi arrivano da Scopri AI. Puoi tornare indietro per modificare date e orari.
            </p>
            {selectedVenues.map((venue) => (
              <div
                key={venue.name}
                data-testid={`venue-scopri-summary-${venue.name}`}
                className="w-full p-4 rounded-2xl border-2 border-primary/30 bg-primary/10 text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-gray-900">{venue.name}</p>
                      <CheckCircle2 size={14} className="text-primary" />
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-0.5 text-xs text-amber-500 font-semibold">
                        <Star size={10} fill="currentColor" />
                        {venue.rating}
                      </span>
                      <span className="flex items-center gap-0.5 text-xs text-gray-400">
                        <MapPin size={10} />
                        {venuePollSubtitle(venue)}
                      </span>
                    </div>
                    <VenueExternalLinks venue={venue} className="mt-2" />
                  </div>
                  {venue.discount && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg shrink-0">
                      <Tag size={10} />
                      {venue.discount}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          {createFooter}
        </div>
      );
    }

    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-6 pt-4 pb-2 no-scrollbar">
          {renderPreviewGuide("step5")}
          {banner}

          {selectedVenues.some((v) => v.mapsUrl || v.websiteUrl || v.instagramUrl) && (
            <div className="rounded-xl border border-primary/25 bg-white px-3 py-2.5 space-y-2">
              <p className="text-[10px] font-bold text-primary uppercase tracking-wide">Link luoghi scelti</p>
              {selectedVenues
                .filter((v) => v.mapsUrl || v.websiteUrl || v.instagramUrl)
                .map((v) => (
                  <div key={v.name}>
                    <p className="text-[11px] font-semibold text-gray-700 truncate">{v.name}</p>
                    <VenueExternalLinks venue={v} compact className="mt-1.5" />
                  </div>
                ))}
            </div>
          )}

          {/* Ricerca */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              data-testid="input-venue-search"
              type="text"
              placeholder="Cerca a Torino (min. 2 caratteri)…"
              value={venueSearch}
              onChange={e => setVenueSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-gray-100 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {venueSearch.trim().length >= 2 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Suggerimenti a Torino</p>
              {aiVenueLoading && aiVenueSuggestions.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-3">Ricerca in corso…</p>
              )}
              {aiVenueRefining && (
                <p className="text-xs text-primary/80 text-center py-1">Affinamento suggerimenti…</p>
              )}
              {aiVenueError && !aiVenueLoading && (
                <p className="text-xs text-red-500 text-center py-1">{aiVenueError}</p>
              )}
              {!aiVenueLoading &&
                aiVenueSuggestions.map((venue) => {
                  const isVenueSelected = selectedVenues.some((v) => v.name === venue.name);
                  return (
                    <button
                      key={`ai-${venue.name}`}
                      type="button"
                      data-testid={`venue-ai-${venue.name}`}
                      onClick={() => toggleVenue(venue)}
                      className={`w-full p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.99] ${
                        isVenueSelected
                          ? "border-primary bg-primary/10"
                          : "border-gray-100 bg-white shadow-sm"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-semibold text-gray-900">{venue.name}</p>
                            {isVenueSelected && <CheckCircle2 size={14} className="text-primary shrink-0" />}
                          </div>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="flex items-center gap-0.5 text-xs text-amber-500 font-semibold">
                              <Star size={10} fill="currentColor" />
                              {venue.rating}
                            </span>
                            <span className="flex items-center gap-0.5 text-xs text-gray-500 min-w-0">
                              <MapPin size={10} className="shrink-0" />
                              <span className="truncate">{venuePollSubtitle(venue)}</span>
                            </span>
                          </div>
                          <VenueExternalLinks venue={venue} className="mt-2.5" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              {!aiVenueLoading &&
                venueSearch.trim().length >= 2 &&
                aiVenueSuggestions.length === 0 &&
                !aiVenueError && (
                  <p className="text-xs text-gray-400 text-center py-2">
                    Nessun risultato dall&apos;AI. Prova un altro nome o scegli dalla lista sotto.
                  </p>
                )}
            </div>
          )}

          <div
            className={
              venueSearch.trim().length >= 2 ? "pt-3 mt-1 border-t border-gray-100 space-y-2" : "space-y-2"
            }
          >
            {venueSearch.trim().length >= 2 && (
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Dalla tua categoria</p>
            )}
            {activityVenues.length === 0 && venueSearch.trim().length < 2 && (
              <p className="text-sm text-gray-400 text-center py-6">Nessun posto in lista per questa categoria</p>
            )}
            {activityVenues.length === 0 && venueSearch.trim().length >= 2 && (
              <p className="text-xs text-gray-400 text-center py-2">Nessuna corrispondenza nella lista locale.</p>
            )}

            {activityVenues.map((venue) => {
            const isVenueSelected = selectedVenues.some(v => v.name === venue.name);
            return (
            <button
              key={venue.name}
              type="button"
              data-testid={`venue-${venue.name}`}
              onClick={() => toggleVenue(venue)}
              className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
                isVenueSelected
                  ? "border-primary bg-primary/10"
                  : "border-gray-100 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-gray-900">{venue.name}</p>
                    {isVenueSelected && (
                      <CheckCircle2 size={14} className="text-primary" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-0.5 text-xs text-amber-500 font-semibold">
                      <Star size={10} fill="currentColor" />
                      {venue.rating}
                    </span>
                    <span className="flex items-center gap-0.5 text-xs text-gray-400">
                      <MapPin size={10} />
                      {venuePollSubtitle(venue)}
                    </span>
                  </div>
                  <VenueExternalLinks venue={venue} className="mt-2" />
                </div>
                {venue.discount && (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg shrink-0">
                    <Tag size={10} />
                    {venue.discount}
                  </span>
                )}
              </div>
            </button>
            );
          })}
          </div>
        </div>

        {createFooter}
      </div>
    );
  }

  // Step 6: tipo di sondaggio (dopo la scelta dei luoghi), poi creazione evento
  if (step === 6 && !done) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <SurveyModePicker
          guide={
            <>
              {renderPreviewGuide("step6")}
              <button
                type="button"
                onClick={() => setStep(5)}
                className="mx-5 mb-2 flex items-center gap-1.5 text-xs font-semibold text-blue-100 hover:text-white"
              >
                <ChevronLeft size={16} />
                Indietro ai luoghi
              </button>
            </>
          }
          value={surveyMode}
          onChange={setSurveyMode}
          onContinue={() => createEvent()}
          isSubmitting={isPending}
          recommendedId={surveyRecommendation.mode}
          recommendationReason={surveyRecommendation.reason}
          onApplyRecommendation={() => setSurveyMode(surveyRecommendation.mode)}
        />
      </div>
    );
  }

  // Success
  if (done) {
    if (previewMode) {
      return (
        <PianificaPreviewCompletion
          profile={previewProfile ?? { name: "", email: "" }}
          onClose={onClose}
        />
      );
    }

    return (
    <div className="flex flex-col items-stretch justify-start min-h-0 h-full py-6 px-4 text-center w-full max-w-md mx-auto overflow-y-auto no-scrollbar">
      <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mb-4 mx-auto shrink-0 animate-in zoom-in duration-300">
        <CheckCircle2 size={40} className="text-emerald-500" />
      </div>
      <h3 className="text-xl font-bold text-gray-900">Proposta di evento inviata!</h3>
      <p className="text-sm text-gray-600 mt-2 px-1">{groupLabel} riceverà la notifica per votare</p>

      {inviteEventUrl && (
        <div className="mt-6 text-left w-full min-w-0 rounded-2xl border border-gray-100 bg-gray-50/80 p-3 shrink-0">
          <div className="flex items-center gap-2 mb-1.5">
            <Link2 size={14} className="text-primary shrink-0" />
            <p className="text-xs font-bold text-gray-800">Link per LineUp</p>
          </div>
          <p className="text-[11px] text-gray-500 leading-snug mb-2">
            Copia e invia al gruppo: apre LineUp sull&apos;evento.
          </p>
          <div className="flex gap-2 items-stretch min-w-0">
            <input
              readOnly
              value={inviteEventUrl}
              className="flex-1 min-w-0 rounded-xl border border-gray-200 bg-white px-2.5 py-2 text-[11px] font-mono text-gray-700 outline-none"
              onFocus={(e) => e.target.select()}
            />
            <button
              type="button"
              data-testid="button-copy-invite-link"
              onClick={copyInviteLink}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-primary active:scale-[0.98]"
            >
              {inviteCopied ? <Check size={14} /> : <Copy size={14} />}
              {inviteCopied ? "Fatto" : "Copia"}
            </button>
          </div>
        </div>
      )}

      <p className="mt-5 text-xs text-center text-gray-400 px-2">
        Dopo la conferma, nella chat dell&apos;evento (tab Voto) potrai togliere dal calendario con il pulsante verde.
      </p>

      <button
        data-testid="button-close-success"
        type="button"
        onClick={() => {
          onClose();
          if (createdEventId) navigate(`/events/${createdEventId}/chat`);
        }}
        className="mt-6 flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-primary to-primary/75 px-8 py-3.5 font-semibold text-primary-foreground"
      >
        <MessageCircle size={18} />
        Vai alla chat
      </button>
    </div>
    );
  }

  return null;
}
