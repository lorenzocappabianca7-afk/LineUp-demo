import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QrCode, X, MapPin, ChevronRight, Camera, ImagePlus, Check, Trash2, Users, ChevronDown, ChevronUp, CalendarX, EyeOff } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import {
  getCurrentUser, setCurrentUser, getAvatarColor, getInitials,
  getActivity, MONTHS_IT, parseEvent,
} from "@/lib/appUtils";

const LS_PHOTO = "lineup-profile-photo";
const DAYS_HDR = ["L", "M", "M", "G", "V", "S", "D"];

/* ─── QR Modal ─── */
function QrModal({ name, onClose }: { name: string; onClose: () => void }) {
  const [firstName, ...rest] = name.trim().split(" ");
  const surname = rest.join(" ");
  const emailGuess = `${name.trim().toLowerCase().replace(/\s+/g, ".")}@lineup.app`;
  const url = `${window.location.origin}/add-contact?user=${encodeURIComponent(name)}&name=${encodeURIComponent(firstName || name)}&surname=${encodeURIComponent(surname)}&email=${encodeURIComponent(emailGuess)}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}&qzone=2&color=1a1a1a`;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-t-3xl px-6 pt-6 pb-20">
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
          <X size={16} className="text-gray-500" />
        </button>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Il tuo codice amico</h2>
        <p className="text-sm text-gray-400 mb-5">Fai scansionare questo codice per aggiungerti su LineUp</p>
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-white border-2 border-gray-100 rounded-2xl shadow-sm">
            <img src={qrUrl} alt="QR Code" width={190} height={190} className="rounded-xl" />
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 bg-gray-50 rounded-xl px-4 py-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ backgroundColor: getAvatarColor(name) }}>
            {getInitials(name)}
          </div>
          <p className="text-sm font-semibold text-gray-700">{name} su LineUp</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Edit Profile Modal ─── */
function EditProfileModal({
  name, photo, onSave, onClose
}: {
  name: string;
  photo: string | null;
  onSave: (newName: string, newPhoto: string | null) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(name);
  const [draftPhoto, setDraftPhoto] = useState<string | null>(photo);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const avatarColor = getAvatarColor(draft || name);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setDraftPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50">
      <div className="relative bg-white rounded-t-3xl px-6 pt-6 pb-10">
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
          <X size={16} className="text-gray-500" />
        </button>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Modifica profilo</h2>
        <p className="text-sm text-gray-400 mb-6">Cambia foto e nome</p>

        {/* Avatar preview */}
        <div className="flex flex-col items-center mb-6">
          {draftPhoto ? (
            <img src={draftPhoto} alt="Foto profilo"
              className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md mb-4" />
          ) : (
            <div className="w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold text-white border-4 border-white shadow-md mb-4"
              style={{ backgroundColor: avatarColor }}>
              {getInitials(draft || name)}
            </div>
          )}

          {/* Photo buttons */}
          <div className="flex gap-3">
            <button
              data-testid="button-pick-gallery"
              onClick={() => galleryRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 active:bg-gray-50"
            >
              <ImagePlus size={16} className="text-gray-500" />
              Galleria
            </button>
            <button
              data-testid="button-take-photo"
              onClick={() => cameraRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 active:bg-gray-50"
            >
              <Camera size={16} className="text-gray-500" />
              Fotocamera
            </button>
          </div>

          <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
        </div>

        {/* Name input */}
        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Nome utente</label>
        <input
          data-testid="input-name"
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === "Enter" && onSave(draft, draftPhoto)}
          className="w-full border-2 border-gray-200 focus:border-[#4A9BD9] rounded-xl px-4 py-3 text-base font-semibold outline-none transition-colors mb-5"
          placeholder="Il tuo nome"
        />

        <button
          data-testid="button-save-profile"
          onClick={() => onSave(draft, draftPhoto)}
          disabled={!draft.trim()}
          className="w-full py-3.5 rounded-xl font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg, #4A9BD9, #7CB9E8)" }}
        >
          <Check size={17} />
          Salva modifiche
        </button>
      </div>
    </div>
  );
}

/* ─── Embedded Calendar ─── */
const LS_HIDDEN = "lineup-hidden-events";
const getHidden = (): Set<number> => {
  try { return new Set(JSON.parse(localStorage.getItem(LS_HIDDEN) || "[]")); } catch { return new Set(); }
};
const saveHidden = (s: Set<number>) =>
  localStorage.setItem(LS_HIDDEN, JSON.stringify(Array.from(s)));

function ProfileCalendar({
  events,
  onUnconfirm,
  onHide,
}: {
  events: ReturnType<typeof parseEvent>[];
  onUnconfirm: (id: number) => void;
  onHide: (id: number) => void;
}) {
  const today = new Date();
  const [year, setYear]     = useState(today.getFullYear());
  const [month, setMonth]   = useState(today.getMonth());
  const [selDay, setSelDay] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deleteModalId, setDeleteModalId] = useState<number | null>(null);
  const [, navigate] = useLocation();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let startDow = new Date(year, month, 1).getDay();
  if (startDow === 0) startDow = 7;
  startDow -= 1;

  const cells: (number | null)[] = [...Array(startDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  while (weeks.length < 6) weeks.push(Array(7).fill(null));

  const eventDays = new Map<number, { confirmed: boolean; planning: boolean }>();
  events.forEach(e => {
    const isConfirmed = e.status === "confirmed";
    // Per eventi confermati: solo confirmedDate. Per planning: tutte le dateOptions.
    const dates = isConfirmed
      ? (e.confirmedDate ? [e.confirmedDate] : [])
      : [...e.dateOptions];
    dates.forEach(d => {
      const num = parseInt(d.split(" ")[1]);
      if (!isNaN(num)) {
        const ex = eventDays.get(num) ?? { confirmed: false, planning: false };
        if (isConfirmed) ex.confirmed = true; else ex.planning = true;
        eventDays.set(num, ex);
      }
    });
  });

  const eventsForDay = (day: number) =>
    events.filter(e => {
      if (!e.confirmedDate) return false;
      return parseInt(e.confirmedDate.split(" ")[1]) === day;
    });

  const getEventTime = (e: ReturnType<typeof parseEvent>) =>
    e.confirmedTime || e.timeOptions[0] || "";

  const selEvents = selDay
    ? eventsForDay(selDay).sort((a, b) => getEventTime(a).localeCompare(getEventTime(b)))
    : [];

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); setSelDay(null); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); setSelDay(null); };
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Nav */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <button onClick={prevMonth} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
          <ChevronRight size={17} className="text-gray-500 rotate-180" />
        </button>
        <p className="text-base font-bold text-gray-900">{MONTHS_IT[month]} {year}</p>
        <button onClick={nextMonth} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
          <ChevronRight size={17} className="text-gray-500" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 px-3">
        {DAYS_HDR.map((d, i) => (
          <div key={i} className="text-center text-[13px] font-bold text-gray-400 py-1">{d}</div>
        ))}
      </div>

      {/* Weeks — always 6 rows */}
      <div className="flex flex-col px-2 pb-3">
        {weeks.map((week, wi) => (
          <div key={wi} className={`grid grid-cols-7 ${wi > 0 ? "border-t border-gray-100" : ""}`}>
            {week.map((day, di) => {
              if (!day) return <div key={di} className="h-16" />;
              const isToday = isCurrentMonth && day === today.getDate();
              const isPast  = year < today.getFullYear() || (year === today.getFullYear() && month < today.getMonth()) || (isCurrentMonth && day < today.getDate());
              const isSel   = day === selDay;
              const dayInfo = eventDays.get(day) ?? null;
              return (
                <button
                  key={di}
                  data-testid={`profile-cal-day-${day}`}
                  onClick={() => { setSelDay(isSel ? null : day); setExpandedId(null); setDeleteModalId(null); }}
                  className="flex flex-col items-center pt-2 pb-2 px-0.5"
                >
                  <div className={`w-9 h-9 flex items-center justify-center rounded-full text-[15px] font-semibold transition-all ${
                    isToday ? "bg-red-500 text-white"
                    : isSel ? "bg-[#4A9BD9] text-white"
                    : isPast ? "text-gray-300"
                    : "text-gray-800"
                  }`}>
                    {day}
                  </div>
                  <div className="flex flex-col items-center gap-[3px] mt-1.5 w-full px-1">
                    {dayInfo?.confirmed && (
                      <div className={`w-4/5 h-[5px] rounded-full ${isPast ? "bg-gray-200" : "bg-emerald-400"}`} />
                    )}
                    {dayInfo?.planning && (
                      <div className={`w-4/5 h-[5px] rounded-full ${isPast ? "bg-gray-200" : "bg-[#4A9BD9]/60"}`} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Selected day events */}
      {selDay && (
        <div className="border-t border-gray-100 px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-gray-900">{selDay} {MONTHS_IT[month]}</p>
            <button onClick={() => setSelDay(null)} className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
              <X size={11} className="text-gray-400" />
            </button>
          </div>

          {selEvents.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-3">Nessun evento in questo giorno</p>
          ) : (
            <div className="space-y-3">
              {selEvents.map(e => {
                const act       = getActivity(e.activity);
                const time      = getEventTime(e);
                const confirmed = e.status === "confirmed";
                const isExp     = expandedId === e.id;

                return (
                  <div key={e.id} data-testid={`profile-day-event-${e.id}`}>
                    {/* Row: time + banner */}
                    <div className="flex items-center gap-3">
                      {/* Time indicator */}
                      <div className="flex flex-col items-center shrink-0 w-12">
                        <span className="text-xs font-bold text-gray-500 leading-none">
                          {time || "--:--"}
                        </span>
                        <div className={`w-0.5 h-4 mt-1 rounded-full ${confirmed ? "bg-emerald-300" : "bg-[#4A9BD9]/40"}`} />
                      </div>

                      {/* Banner */}
                      <button
                        className={`flex-1 flex items-center justify-between px-3 py-2.5 rounded-xl text-white active:opacity-80 transition-opacity ${
                          confirmed
                            ? "bg-emerald-500"
                            : "bg-[#4A9BD9]"
                        }`}
                        onClick={() => setExpandedId(isExp ? null : e.id)}
                      >
                        <span className="text-sm font-bold truncate">{act.label}</span>
                        {isExp ? <ChevronUp size={15} className="shrink-0 ml-2" /> : <ChevronDown size={15} className="shrink-0 ml-2" />}
                      </button>

                      {/* Trash */}
                      <button
                        data-testid={`button-delete-event-${e.id}`}
                        onClick={() => setDeleteModalId(e.id)}
                        className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0 active:bg-red-100 transition-colors"
                      >
                        <Trash2 size={14} className="text-red-500" />
                      </button>
                    </div>

                    {/* Expanded details */}
                    {isExp && (
                      <div className="mt-2 ml-[60px] bg-gray-50 rounded-xl p-3 space-y-2">
                        {e.confirmedVenue || e.venueOptions.length > 0 ? (
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <MapPin size={12} className="text-gray-400 shrink-0" />
                            <span className="truncate">{e.confirmedVenue || e.venueOptions[0]?.name || "—"}</span>
                          </div>
                        ) : null}
                        {e.participants.length > 0 && (
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <Users size={12} className="text-gray-400 shrink-0" />
                            <span className="truncate">{e.participants.join(", ")}</span>
                          </div>
                        )}
                        <button
                          onClick={() => navigate(`/events/${e.id}`)}
                          className="w-full mt-1 py-2 rounded-lg bg-white border border-gray-200 text-xs font-semibold text-gray-700 flex items-center justify-center gap-1.5 active:bg-gray-100"
                        >
                          Vai all'evento <ChevronRight size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Modal rimozione evento ─── */}
      {deleteModalId !== null && (() => {
        const ev = events.find(e => e.id === deleteModalId);
        if (!ev) return null;
        const act = getActivity(ev.activity);
        return (
          <div className="fixed inset-0 z-[70] flex items-end justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteModalId(null)} />
            <div className="relative w-full max-w-sm bg-white rounded-t-3xl px-5 pt-5 pb-10">
              <p className="text-xs text-gray-400 uppercase font-bold tracking-wide mb-1">Rimuovi evento</p>
              <p className="text-base font-bold text-gray-900 mb-5">{act.label}</p>

              <button
                data-testid="button-unconfirm-event"
                onClick={() => { onUnconfirm(deleteModalId); setDeleteModalId(null); setSelDay(null); }}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-[#EBF5FB] mb-3 active:opacity-80 transition-opacity"
              >
                <div className="w-9 h-9 rounded-full bg-[#4A9BD9]/10 flex items-center justify-center shrink-0">
                  <CalendarX size={17} className="text-[#4A9BD9]" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-gray-800">Solo dal calendario</p>
                  <p className="text-xs text-gray-400">L'evento torna in programma e resti nella chat</p>
                </div>
              </button>

              <button
                data-testid="button-hide-event"
                onClick={() => { onHide(deleteModalId); setDeleteModalId(null); setSelDay(null); }}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-red-50 mb-3 active:opacity-80 transition-opacity"
              >
                <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <EyeOff size={17} className="text-red-500" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-gray-800">Elimina per me</p>
                  <p className="text-xs text-gray-400">Esci dalla chat e non vedere più questo evento</p>
                </div>
              </button>

              <button
                onClick={() => setDeleteModalId(null)}
                className="w-full py-3 rounded-2xl bg-gray-100 text-sm font-semibold text-gray-500 active:opacity-80"
              >
                Annulla
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

/* ─── Main ─── */
export default function AppProfile() {
  const [name, setName]         = useState(getCurrentUser());
  const [photo, setPhoto]       = useState<string | null>(localStorage.getItem(LS_PHOTO));
  const [showQr, setShowQr]     = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const queryClient = useQueryClient();
  const { data: rawEvents } = useQuery<any[]>({ queryKey: ["/api/app/events"] });

  const events = (rawEvents || []).map(parseEvent).filter(e => !getHidden().has(e.id));
  // Mostra tutti gli eventi confermati dove l'utente partecipa
  const calendarEvents = events.filter(e => e.status === "confirmed" && e.participants.includes(name));

  const myEvents    = events.filter(e => e.createdBy === name || e.participants.includes(name));
  const createdByMe = events.filter(e => e.createdBy === name);
  const confirmed   = events.filter(e => e.status === "confirmed" && e.participants.includes(name));

  const { mutate: unconfirmEvent } = useMutation({
    mutationFn: (id: number) => apiRequest("PUT", `/api/app/events/${id}/unconfirm`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/app/events"] }),
  });

  const hideEvent = (id: number) => {
    const s = getHidden();
    s.add(id);
    saveHidden(s);
    queryClient.invalidateQueries({ queryKey: ["/api/app/events"] });
  };

  const handleSaveProfile = (newName: string, newPhoto: string | null) => {
    if (newName.trim()) { setName(newName.trim()); setCurrentUser(newName.trim()); }
    if (newPhoto !== null) { setPhoto(newPhoto); localStorage.setItem(LS_PHOTO, newPhoto); }
    setShowEdit(false);
  };

  const avatarColor = getAvatarColor(name);

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      {showQr && <QrModal name={name} onClose={() => setShowQr(false)} />}
      {showEdit && (
        <EditProfileModal
          name={name}
          photo={photo}
          onSave={handleSaveProfile}
          onClose={() => setShowEdit(false)}
        />
      )}

      {/* ─── Header ─── */}
      <div className="bg-white pt-12 pb-5 px-5 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-bold text-gray-900">Profilo</h1>
          <button
            data-testid="button-qr-code"
            onClick={() => setShowQr(true)}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <QrCode size={17} className="text-gray-500" />
          </button>
        </div>

        {/* Avatar + name + Modifica */}
        <div className="flex items-center gap-4 mb-5">
          <div className="shrink-0">
            {photo ? (
              <img src={photo} alt="Foto profilo"
                className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md" />
            ) : (
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white border-4 border-white shadow-md"
                style={{ backgroundColor: avatarColor }}>
                {getInitials(name)}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xl font-bold text-gray-900 truncate">{name}</p>
            <p className="text-sm text-gray-400 mt-0.5 mb-3">Utente LineUp</p>
            <button
              data-testid="button-edit-profile"
              onClick={() => setShowEdit(true)}
              className="px-4 py-1.5 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-500 active:bg-gray-50 transition-colors"
            >
              Modifica
            </button>
          </div>
        </div>

      </div>

      <div className="flex-1 px-4 py-5 space-y-5">
        {/* ─── Calendario ─── */}
        <section>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 px-1">Il tuo calendario</h2>
          <ProfileCalendar events={calendarEvents} onUnconfirm={unconfirmEvent} onHide={hideEvent} />
        </section>

        <div className="pb-4" />
      </div>
    </div>
  );
}
