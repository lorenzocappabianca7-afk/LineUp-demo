import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight, X, ChevronRight as ChevRight, Trash2, UserX, Users, CalendarPlus } from "lucide-react";
import { parseEvent, getActivity, MONTHS_IT, getCurrentUser } from "@/lib/appUtils";
import { apiRequest } from "@/lib/queryClient";

const DAYS_HEADER = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const HIDDEN_KEY = "lineup-hidden-events";

export default function AppCalendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
  const currentUser = getCurrentUser();

  // Delete flow state
  const [deleteEventId, setDeleteEventId] = useState<number | null>(null);
  const [deleteStep, setDeleteStep] = useState<"choose" | "confirm-all">("choose");

  // Hidden events (solo per me)
  const [hiddenIds, setHiddenIds] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem(HIDDEN_KEY) || "[]"); }
    catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(hiddenIds));
  }, [hiddenIds]);

  const queryClient = useQueryClient();
  const { data: rawEvents } = useQuery<any[]>({ queryKey: ["/api/app/events"] });

  // Mostra gli eventi confermati dove l'utente partecipa (confermati dal creatore o auto-confermati)
  const events = (rawEvents || [])
    .map(parseEvent)
    .filter(e =>
      e.status === "confirmed" &&
      e.participants.includes(currentUser) &&
      !hiddenIds.includes(e.id)
    );

  const { mutate: deleteForAll, isPending: isDeleting } = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/app/events/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/app/events"] });
      closeDeleteModal();
    },
  });

  const closeDeleteModal = () => {
    setDeleteEventId(null);
    setDeleteStep("choose");
  };

  const hideForMe = (id: number) => {
    setHiddenIds(prev => [...prev, id]);
    closeDeleteModal();
  };

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow = (firstDay.getDay() + 6) % 7;

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  };

  const eventsForDay = (day: number) =>
    events.filter(e => {
      // Solo eventi confermati: usa confirmedDate
      if (e.status === "confirmed" && e.confirmedDate) {
        const num = parseInt(e.confirmedDate.split(" ")[1]);
        return num === day;
      }
      return false;
    });

  const selectedEvents = selectedDay ? eventsForDay(selectedDay) : [];

  // Build week rows — always 6 rows for consistent layout
  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  while (weeks.length < 6) weeks.push(Array(7).fill(null));

  const eventToDelete = deleteEventId ? events.find(e => e.id === deleteEventId) ?? null : null;

  return (
    <div className="flex flex-col bg-white relative overflow-hidden" style={{ height: "calc(100svh - 56px)" }}>
      {/* ─── Month nav ─── */}
      <div className="px-5 pt-12 pb-3 shrink-0">
        <div className="flex items-center justify-between">
          <button
            data-testid="button-prev-month"
            onClick={prevMonth}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <ChevronLeft size={18} className="text-gray-600" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">
            {MONTHS_IT[month]} {year}
          </h1>
          <button
            data-testid="button-next-month"
            onClick={nextMonth}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <ChevronRight size={18} className="text-gray-600" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mt-4">
          {DAYS_HEADER.map(d => (
            <div key={d} className="text-center text-[11px] font-semibold text-gray-400 py-1">
              {d}
            </div>
          ))}
        </div>
      </div>

      {/* ─── Calendar grid — always 6 rows ─── */}
      <div className="flex flex-col flex-1 min-h-0">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 flex-1 border-t border-gray-200">
            {week.map((day, di) => {
              if (day === null) return <div key={`empty-${wi}-${di}`} />;

              const isToday =
                day === today.getDate() &&
                month === today.getMonth() &&
                year === today.getFullYear();
              const isSelected = day === selectedDay;
              const dayEvents = eventsForDay(day);

              return (
                <button
                  key={day}
                  data-testid={`calendar-day-${day}`}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className="flex flex-col items-center pt-0.5 pb-1 px-0.5 relative"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors shrink-0 ${
                      isToday
                        ? "bg-red-500 text-white"
                        : isSelected
                        ? "bg-[#4A9BD9] text-white"
                        : "text-gray-700"
                    }`}
                  >
                    {day}
                  </div>

                  {/* Event bars */}
                  {dayEvents.length > 0 && (
                    <div className="flex flex-col items-center gap-[3px] mt-0.5 w-full px-2">
                      {dayEvents.slice(0, 4).map((e, idx) => {
                        const isConfirmed = e.status === "confirmed";
                        const isPastDay =
                          year < today.getFullYear() ||
                          (year === today.getFullYear() && month < today.getMonth()) ||
                          (year === today.getFullYear() && month === today.getMonth() && day < today.getDate());
                        const barColor = isPastDay
                          ? "#d1d5db"
                          : isConfirmed
                          ? "#10b981"
                          : "#4A9BD9";
                        return (
                          <div
                            key={idx}
                            className="w-3/5 h-[3px] rounded-full"
                            style={{ backgroundColor: barColor }}
                          />
                        );
                      })}
                      {dayEvents.length > 4 && (
                        <span className="text-[7px] text-gray-400 leading-none">
                          +{dayEvents.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* ─── Empty state: nessun evento confermato ─── */}
      {events.length === 0 && (
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-center pb-16 pt-6 px-8 text-center pointer-events-none">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
            <CalendarPlus size={26} className="text-gray-300" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-semibold text-gray-500 mb-1">Nessun evento nel calendario</p>
          <p className="text-xs text-gray-400 leading-relaxed max-w-[220px]">
            Apri una chat e premi "Aggiungi a calendario" per salvare gli eventi qui
          </p>
        </div>
      )}

      {/* ─── Selected day drawer ─── */}
      {selectedDay && (
        <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-3xl shadow-2xl border-t border-gray-100 max-h-[45%] flex flex-col">
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-8 h-1 bg-gray-200 rounded-full" />
          </div>

          <div className="flex items-center justify-between px-5 pb-3 shrink-0">
            <h2 className="text-base font-bold text-gray-900">
              {selectedDay} {MONTHS_IT[month]}
            </h2>
            <button onClick={() => setSelectedDay(null)}>
              <X size={18} className="text-gray-400" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 px-4 pb-4 space-y-3">
            {selectedEvents.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-400 text-sm">Nessun evento in questo giorno</p>
              </div>
            ) : (
              selectedEvents.map(event => {
                const act = getActivity(event.activity);
                return (
                  <div key={event.id} className="flex items-center gap-2">
                    <Link href={`/events/${event.id}`} className="flex-1 min-w-0">
                      <div
                        data-testid={`calendar-event-${event.id}`}
                        className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform"
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: act.bg }}
                        >
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: act.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm capitalize truncate">
                            {event.title}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {event.participants.length} partecipanti ·{" "}
                            {event.status === "confirmed" ? "Confermato" : "Pianificando..."}
                          </p>
                        </div>
                        <ChevRight size={15} className="text-gray-300 shrink-0" />
                      </div>
                    </Link>

                    {/* Trash button */}
                    <button
                      data-testid={`delete-event-btn-${event.id}`}
                      onClick={() => {
                        setDeleteEventId(event.id);
                        setDeleteStep("choose");
                      }}
                      className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0 active:scale-95 transition-transform"
                    >
                      <Trash2 size={16} className="text-red-500" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ─── Modal step 1: choose ─── */}
      {deleteEventId && eventToDelete && deleteStep === "choose" && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-8">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Rimuovere l'evento?</h3>
                <p className="text-xs text-gray-400">Scegli come vuoi procedere</p>
              </div>
            </div>

            {/* Event preview */}
            <div className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 my-4">
              <p className="font-semibold text-gray-900 text-sm capitalize">{eventToDelete.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {eventToDelete.participants.length} partecipanti ·{" "}
                {eventToDelete.status === "confirmed" ? "Confermato" : "In pianificazione"}
              </p>
            </div>

            {/* Options */}
            <div className="space-y-3 mb-4">
              {/* Solo per me */}
              <button
                data-testid="button-delete-for-me"
                onClick={() => hideForMe(deleteEventId)}
                className="w-full flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 active:scale-[0.98] transition-transform text-left"
              >
                <div className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center shrink-0">
                  <UserX size={16} className="text-gray-500" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">Solo per me</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Sparisce dal tuo calendario, gli altri non ne sono a conoscenza
                  </p>
                </div>
              </button>

              {/* Elimina per tutti */}
              <button
                data-testid="button-delete-for-all"
                onClick={() => setDeleteStep("confirm-all")}
                className="w-full flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl px-4 py-3.5 active:scale-[0.98] transition-transform text-left"
              >
                <div className="w-9 h-9 rounded-full bg-white border border-red-100 flex items-center justify-center shrink-0">
                  <Users size={16} className="text-red-500" />
                </div>
                <div>
                  <p className="font-semibold text-red-600 text-sm">Elimina per tutti</p>
                  <p className="text-xs text-red-400 mt-0.5">
                    Cancella l'evento e la chat per tutti i partecipanti
                  </p>
                </div>
              </button>
            </div>

            <button
              data-testid="button-cancel-delete"
              onClick={closeDeleteModal}
              className="w-full py-3 rounded-xl font-semibold text-gray-500 bg-gray-100 text-sm"
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* ─── Modal step 2: confirm delete for all ─── */}
      {deleteEventId && eventToDelete && deleteStep === "confirm-all" && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-8">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Sei sicuro?</h3>
                <p className="text-xs text-gray-400">Questa azione è irreversibile</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 my-4">
              <p className="font-semibold text-gray-900 text-sm capitalize">{eventToDelete.title}</p>
              <p className="text-xs text-red-500 mt-1">
                L'evento e tutta la chat verranno eliminati per tutti i{" "}
                {eventToDelete.participants.length} partecipanti.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                data-testid="button-back-to-choose"
                onClick={() => setDeleteStep("choose")}
                className="flex-1 py-3 rounded-xl font-semibold text-gray-600 bg-gray-100 text-sm"
              >
                Indietro
              </button>
              <button
                data-testid="button-confirm-delete-all"
                onClick={() => deleteForAll(deleteEventId)}
                disabled={isDeleting}
                className="flex-1 py-3 rounded-xl font-semibold text-white bg-red-500 text-sm disabled:opacity-60"
              >
                {isDeleting ? "Eliminando..." : "Elimina per tutti"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
