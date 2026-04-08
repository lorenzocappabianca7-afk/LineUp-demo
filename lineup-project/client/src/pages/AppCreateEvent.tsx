import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Star, MapPin, Tag, ChevronRight, ChevronLeft, Users, User, Search, UtensilsCrossed, Landmark, Dumbbell, Ticket, Gamepad2, PenLine, ArrowLeft, Plus, X, MessageCircle, Sunrise, Sun, Sunset, Moon, Coffee } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  CONTACTS, GROUPS, ACTIVITIES, VENUES_BY_ACTIVITY,
  getCurrentUser, getAvatarColor, getInitials, getMyContacts, type VenueOption, type ScopriToCreatePrefill
} from "@/lib/appUtils";


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
}

export default function AppCreateEvent({ onClose, fromScopri }: AppCreateEventProps) {
  const fromScopriFlow = Boolean(fromScopri && fromScopri.venues.length > 0);
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
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customSubcategory, setCustomSubcategory] = useState("");
  const [done, setDone] = useState(false);
  const [createdEventId, setCreatedEventId] = useState<number | null>(null);
  const [contactSearch, setContactSearch] = useState("");
  const [calMonth, setCalMonth] = useState(() => new Date());

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const currentUser = getCurrentUser();

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

  const SUBCATEGORY_TO_KEY: Record<string, string> = {
    aperitivo: "aperitivo", cena: "cena", colazione: "colazione",
    pranzo: "pranzo", spuntino: "spuntino",
    mostre: "mostre", musei: "musei",
    "arti marziali": "sport", basket: "sport", "beach volley": "sport",
    bici: "sport", calcio: "calcio", camminata: "sport", canoa: "sport",
    corsa: "sport", hockey: "sport", padel: "padel", palestra: "palestra",
    pallavolo: "sport", pattinaggio: "sport", "ping pong": "sport",
    piscina: "piscina", sci: "montagna", snowboard: "montagna", tennis: "tennis",
    concerti: "concerti", discoteche: "discoteche", festival: "festival",
    fiere: "fiere", teatro: "teatro",
    "giro in centro": "altro", "giornata al mare": "mare",
    mercatino: "fiere", passeggiata: "altro", uscita: "altro",
    "uscita in montagna": "montagna",
    arrampicata: "sport", skateboard: "sport", "skateboard park": "sport",
    "tiro con l'arco": "sport", "parchi per ciclismo": "sport",
    "cucina alta e innovazione": "cena",
    "cucina libanese": "cena",
    "cucina turca": "cena",
    "cucina cinese": "cena",
    "cucina sudamericana": "cena",
    "l aperitivo storico": "aperitivo",
    apericena: "aperitivo",
    "aperitivo alternativo": "aperitivo",
    "merenda sinoira": "aperitivo",
    "aperitivo popolare": "aperitivo",
    "aperitivo fusion": "aperitivo",
  };

  const firstActivity = selectedSubcategories[0]?.toLowerCase() ?? null;
  const venueKey = firstActivity ? (SUBCATEGORY_TO_KEY[firstActivity] ?? firstActivity) : null;
  const allVenues = venueKey ? (VENUES_BY_ACTIVITY[venueKey] ?? VENUES_BY_ACTIVITY.altro) : [];
  const activityVenues = venueSearch.trim()
    ? allVenues.filter(v => v.name.toLowerCase().includes(venueSearch.toLowerCase()))
    : allVenues;

  const CATEGORIES = [
    { key: "cibo",    label: "Cibo",    Icon: UtensilsCrossed, cols: 3, radius: "28px 10px 28px 10px" },
    { key: "cultura", label: "Cultura", Icon: Landmark,         cols: 2, radius: "10px 28px 10px 28px" },
    { key: "sport",   label: "Sport",   Icon: Dumbbell,         cols: 2, radius: "28px 10px 10px 28px" },
    { key: "eventi",  label: "Eventi",  Icon: Ticket,           cols: 1, radius: "10px 10px 28px 28px" },
    { key: "svago",   label: "Svago",   Icon: Gamepad2,         cols: 2, radius: "10px 28px 28px 10px" },
  ] as const;

  const catLabelForBanner = CATEGORIES.find(c => c.key === selectedCategory)?.label ?? "";

  const SUBCATEGORIES: Record<string, string[]> = {
    cibo:    [
      "Aperitivo", "Cena", "Colazione", "Pranzo", "Spuntino", "Brunch",
      "Cucina alta e innovazione", "Cucina libanese", "Cucina turca", "Cucina cinese", "Cucina sudamericana",
      "L aperitivo storico", "Apericena", "Aperitivo alternativo", "Merenda sinoira", "Aperitivo popolare", "Aperitivo fusion",
    ],
    cultura: ["Mostre", "Musei"],
    sport:   [
      "Arti marziali", "Basket", "Beach volley", "Bici", "Calcio", "Camminata", "Canoa", "Corsa", "Hockey",
      "Padel", "Palestra", "Pallavolo", "Pattinaggio", "Ping pong", "Piscina", "Sci", "Snowboard", "Tennis",
      "Arrampicata", "Skateboard", "Skateboard park", "Tiro con l'arco", "Parchi per ciclismo", "Nuoto",
    ],
    eventi:  ["Concerti", "Discoteche", "Festival", "Fiere", "Teatro"],
    svago:   ["Giro in centro", "Giornata al mare", "Mercatino", "Passeggiata", "Uscita", "Uscita in montagna"],
  };

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

  // Step 0: Chi — demo contacts + contatti importati (senza duplicati)
  const importedContacts = getMyContacts();
  const importedNames = importedContacts
    .map(c => c.name)
    .filter(n => !CONTACTS.includes(n) && n !== currentUser);
  const allContactNames = [...CONTACTS, ...importedNames].filter(
    (name, index, arr) => arr.indexOf(name) === index,
  );

  const filteredContacts = allContactNames
    .sort((a, b) => a.localeCompare(b, "it"))
    .filter(name => name.toLowerCase().includes(contactSearch.toLowerCase()));

  const filteredGroups = contactSearch.trim() === ""
    ? [...GROUPS].sort((a, b) => a.name.localeCompare(b.name, "it"))
    : [...GROUPS]
        .sort((a, b) => a.name.localeCompare(b.name, "it"))
        .filter(g => g.name.toLowerCase().includes(contactSearch.toLowerCase()));

  if (step === 0) return (
    <div className="flex flex-col h-full">
      {fromScopriFlow && (
        <p className="text-xs text-[#4A9BD9] font-semibold px-6 pt-3 leading-relaxed">
          {selectedSubcategories.join(", ")} · {selectedVenues.length}{" "}
          {selectedVenues.length === 1 ? "luogo già scelto" : "luoghi già scelti"} con Scopri AI. Indica chi vuoi invitare.
        </p>
      )}
      <div className="px-6 pt-3 pb-2 shrink-0">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            data-testid="input-contact-search"
            type="text"
            placeholder="Cerca contatti o gruppi..."
            value={contactSearch}
            onChange={e => setContactSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-gray-100 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#4A9BD9]/30"
          />
        </div>
      </div>

      <div className="px-6 py-3 flex-1 overflow-y-auto no-scrollbar min-h-0">
        {filteredGroups.length > 0 && (
          <>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Gruppi</p>
            <div className="space-y-2 mb-5">
              {filteredGroups.map(g => (
                <button
                  key={g.name}
                  data-testid={`group-${g.name}`}
                  onClick={() => { setSelectedGroup(selectedGroup === g.name ? null : g.name); setSelectedContacts([]); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl border-2 transition-all ${
                    selectedGroup === g.name
                      ? "border-[#4A9BD9] bg-[#EBF5FB]"
                      : "border-gray-100 bg-white"
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-[#4A9BD9] flex items-center justify-center shrink-0">
                    <Users size={15} className="text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 text-sm">{g.name}</p>
                    <p className="text-xs text-gray-400">{g.count} persone</p>
                  </div>
                  {selectedGroup === g.name && (
                    <CheckCircle2 size={16} className="text-[#4A9BD9] ml-auto" />
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {filteredContacts.length > 0 && (
          <>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Contatti</p>
            <div className="space-y-2">
              {filteredContacts.map(name => {
                const isImported = importedNames.includes(name);
                const importedEntry = importedContacts.find(c => c.name === name);
                return (
                  <button
                    key={name}
                    data-testid={`contact-${name}`}
                    onClick={() => toggleContact(name)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl border-2 transition-all ${
                      selectedContacts.includes(name)
                        ? "border-[#4A9BD9] bg-[#EBF5FB]"
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
                      ? <CheckCircle2 size={16} className="text-[#4A9BD9] ml-auto shrink-0" />
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

        {filteredGroups.length === 0 && filteredContacts.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">Nessun risultato per "{contactSearch}"</p>
        )}
      </div>

      <div className="px-6 py-4 shrink-0 border-t border-gray-100">
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
    <div className="flex flex-col h-full">

      {/* ── Vista categorie ── */}
      {!selectedCategory && (
        <>
          <div className="px-5 pt-4 pb-3 flex-1 overflow-y-auto no-scrollbar min-h-0">
            <p className="text-sm text-gray-500 mb-4">Scegli una categoria per la tua proposta di attività.</p>
            <div className="grid grid-cols-5 gap-2">
              {CATEGORIES.map(({ key, label, Icon, cols, radius }) => (
                <button
                  key={key}
                  data-testid={`category-${key}`}
                  onClick={() => { setSelectedCategory(key); setShowCustomInput(false); setCustomSubcategory(""); }}
                  style={{ gridColumn: `span ${cols}`, borderRadius: radius, height: cols >= 3 ? "108px" : cols === 1 ? "80px" : "88px" }}
                  className="flex flex-col items-center justify-center gap-2 bg-[#EBF5FB] text-black hover:bg-[#d6ecf7] transition-all active:scale-95"
                >
                  <Icon size={cols >= 3 ? 28 : 22} strokeWidth={1.6} />
                  <span className="text-xs font-semibold tracking-wide">{label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="px-6 py-4 shrink-0 border-t border-gray-100">
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
          <div className="px-5 pt-4 pb-3 flex-1 overflow-y-auto no-scrollbar min-h-0">
            {/* Header con categoria selezionata */}
            <button
              onClick={() => { setSelectedCategory(null); setShowCustomInput(false); setCustomSubcategory(""); }}
              className="flex items-center gap-2 mb-4 text-sm font-semibold text-gray-500 hover:text-black transition-colors"
            >
              <ArrowLeft size={16} />
              {CATEGORIES.find(c => c.key === selectedCategory)?.label}
            </button>

            <p className="text-sm text-gray-500 mb-3">Scegli una sottocategoria.</p>

            {/* Pillole sottocategorie */}
            <div className="flex flex-wrap gap-2">
              {(SUBCATEGORIES[selectedCategory] ?? []).map(sub => (
                <button
                  key={sub}
                  data-testid={`subcategory-${sub}`}
                  onClick={() => toggleSubcategory(sub)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all active:scale-95 ${
                    selectedSubcategories.includes(sub)
                      ? "bg-black text-white"
                      : "bg-[#EBF5FB] text-black hover:bg-gray-200"
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
                  className="flex-1 px-4 py-2 rounded-xl bg-gray-100 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[#4A9BD9]/30"
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

          {/* Footer sottocategorie */}
          <div className="px-6 py-4 shrink-0 border-t border-gray-100 flex gap-3">
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
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto no-scrollbar min-h-0">

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
      <div className="flex flex-col h-full">
        <div className="px-6 pt-4 pb-2 flex-1 overflow-y-auto no-scrollbar min-h-0">
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
                    sel ? "border-[#4A9BD9] bg-[#EBF5FB]" : "border-gray-100 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      sel ? "bg-[#4A9BD9] text-white" : "bg-gray-100 text-gray-500"
                    }`}>
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 text-sm leading-tight">{label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {sel ? "Selezionata" : "Opzionale"}
                      </p>
                    </div>
                    {sel && <CheckCircle2 size={18} className="text-[#4A9BD9] ml-auto shrink-0" />}
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
      <div className="flex flex-col h-full">
        <div className="px-6 pt-4 pb-2 flex-1 overflow-y-auto no-scrollbar min-h-0 space-y-3">
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
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "linear-gradient(135deg, #4A9BD9, #7CB9E8)" }}
                    title="Aggiungi orario"
                  >
                    <Plus size={18} className="text-white" strokeWidth={2.5} />
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
                          className="flex items-center gap-1 text-xs font-semibold bg-[#EBF5FB] text-[#4A9BD9] px-2.5 py-1 rounded-full"
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
              className="rounded border-gray-300 text-[#4A9BD9] focus:ring-[#4A9BD9]/30"
            />
            Evento già definito (senza votazione)
          </label>
          <button
            data-testid="button-create-confirm"
            type="button"
            onClick={() => createEvent()}
            disabled={!canProceed5}
            className={`w-full py-3.5 rounded-xl font-semibold text-white disabled:opacity-40 ${isPending ? "pointer-events-none" : "active:opacity-80 transition-opacity"}`}
            style={{ background: "linear-gradient(135deg, #4A9BD9, #7CB9E8)" }}
          >
            {isPending ? "Creando..." : (isDirectPlan ? "Crea evento diretto" : "Crea evento")}
          </button>
        </div>
      </div>
    );

    const banner = (
      <div
        className="rounded-xl p-3 mb-1 flex items-center gap-3"
        style={{ background: "linear-gradient(135deg, #EBF5FB, #D6EAF8)" }}
      >
        <div className="w-9 h-9 rounded-full bg-[#4A9BD9]/20 flex items-center justify-center shrink-0">
          <MapPin size={16} className="text-[#4A9BD9]" />
        </div>
        <div>
          <p className="text-xs font-bold text-[#4A9BD9]">
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
        <div className="flex flex-col h-full">
          <div className="px-6 pt-4 pb-2 flex-1 overflow-y-auto no-scrollbar space-y-3">
            {banner}
            <p className="text-sm text-gray-500">
              Categoria e luoghi arrivano da Scopri AI. Puoi tornare indietro per modificare date e orari.
            </p>
            {selectedVenues.map((venue) => (
              <div
                key={venue.name}
                data-testid={`venue-scopri-summary-${venue.name}`}
                className="w-full p-4 rounded-2xl border-2 border-[#4A9BD9]/30 bg-[#EBF5FB]/40 text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-gray-900">{venue.name}</p>
                      <CheckCircle2 size={14} className="text-[#4A9BD9]" />
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-0.5 text-xs text-amber-500 font-semibold">
                        <Star size={10} fill="currentColor" />
                        {venue.rating}
                      </span>
                      <span className="flex items-center gap-0.5 text-xs text-gray-400">
                        <MapPin size={10} />
                        {venue.distance}
                      </span>
                    </div>
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
      <div className="flex flex-col h-full">
        <div className="px-6 pt-4 pb-2 flex-1 overflow-y-auto no-scrollbar space-y-3">
          {banner}

          {/* Ricerca */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              data-testid="input-venue-search"
              type="text"
              placeholder="Cerca un posto..."
              value={venueSearch}
              onChange={e => setVenueSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-gray-100 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#4A9BD9]/30"
            />
          </div>

          {activityVenues.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">Nessun posto trovato</p>
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
                  ? "border-[#4A9BD9] bg-[#EBF5FB]"
                  : "border-gray-100 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-gray-900">{venue.name}</p>
                    {isVenueSelected && (
                      <CheckCircle2 size={14} className="text-[#4A9BD9]" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-0.5 text-xs text-amber-500 font-semibold">
                      <Star size={10} fill="currentColor" />
                      {venue.rating}
                    </span>
                    <span className="flex items-center gap-0.5 text-xs text-gray-400">
                      <MapPin size={10} />
                      {venue.distance}
                    </span>
                  </div>
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

        {createFooter}
      </div>
    );
  }

  // Success
  if (done) return (
    <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mb-4 animate-in zoom-in duration-300">
        <CheckCircle2 size={40} className="text-emerald-500" />
      </div>
      <h3 className="text-xl font-bold text-gray-900">Proposta di evento inviata!</h3>
      <p className="text-sm text-gray-400 mt-2">
        {groupLabel} riceverà la notifica per votare
      </p>
      <button
        data-testid="button-close-success"
        onClick={() => {
          onClose();
          if (createdEventId) navigate(`/events/${createdEventId}/chat`);
        }}
        className="mt-8 flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-white"
        style={{ background: "linear-gradient(135deg, #4A9BD9, #7CB9E8)" }}
      >
        <MessageCircle size={18} />
        Vai alla chat
      </button>
    </div>
  );

  return null;
}
