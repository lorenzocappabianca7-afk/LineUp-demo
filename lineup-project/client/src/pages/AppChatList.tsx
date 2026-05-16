import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import type { AppBanner } from "@shared/schema";
import { Plus, Search, X, Check, MessageCircleDashed, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { parseEvent, getActivity, getAvatarColor, getInitials, CONTACTS } from "@/lib/appUtils";
type Filter = "all" | "planning" | "confirmed" | "past";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all",       label: "Tutte" },
  { key: "planning",  label: "In programma" },
  { key: "confirmed", label: "Confermate" },
  { key: "past",      label: "Passate" },
];

/* ─── Group Avatar ─── */
function GroupAvatar({ participants, size = 48 }: { participants: string[]; size?: number }) {
  const others = participants.filter(p => p !== "Io");
  if (others.length === 1) {
    const name = others[0];
    return (
      <div
        className="rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
        style={{ backgroundColor: getAvatarColor(name), width: size, height: size }}
      >
        {getInitials(name)}
      </div>
    );
  }
  const shown = others.slice(0, 3);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {shown.map((name, i) => (
        <div
          key={name}
          className="absolute border-2 border-white rounded-full flex items-center justify-center text-[9px] font-bold text-white"
          style={{
            backgroundColor: getAvatarColor(name),
            width: shown.length === 2 ? size * 0.58 : size * 0.5,
            height: shown.length === 2 ? size * 0.58 : size * 0.5,
            top: i === 0 ? 0 : i === 1 ? (shown.length === 2 ? size * 0.29 : size * 0.25) : size * 0.5,
            left: i === 0 ? 0 : i === 1 ? (shown.length === 2 ? size * 0.33 : size * 0.29) : size * 0.58,
            zIndex: shown.length - i,
          }}
        >
          {getInitials(name)}
        </div>
      ))}
    </div>
  );
}

/* ─── New Chat Modal ─── */
function NewChatModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-50 bg-white flex flex-col">
      <div className="flex items-center gap-3 px-5 pt-12 pb-4 border-b border-gray-100">
        <button onClick={onClose}>
          <X size={20} className="text-gray-600" />
        </button>
        <h2 className="text-lg font-bold text-gray-900 flex-1">Nuova chat</h2>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Contatti</p>
        <div className="space-y-1">
          {CONTACTS.map(name => (
            <button
              key={name}
              onClick={onClose}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                style={{ backgroundColor: getAvatarColor(name) }}
              >
                {getInitials(name)}
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-gray-900">{name}</p>
                <p className="text-xs text-gray-400">Tocca per avviare una chat</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Empty State ─── */
function EmptyState({ filter, onPlanify }: { filter: Filter; onPlanify: () => void }) {
  const copy: Record<Filter, { title: string; sub: string; cta: boolean }> = {
    all:       { title: "Nessuna chat ancora",         sub: "Pianifica un evento per iniziare a chattare con i tuoi amici.", cta: true },
    planning:  { title: "Nessun evento in programma",  sub: "Quando organizzi un evento le sue chat appariranno qui.", cta: true },
    confirmed: { title: "Nessun evento confermato",    sub: "Le chat degli eventi confermati appariranno in questa sezione.", cta: false },
    past:      { title: "Nessuna chat passata",        sub: "Gli eventi conclusi saranno archiviati qui.", cta: false },
  };
  const { title, sub, cta } = copy[filter];
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-8 py-16 text-center">
      <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center mb-5">
        <MessageCircleDashed size={36} className="text-gray-300" strokeWidth={1.5} />
      </div>
      <p className="text-base font-bold text-gray-700 mb-1.5">{title}</p>
      <p className="text-sm text-gray-400 leading-relaxed max-w-[240px]">{sub}</p>
      {cta && (
        <button
          data-testid="button-empty-planify"
          onClick={onPlanify}
          className="mt-6 rounded-full bg-gradient-to-br from-primary to-primary/75 px-6 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Vai ad Home
        </button>
      )}
    </div>
  );
}

/* ─── Main ─── */
export default function AppChatList() {
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [, navigate] = useLocation();

  const { data: rawEvents, isLoading } = useQuery<any[]>({ queryKey: ["/api/app/events"] });
  const { data: banners = [] } = useQuery<AppBanner[]>({ queryKey: ["/api/app/banners"] });
  const events = (rawEvents || []).map(parseEvent);

  const todayDay = new Date().getDate();

  const isPast = (e: ReturnType<typeof parseEvent>) => {
    if (e.status !== "confirmed" || !e.confirmedDate) return false;
    const day = parseInt(e.confirmedDate.split(" ")[1]);
    return !isNaN(day) && day < todayDay;
  };

  const filtered = events.filter(e => {
    if (filter === "planning")  return e.status === "planning" && !isPast(e);
    if (filter === "confirmed") return e.status === "confirmed" && !isPast(e);
    if (filter === "past")      return isPast(e);
    return true;
  });

  /* ─── participant key: sorted others joined ─── */
  const participantKey = (e: ReturnType<typeof parseEvent>) =>
    e.participants.filter(p => p !== "Io").sort().join("|");

  const chatName = (event: ReturnType<typeof parseEvent>) => {
    const others = event.participants.filter(p => p !== "Io");
    if (others.length === 1) return others[0];
    return others.slice(0, 2).join(", ") + (others.length > 2 ? ` +${others.length - 2}` : "");
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
  };

  /* ─── "Tutte": group by participant set ─── */
  type ParsedEvent = ReturnType<typeof parseEvent>;
  const groupedEntries: Array<{ key: string; evts: ParsedEvent[] }> = [];
  if (filter === "all") {
    const seen = new Map<string, ParsedEvent[]>();
    for (const e of filtered) {
      const k = participantKey(e);
      if (!seen.has(k)) seen.set(k, []);
      seen.get(k)!.push(e);
    }
    seen.forEach((evts, key) => groupedEntries.push({ key, evts }));
  }

  return (
    <div className="relative flex flex-col min-h-full bg-gray-50">
      {showNew && <NewChatModal onClose={() => setShowNew(false)} />}

      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-0 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold text-gray-900">Chat</h1>
          <button
            data-testid="button-new-chat"
            onClick={() => setShowNew(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/75"
          >
            <Plus size={18} className="text-primary-foreground" strokeWidth={2.5} />
          </button>
        </div>

        {/* Search bar */}
        <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 mb-3">
          <Search size={15} className="text-gray-400 shrink-0" />
          <span className="text-sm text-gray-400">Cerca</span>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 overflow-x-auto no-scrollbar pb-3">
          {FILTERS.map(f => (
            <button
              key={f.key}
              data-testid={`filter-${f.key}`}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filter === f.key
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Banner ── */}
      {banners.length > 0 && (
        <div className="px-3 pt-3 space-y-2.5">
          {banners.map(b => (
            <div
              key={b.id}
              data-testid={`banner-${b.id}`}
              className="rounded-2xl px-4 py-3.5"
              style={{ backgroundColor: b.bgColor }}
            >
              <p className="text-white font-bold text-sm leading-snug">{b.title}</p>
              {b.subtitle && <p className="text-white/80 text-xs mt-1">{b.subtitle}</p>}
            </div>
          ))}
        </div>
      )}

      {/* List */}
      <div className="flex-1 flex flex-col">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState filter={filter} onPlanify={() => navigate("/")} />
        ) : filter === "all" ? (
          /* ── TUTTE: grouped by contact ── */
          <div className="bg-white mt-2 rounded-2xl mx-3 overflow-hidden shadow-sm border border-gray-100">
            {groupedEntries.map(({ key, evts }, groupIdx) => {
              const representative = evts[0];
              const name = chatName(representative);
              const hasPlanning = evts.some(e => e.status === "planning" && !isPast(e));
              const confirmedCount = evts.filter(e => e.status === "confirmed" && !isPast(e)).length;
              const planningCount = evts.filter(e => e.status === "planning" && !isPast(e)).length;
              const isLast = groupIdx === groupedEntries.length - 1;
              // Navigate to most recent event
              const targetId = evts[evts.length - 1].id;

              return (
                <Link key={key} href={`/events/${targetId}/chat`}>
                  <div
                    data-testid={`chat-group-${key}`}
                    className={`flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 transition-colors cursor-pointer ${!isLast ? "border-b border-gray-50" : ""}`}
                  >
                    <div className="relative shrink-0">
                      <GroupAvatar participants={representative.participants} size={48} />
                      {hasPlanning && (
                        <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-red-500 border-2 border-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{name}</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {[
                          planningCount > 0 && `${planningCount} in programma`,
                          confirmedCount > 0 && `${confirmedCount} confermati`,
                        ].filter(Boolean).join(" · ") || `${evts.length} eventi passati`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {evts.some(e => e.status === "confirmed" && !isPast(e)) && (
                        <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                          <Check size={9} className="text-white" strokeWidth={3} />
                        </div>
                      )}
                      {hasPlanning && (
                        <div className="h-4 w-4 rounded-full bg-primary" />
                      )}
                      <ChevronRight size={15} className="text-gray-300" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          /* ── FILTERED: flat list ── */
          <div className="bg-white mt-2 rounded-2xl mx-3 overflow-hidden shadow-sm border border-gray-100">
            {filtered.map((event, idx) => {
              const act = getActivity(event.activity);
              const name = chatName(event);
              const isLast = idx === filtered.length - 1;
              const past = isPast(event);
              return (
                <Link key={event.id} href={`/events/${event.id}/chat`}>
                  <div
                    data-testid={`chat-item-${event.id}`}
                    className={`flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 transition-colors cursor-pointer ${!isLast ? "border-b border-gray-50" : ""}`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <GroupAvatar participants={event.participants} />
                      {event.status === "planning" && !past && (
                        <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-red-500 border-2 border-white" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className="font-semibold text-gray-900 truncate">{name}</p>
                        <span className="text-[11px] text-gray-400 shrink-0">
                          {formatTime(event.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm text-gray-500 truncate">
                          {act.label}
                          {event.status === "confirmed"
                            ? ` · ${event.confirmedDate} ${event.confirmedTime}`
                            : ` · ${event.dateOptions.length} opzioni`}
                        </p>
                        {event.status === "confirmed" ? (
                          <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                            <Check size={9} className="text-white" strokeWidth={3} />
                          </div>
                        ) : (
                          <div className="h-4 w-4 shrink-0 rounded-full bg-primary" />
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
