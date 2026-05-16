import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { ArrowLeft, Send, ChevronDown, ChevronUp, MapPin, Clock, Star, Tag, ThumbsUp, Pencil, Check as CheckIcon, CalendarDays, Building2, UserMinus, UserCheck, CalendarPlus, CheckCircle2, X, Shield, Flag, ChevronRight, ChevronLeft, Search, Trash2, Plus, CalendarSearch, Timer, MapPinned, Bell, AlertCircle, Link2, Copy, CalendarX } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  parseEvent,
  getActivity,
  getAvatarColor,
  getInitials,
  getCurrentUser,
  GROUPS,
  MONTHS_IT,
  DAYS_IT,
  VENUES_BY_ACTIVITY,
  userHasCompletedVotablePoll,
  getVotablePollTypesForEvent,
  getEventChatInviteUrl,
  venuePollSubtitle,
  type VenueOption,
} from "@/lib/appUtils";
import {
  allowsMemberProposals,
  parseSurveyMode,
  surveyBehavior,
} from "@shared/surveyModes";
import { VenueExternalLinks } from "@/components/VenueExternalLinks";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PollOptionButton } from "@/components/poll/PollOptionButton";

/* ─── LocalStorage helpers for contact nicknames ─── */
const LS_CONTACTS = "lineup-contact-names";
function loadContactNames(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(LS_CONTACTS) ?? "{}"); } catch { return {}; }
}
function saveContactName(original: string, nickname: string) {
  const all = loadContactNames();
  all[original] = nickname;
  localStorage.setItem(LS_CONTACTS, JSON.stringify(all));
}

/* ─── LocalStorage helpers for blocked/reported users ─── */
const LS_BLOCKED = "lineup-blocked";
const LS_REPORTED = "lineup-reported";
function loadSet(key: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(key) ?? "[]")); } catch { return new Set(); }
}
function addToSet(key: string, val: string) {
  const s = loadSet(key);
  s.add(val);
  localStorage.setItem(key, JSON.stringify(Array.from(s)));
}

/* ─── User Profile Modal ─── */
function UserProfileModal({
  name,
  allEvents,
  onClose,
  onNicknameChange,
}: {
  name: string;
  allEvents: ReturnType<typeof parseEvent>[];
  onClose: () => void;
  onNicknameChange: () => void;
}) {
  const contactNames = loadContactNames();
  const [nickname, setNickname] = useState(contactNames[name] ?? name);
  const [editingNick, setEditingNick] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showReportConfirm, setShowReportConfirm] = useState(false);
  const [blocked, setBlocked] = useState(() => loadSet(LS_BLOCKED).has(name));
  const [reported, setReported] = useState(() => loadSet(LS_REPORTED).has(name));
  const [actionDone, setActionDone] = useState<"blocked" | "reported" | null>(null);

  const sharedEvents = allEvents.filter(e => e.participants.includes(name));
  const planningCount = sharedEvents.filter(e => e.status === "planning").length;

  const handleSaveNickname = () => {
    const trimmed = nickname.trim();
    if (trimmed && trimmed !== name) {
      saveContactName(name, trimmed);
      onNicknameChange();
    } else if (!trimmed) {
      setNickname(contactNames[name] ?? name);
    }
    setEditingNick(false);
  };

  const handleBlock = () => {
    addToSet(LS_BLOCKED, name);
    setBlocked(true);
    setShowBlockConfirm(false);
    setActionDone("blocked");
    setTimeout(onClose, 1400);
  };

  const handleReport = () => {
    addToSet(LS_REPORTED, name);
    setReported(true);
    setShowReportConfirm(false);
    setActionDone("reported");
    setTimeout(onClose, 1400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 pb-6" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="relative flex items-center justify-center pt-6 pb-4 border-b border-gray-100">
          <button onClick={onClose} className="absolute right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X size={16} className="text-gray-500" />
          </button>
          <p className="text-sm font-bold text-gray-900">Profilo</p>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Avatar + Name */}
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-md"
              style={{ backgroundColor: getAvatarColor(name) }}
            >
              {getInitials(name)}
            </div>

            {editingNick ? (
              <div className="flex items-center gap-2 w-full max-w-[200px]">
                <input
                  autoFocus
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleSaveNickname(); if (e.key === "Escape") { setNickname(contactNames[name] ?? name); setEditingNick(false); } }}
                  className="flex-1 text-center font-bold text-gray-900 text-base bg-gray-100 rounded-xl px-3 py-1.5 outline-none border border-primary"
                  maxLength={30}
                />
                <button onClick={handleSaveNickname} className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <CheckIcon size={13} className="text-white" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <p className="text-lg font-bold text-gray-900">{nickname}</p>
                <button onClick={() => setEditingNick(true)} className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                  <Pencil size={11} className="text-gray-400" />
                </button>
              </div>
            )}

            {nickname !== name && (
              <p className="text-xs text-gray-400">Nome originale: {name}</p>
            )}
          </div>

          {/* Events stats */}
          <div className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Eventi in comune</p>
              <p className="text-2xl font-bold text-gray-900">{sharedEvents.length}</p>
            </div>
            {planningCount > 0 && (
              <div className="text-right">
                <p className="text-xs text-gray-500">In pianificazione</p>
                <p className="text-2xl font-bold text-primary">{planningCount}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button
              onClick={() => !blocked && setShowBlockConfirm(true)}
              disabled={blocked}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors ${blocked ? "bg-gray-100 text-gray-300 cursor-default" : "bg-red-50 text-red-500 active:bg-red-100"}`}
            >
              <Shield size={17} />
              <span className="font-semibold text-sm">{blocked ? "Utente bloccato" : "Blocca utente"}</span>
              {!blocked && <ChevronRight size={15} className="ml-auto text-red-300" />}
            </button>
            <button
              onClick={() => !reported && setShowReportConfirm(true)}
              disabled={reported}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors ${reported ? "bg-gray-100 text-gray-300 cursor-default" : "bg-orange-50 text-orange-500 active:bg-orange-100"}`}
            >
              <Flag size={17} />
              <span className="font-semibold text-sm">{reported ? "Utente segnalato" : "Segnala utente"}</span>
              {!reported && <ChevronRight size={15} className="ml-auto text-orange-300" />}
            </button>
          </div>
        </div>

        {/* Action Done */}
        {actionDone && (
          <div className={`mx-6 mb-5 flex items-center gap-2 px-4 py-2.5 rounded-xl ${actionDone === "blocked" ? "bg-red-50 text-red-500" : "bg-orange-50 text-orange-500"}`}>
            <CheckIcon size={14} />
            <p className="text-xs font-semibold">{actionDone === "blocked" ? "Utente bloccato con successo" : "Segnalazione inviata"}</p>
          </div>
        )}
      </div>

      {/* Block Confirm */}
      {showBlockConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 px-6">
          <div className="w-full max-w-xs bg-white rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Shield size={18} className="text-red-500" />
              </div>
              <h3 className="font-bold text-gray-900">Blocca {nickname}?</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">Non potrà più contattarti o vederti negli eventi condivisi.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowBlockConfirm(false)} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold">Annulla</button>
              <button onClick={handleBlock} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold">Blocca</button>
            </div>
          </div>
        </div>
      )}

      {/* Report Confirm */}
      {showReportConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 px-6">
          <div className="w-full max-w-xs bg-white rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                <Flag size={18} className="text-orange-500" />
              </div>
              <h3 className="font-bold text-gray-900">Segnala {nickname}?</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">La segnalazione verrà inviata al team di LineUp per revisione.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowReportConfirm(false)} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold">Annulla</button>
              <button onClick={handleReport} className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold">Segnala</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── LocalStorage helpers for chat names ─── */
const LS_KEY = "lineup-chat-names";
function loadChatNames(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? "{}"); } catch { return {}; }
}
function saveChatName(eventId: number, name: string) {
  const all = loadChatNames();
  all[String(eventId)] = name;
  localStorage.setItem(LS_KEY, JSON.stringify(all));
}

interface Msg { id: number; eventId: number; senderName: string; content: string; createdAt: string; }
interface Vote { id: number; eventId: number; voterName: string; voteType: string; voteValue: string; }
interface Proposal { id: number; eventId: number; proposerName: string; proposalType: string; proposalValue: string; status: string; createdAt: string; }

/* ─── Helpers ─── */
function getMostVoted(votes: Vote[], type: string): string | null {
  const counts: Record<string, number> = {};
  votes.filter(v => v.voteType === type).forEach(v => {
    counts[v.voteValue] = (counts[v.voteValue] || 0) + 1;
  });
  if (!Object.keys(counts).length) return null;
  return Object.entries(counts).sort(([, a], [, b]) => b - a)[0][0];
}

function getVoters(votes: Vote[], type: string, value: string): string[] {
  return votes.filter(v => v.voteType === type && v.voteValue === value).map(v => v.voterName);
}

/* ─── Helpers per il calendario ─── */
const WEEK_HEADERS = ["L","M","M","G","V","S","D"];
function idxToTime(i: number) {
  const h = Math.floor(i / 4);
  const m = (i % 4) * 15;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
}

/* ─── CreatorOptionsSheet ─── */
function CreatorOptionsSheet({
  event, onConfirm, onClose,
}: {
  event: ReturnType<typeof parseEvent>;
  onConfirm: (opts: Array<{ type: string; value: string }>) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"date" | "time" | "venue">("venue");

  // ── Date multi-select ──
  const [calMonth, setCalMonth] = useState(() => new Date());
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  // ── Time list ──
  const [timeIdx, setTimeIdx] = useState(72);
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);

  // ── Venue multi-select ──
  const [venueSearch, setVenueSearch] = useState("");
  const [selectedVenues, setSelectedVenues] = useState<string[]>([]);

  const today = new Date();
  const yr = calMonth.getFullYear();
  const mo = calMonth.getMonth();
  const firstDow = (new Date(yr, mo, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(yr, mo + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const isPastDay = (day: number) => {
    const d = new Date(yr, mo, day);
    return d < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  };
  const isToday = (day: number) =>
    yr === today.getFullYear() && mo === today.getMonth() && day === today.getDate();

  const toggleDay = (day: number) => {
    if (isPastDay(day)) return;
    const label = `${DAYS_IT[(new Date(yr, mo, day).getDay())] } ${day}`;
    setSelectedDays(prev => prev.includes(label) ? prev.filter(d => d !== label) : [...prev, label]);
  };

  const addTime = () => {
    const t = idxToTime(timeIdx);
    if (!selectedTimes.includes(t)) setSelectedTimes(prev => [...prev, t]);
  };

  const activityKey = event.activity.split("/")[0].trim().toLowerCase();
  const allVenues = VENUES_BY_ACTIVITY[activityKey] ?? VENUES_BY_ACTIVITY["altro"] ?? [];
  const filteredVenues = venueSearch.trim()
    ? allVenues.filter(v => v.name.toLowerCase().includes(venueSearch.toLowerCase()))
    : allVenues;

  const existingDates  = new Set(event.dateOptions);
  const existingTimes  = new Set(event.timeOptions);
  const existingVenues = new Set(event.venueOptions.map(v => v.name));

  const newDates  = selectedDays.filter(d => !existingDates.has(d));
  const newTimes  = selectedTimes.filter(t => !existingTimes.has(t));
  const newVenues = selectedVenues.filter(v => !existingVenues.has(v));
  const total = newDates.length + newTimes.length + newVenues.length;

  const handleSave = () => {
    const opts: Array<{ type: string; value: string }> = [
      ...newVenues.map((vn) => {
        const full = allVenues.find((v) => v.name === vn);
        return { type: "venue", value: full ? JSON.stringify(full) : vn };
      }),
      ...newDates.map((d) => ({ type: "date", value: d })),
      ...newTimes.map((t) => ({ type: "time", value: t })),
    ];
    if (opts.length > 0) onConfirm(opts);
    else onClose();
  };

  const TABS: { key: "date" | "time" | "venue"; label: string }[] = [
    { key: "venue", label: "Luoghi" },
    { key: "date",  label: "Date" },
    { key: "time",  label: "Orari" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end pb-14" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative z-10 bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[88vh]" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-1 shrink-0" />
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 shrink-0">
          <h3 className="font-bold text-gray-900 text-sm">Aggiungi opzioni al sondaggio</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100">
            <X size={14} className="text-gray-500" />
          </button>
        </div>
        {/* Tabs */}
        <div className="flex px-3 pt-2 pb-0 gap-1 shrink-0">
          {TABS.map(t => {
            const count = t.key === "date" ? newDates.length : t.key === "time" ? newTimes.length : newVenues.length;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  tab === t.key
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {t.label}
                {count > 0 && (
                  <span className={`text-[9px] font-bold min-w-[1rem] h-4 px-0.5 rounded-full flex items-center justify-center ${
                    tab === t.key ? "bg-white text-primary" : "bg-primary text-white"
                  }`}>{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto no-scrollbar">

          {/* ── DATA ── */}
          {tab === "date" && (
            <>
              <div className="flex items-center justify-between px-5 pt-4 pb-2">
                <button onClick={() => setCalMonth(new Date(yr, mo - 1, 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
                  <ChevronLeft size={18} className="text-gray-500" />
                </button>
                <span className="text-sm font-bold text-gray-900">{MONTHS_IT[mo]} {yr}</span>
                <button onClick={() => setCalMonth(new Date(yr, mo + 1, 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
                  <ChevronRight size={18} className="text-gray-500" />
                </button>
              </div>
              <div className="grid grid-cols-7 px-3 mb-1">
                {WEEK_HEADERS.map((h, i) => (
                  <div key={i} className="text-center text-[11px] font-semibold text-gray-400 py-1">{h}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 px-3 gap-y-1 pb-3">
                {cells.map((day, i) => {
                  if (!day) return <div key={i} />;
                  const label = `${DAYS_IT[new Date(yr, mo, day).getDay()]} ${day}`;
                  const past = isPastDay(day);
                  const tod = isToday(day);
                  const sel = selectedDays.includes(label);
                  const exists = existingDates.has(label);
                  return (
                    <button key={i} onClick={() => toggleDay(day)} disabled={past || exists}
                      className={`mx-auto flex items-center justify-center w-9 h-9 rounded-full text-sm font-medium transition-all ${
                        past || exists ? "text-gray-300 cursor-default" :
                        sel  ? "bg-primary text-white" :
                        tod  ? "ring-2 ring-primary text-primary" :
                        "text-gray-800 active:bg-gray-100"
                      }`}>
                      {day}
                    </button>
                  );
                })}
              </div>
              {selectedDays.length > 0 && (
                <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                  {selectedDays.map(d => (
                    <span key={d} className="flex items-center gap-1 text-xs font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                      {d}
                      <button onClick={() => setSelectedDays(prev => prev.filter(x => x !== d))}>
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── ORARIO ── */}
          {tab === "time" && (
            <div className="px-5 py-5 space-y-4">
              <div className="rounded-2xl bg-gray-50 border border-gray-100 px-5 pt-4 pb-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Scegli orario</span>
                  <span className="text-lg font-bold text-gray-900">{idxToTime(timeIdx)}</span>
                </div>
                <input type="range" className="time-slider w-full"
                  min={0} max={95} step={1} value={timeIdx}
                  onChange={e => setTimeIdx(+e.target.value)} />
                <div className="flex justify-between text-[10px] text-gray-400 mt-2">
                  <span>00:00</span><span>12:00</span><span>23:45</span>
                </div>
              </div>
              <button
                onClick={addTime}
                disabled={existingTimes.has(idxToTime(timeIdx)) || selectedTimes.includes(idxToTime(timeIdx))}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-primary text-sm text-primary font-semibold disabled:opacity-40 active:bg-primary/15 transition-colors"
              >
                <Plus size={15} /> Aggiungi {idxToTime(timeIdx)}
              </button>
              {selectedTimes.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedTimes.map(t => (
                    <span key={t} className="flex items-center gap-1 text-xs font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                      {t}
                      <button onClick={() => setSelectedTimes(prev => prev.filter(x => x !== t))}>
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── LUOGO ── */}
          {tab === "venue" && (
            <div className="px-4 pt-4 pb-4 space-y-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Cerca un posto..."
                  value={venueSearch} onChange={e => setVenueSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-gray-100 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              {filteredVenues.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">Nessun posto trovato</p>
              )}
              {filteredVenues.map(venue => {
                const sel = selectedVenues.includes(venue.name);
                const exists = existingVenues.has(venue.name);
                return (
                  <button key={venue.name} onClick={() => {
                    if (exists) return;
                    setSelectedVenues(prev => sel ? prev.filter(v => v !== venue.name) : [...prev, venue.name]);
                  }}
                    className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
                      exists ? "border-gray-100 bg-gray-50 opacity-40 cursor-default" :
                      sel ? "border-primary bg-primary/10" : "border-gray-100 bg-white active:bg-gray-50"
                    }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-gray-900">{venue.name}</p>
                          {sel && <CheckCircle2 size={14} className="text-primary" />}
                          {exists && <span className="text-[10px] text-gray-400 font-medium">già presente</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="flex items-center gap-0.5 text-xs text-amber-500 font-semibold">
                            <Star size={10} fill="currentColor" />{venue.rating}
                          </span>
                          <span className="flex items-center gap-0.5 text-xs text-gray-400">
                            <MapPin size={10} />{venuePollSubtitle(venue)}
                          </span>
                        </div>
                      </div>
                      {venue.discount && (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg shrink-0">
                          <Tag size={10} />{venue.discount}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={handleSave}
            disabled={total === 0}
            className="w-full rounded-xl bg-gradient-to-br from-primary to-primary/75 py-3.5 font-semibold text-primary-foreground disabled:opacity-40"
          >
            {total === 0 ? "Seleziona almeno un'opzione" : `Aggiungi ${total} ${total === 1 ? "opzione" : "opzioni"}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── ProposeOptionSheet ─── */
function ProposeOptionSheet({
  type, eventActivity, onConfirm, onClose,
}: {
  type: "date" | "time" | "venue";
  eventActivity: string;
  onConfirm: (value: string) => void;
  onClose: () => void;
}) {
  // ── Stato calendario ──
  const [calMonth, setCalMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // ── Stato time slider ──
  const [timeIdx, setTimeIdx] = useState(72); // default 18:00

  // ── Stato venue ──
  const [venueSearch, setVenueSearch] = useState("");
  const [selectedVenue, setSelectedVenue] = useState<VenueOption | null>(null);

  const today = new Date();
  const yr = calMonth.getFullYear();
  const mo = calMonth.getMonth();
  const firstDow = (new Date(yr, mo, 1).getDay() + 6) % 7; // 0=Lun
  const daysInMonth = new Date(yr, mo + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const toggleDay = (day: number) => {
    const d = new Date(yr, mo, day);
    const isPast = d < new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (isPast) return;
    const label = `${DAYS_IT[d.getDay()]} ${day}`;
    setSelectedDay(prev => prev === label ? null : label);
  };

  const isPastDay = (day: number) => {
    const d = new Date(yr, mo, day);
    return d < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  };

  const isToday = (day: number) =>
    yr === today.getFullYear() && mo === today.getMonth() && day === today.getDate();

  // Venue list
  const activityKey = eventActivity.split("/")[0].trim().toLowerCase();
  const allVenues = VENUES_BY_ACTIVITY[activityKey] ?? VENUES_BY_ACTIVITY["altro"] ?? [];
  const filteredVenues = venueSearch.trim()
    ? allVenues.filter(v => v.name.toLowerCase().includes(venueSearch.toLowerCase()))
    : allVenues;

  const canConfirm =
    type === "date"  ? !!selectedDay :
    type === "time"  ? true :
    !!selectedVenue;

  const handleConfirm = () => {
    if (type === "date" && selectedDay)    onConfirm(selectedDay);
    else if (type === "time")              onConfirm(idxToTime(timeIdx));
    else if (type === "venue" && selectedVenue) onConfirm(JSON.stringify(selectedVenue));
  };

  const titles: Record<string, string> = { date: "Proponi una data", time: "Proponi un orario", venue: "Proponi un luogo" };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end pb-14" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Sheet */}
      <div className="relative z-10 bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        {/* Handle */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-1 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
          <h3 className="font-bold text-gray-900 text-base">{titles[type]}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto no-scrollbar">

          {/* ── DATA: calendario ── */}
          {type === "date" && (
            <>
              <div className="flex items-center justify-between px-5 pt-4 pb-2">
                <button
                  onClick={() => setCalMonth(new Date(yr, mo - 1, 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                >
                  <ChevronLeft size={18} className="text-gray-500" />
                </button>
                <span className="text-sm font-bold text-gray-900">{MONTHS_IT[mo]} {yr}</span>
                <button
                  onClick={() => setCalMonth(new Date(yr, mo + 1, 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                >
                  <ChevronRight size={18} className="text-gray-500" />
                </button>
              </div>

              <div className="grid grid-cols-7 px-3 mb-1">
                {WEEK_HEADERS.map((h, i) => (
                  <div key={i} className="text-center text-[11px] font-semibold text-gray-400 py-1">{h}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 px-3 gap-y-1 pb-4">
                {cells.map((day, i) => {
                  if (!day) return <div key={i} />;
                  const d = new Date(yr, mo, day);
                  const label = `${DAYS_IT[d.getDay()]} ${day}`;
                  const sel = selectedDay === label;
                  const past = isPastDay(day);
                  const tod = isToday(day);
                  return (
                    <button
                      key={i}
                      onClick={() => toggleDay(day)}
                      disabled={past}
                      className={`mx-auto flex items-center justify-center w-9 h-9 rounded-full text-sm font-medium transition-all ${
                        past ? "text-gray-300 cursor-default" :
                        sel  ? "bg-black text-white" :
                        tod  ? "ring-2 ring-black text-black" :
                        "text-gray-800 hover:bg-gray-100"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* ── ORARIO: slider ── */}
          {type === "time" && (
            <div className="px-6 py-8">
              <div className="rounded-2xl bg-gray-50 border border-gray-100 px-5 pt-4 pb-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Orario proposto</span>
                  <span className="text-lg font-bold text-gray-900">{idxToTime(timeIdx)}</span>
                </div>
                <input
                  type="range"
                  className="time-slider w-full"
                  min={0} max={95} step={1}
                  value={timeIdx}
                  onChange={e => setTimeIdx(+e.target.value)}
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-2">
                  <span>00:00</span>
                  <span>12:00</span>
                  <span>23:45</span>
                </div>
              </div>
            </div>
          )}

          {/* ── LUOGO: lista venue ── */}
          {type === "venue" && (
            <div className="px-4 pt-4 pb-4 space-y-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cerca un posto..."
                  value={venueSearch}
                  onChange={e => setVenueSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-gray-100 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {filteredVenues.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">Nessun posto trovato</p>
              )}

              {filteredVenues.map(venue => {
                const isSel = selectedVenue?.name === venue.name;
                return (
                  <button
                    key={venue.name}
                    onClick={() => setSelectedVenue(isSel ? null : venue)}
                    className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
                      isSel ? "border-primary bg-primary/10" : "border-gray-100 bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-gray-900">{venue.name}</p>
                          {isSel && <CheckCircle2 size={14} className="text-primary" />}
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
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="w-full rounded-xl bg-gradient-to-br from-primary to-primary/75 py-3.5 font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
          >
            Conferma proposta
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Recap Banner ─── */
function RecapBanner({
  event, votes, expanded, onToggle, onVote, onOpenPropose, currentUser, alwaysExpanded, isCreator,
}: {
  event: ReturnType<typeof parseEvent>;
  votes: Vote[];
  expanded: boolean;
  onToggle: () => void;
  onVote: (type: string, value: string) => void;
  onOpenPropose: (type: string) => void;
  currentUser: string;
  alwaysExpanded?: boolean;
  isCreator: boolean;
}) {
  const surveyMode = parseSurveyMode(event.surveyMode);
  const behavior = surveyBehavior(surveyMode);
  const showPollPropose = isCreator || behavior.memberProposals !== "off";
  const isPlanning = event.status === "planning";
  const topDate = isPlanning
    ? getMostVoted(votes, "date") ?? (event.dateOptions.length === 1 ? event.dateOptions[0] ?? null : null)
    : event.confirmedDate;
  const topTime = isPlanning
    ? getMostVoted(votes, "time") ?? (event.timeOptions.length === 1 ? event.timeOptions[0] ?? null : null)
    : event.confirmedTime;
  const topVenue = isPlanning
    ? getMostVoted(votes, "venue") ?? (event.venueOptions.length === 1 ? event.venueOptions[0]?.name ?? null : null)
    : event.confirmedVenue;

  const myVote = (type: string, val: string) =>
    votes.some(v => v.voterName === currentUser && v.voteType === type && v.voteValue === val);

  const venueMetaForName = (name: string | null | undefined) =>
    name ? event.venueOptions.find((v) => v.name === name) : undefined;

  const summaryInner = (
    <div
      className={
        isPlanning
          ? "flex min-w-0 flex-1 items-center gap-3 text-left text-blue-50"
          : "flex min-w-0 flex-1 items-center gap-3 text-left"
      }
    >
      {!topVenue && !topDate && !topTime ? (
        <span
          className={
            isPlanning ? "text-xs italic text-blue-200" : "text-xs text-muted-foreground italic"
          }
        >
          Nessun voto ancora — tocca per votare
        </span>
      ) : (
        <>
          {topVenue && (
            <span
              className={
                isPlanning
                  ? "flex min-w-0 items-center gap-1 truncate text-xs font-semibold text-white"
                  : "flex min-w-0 items-center gap-1 truncate text-xs font-semibold text-foreground"
              }
            >
              <MapPin size={11} className={isPlanning ? "text-blue-200" : "text-emerald-500"} />
              {topVenue}
            </span>
          )}
          {topDate && (
            <span
              className={
                isPlanning
                  ? "flex shrink-0 items-center gap-1 text-xs font-semibold text-white"
                  : "flex shrink-0 items-center gap-1 text-xs font-semibold text-foreground"
              }
            >
              <Clock size={11} className={isPlanning ? "text-blue-200" : "text-emerald-500"} />
              {topDate}{topTime ? ` · ${topTime}` : ""}
            </span>
          )}
          {isPlanning && (
            <span className="shrink-0 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              più votato
            </span>
          )}
          {!isPlanning && (
            <span className="shrink-0 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
              confermato ✓
            </span>
          )}
        </>
      )}
    </div>
  );

  return (
    <div
      className={
        isPlanning
          ? "border-b border-blue-800/35 bg-blue-600"
          : "border-b border-border bg-gradient-to-b from-emerald-500/[0.08] to-background"
      }
    >
      {/* Riga riepilogo: niente <button> se il pannello è sempre aperto (evita conflitti con i voti sotto). */}
      {alwaysExpanded ? (
        <div className="flex w-full items-center gap-2 px-3 py-2">{summaryInner}</div>
      ) : (
        <button
          data-testid="button-toggle-banner"
          type="button"
          onClick={onToggle}
          className="flex w-full items-center gap-2 px-3 py-2"
        >
          {summaryInner}
          {isPlanning &&
            (expanded ? (
              <ChevronUp size={16} className="shrink-0 text-blue-200" />
            ) : (
              <ChevronDown size={16} className="shrink-0 text-blue-200/80" />
            ))}
        </button>
      )}
      {(() => {
        const vm = venueMetaForName(topVenue);
        if (!vm || (!vm.mapsUrl && !vm.websiteUrl && !vm.instagramUrl)) return null;
        return (
          <div className={isPlanning ? "mx-3 mb-1 rounded-lg bg-white/10 px-3 py-2" : "px-4 pb-2 pt-0"}>
            <VenueExternalLinks venue={vm} compact />
          </div>
        );
      })()}

      {/* Expanded voting — sfondo blu, opzioni su riquadri bianchi */}
      {(expanded || alwaysExpanded) && isPlanning && (
        <div className="px-2 pb-2.5 pt-0.5">
          {[
            {
              label: "Dove?",
              type: "venue",
              options: event.venueOptions.map((v) => ({
                key: v.name,
                label: v.name,
                venue: v,
                sub: [
                  { icon: <Star size={8} fill="currentColor" className="text-amber-400" />, text: String(v.rating) },
                  { icon: <MapPin size={8} className="text-muted-foreground" />, text: venuePollSubtitle(v) },
                  ...(v.discount ? [{ icon: <Tag size={8} className="text-emerald-500" />, text: v.discount }] : []),
                ],
              })),
            },
            { label: "Che giorno?", type: "date", options: event.dateOptions.map(d => ({ key: d, label: d, sub: null as null })) },
            { label: "Che ora?",    type: "time", options: event.timeOptions.map(t => ({ key: t, label: t, sub: null as null })) },
          ].map(section => {
            if (!section.options.length) return null;
            const isVotable = section.options.length > 1;

            if (!isVotable) {
              return (
                <Card key={section.type} className="mb-2 border-0 bg-transparent text-white shadow-none">
                  <CardHeader className="flex flex-row flex-wrap items-center gap-1.5 space-y-0 p-0 px-1 py-2 pb-1.5">
                    <CardTitle className="text-xs font-bold text-white">{section.label}</CardTitle>
                    <Badge variant="secondary" className="border-0 bg-white/20 text-[9px] font-semibold text-white px-1.5 py-0">
                      Predefinito dall&apos;organizzatore
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-1.5 p-0 px-1 pb-2 pt-0">
                    {section.options.map((opt) => (
                      <div
                        key={opt.key}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-left shadow-sm"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100">
                            <CheckCircle2 size={12} className="text-gray-500" strokeWidth={2.5} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold leading-tight text-gray-900">{opt.label}</span>
                            {opt.sub && (
                              <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                                {opt.sub.map((s, i) => (
                                  <span key={i} className="flex items-center gap-0.5 text-[11px] font-medium text-gray-500">
                                    {s.icon}{s.text}
                                  </span>
                                ))}
                              </div>
                            )}
                            {section.type === "venue" && "venue" in opt && opt.venue && (
                              <VenueExternalLinks venue={opt.venue} compact className="mt-1.5" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                  {showPollPropose && (
                    <CardFooter className="rounded-b-lg border-t border-gray-200 bg-white p-0">
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-9 w-full justify-start gap-1.5 rounded-none px-3 text-xs font-semibold text-primary hover:bg-gray-50"
                        onClick={() => onOpenPropose(section.type)}
                      >
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-primary/40 text-xs leading-none">
                          +
                        </span>
                        Proponi un&apos;altra opzione (attiva il voto)
                      </Button>
                    </CardFooter>
                  )}
                </Card>
              );
            }

            const myVotedHere = section.options.some((o) => myVote(section.type, o.key));
            const maxVoters = Math.max(...section.options.map((o) => getVoters(votes, section.type, o.key).length), 0);
            const totalBallots = section.options.reduce(
              (s, o) => s + getVoters(votes, section.type, o.key).length,
              0,
            );

            return (
              <Card key={section.type} className="mb-2 border-0 bg-transparent text-white shadow-none">
                <CardHeader className="flex flex-row flex-wrap items-center gap-1.5 space-y-0 p-0 px-1 py-2 pb-1.5">
                  <CardTitle className="text-xs font-bold text-white">{section.label}</CardTitle>
                  {behavior.compactTwoOptionsHint && section.options.length > 1 && (
                    <Badge variant="outline" className="h-4 border-white/40 bg-white/10 px-1 py-0 text-[8px] font-semibold text-white">
                      max 2 preferenze
                    </Badge>
                  )}
                  {!myVotedHere && (
                    <span className="ml-auto text-[10px] font-medium text-blue-100">tocca per votare</span>
                  )}
                </CardHeader>
                <CardContent className="space-y-1.5 p-0 px-1 pb-2 pt-0">
                  {section.options.map((opt) => {
                    const voters = getVoters(votes, section.type, opt.key);
                    const mine = myVote(section.type, opt.key);
                    const isTop = voters.length > 0 && voters.length === maxVoters;
                    const sub =
                      opt.sub != null ? (
                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                          {opt.sub.map((s, i) => (
                            <span key={i} className="flex items-center gap-0.5 text-[11px] font-medium text-gray-500">
                              {s.icon}
                              {s.text}
                            </span>
                          ))}
                        </div>
                      ) : undefined;

                    return (
                      <div
                        key={opt.key}
                        className="overflow-hidden rounded-lg border border-gray-200/90 bg-white shadow-sm"
                      >
                        <PollOptionButton
                          variant="onBlue"
                          label={opt.label}
                          sub={sub}
                          voters={voters}
                          totalBallots={totalBallots}
                          selected={mine}
                          onClick={() => onVote(section.type, opt.key)}
                          data-testid={`banner-vote-${section.type}-${opt.key}`}
                          showTopBadge={isTop && voters.length > 0}
                        />
                        {section.type === "venue" && "venue" in opt && opt.venue && (
                          <div className="border-t border-gray-100 bg-white px-2.5 py-1.5">
                            <VenueExternalLinks venue={opt.venue} compact />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
                {showPollPropose && (
                  <CardFooter className="rounded-b-lg border-t border-gray-200 bg-white p-0">
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-9 w-full justify-start gap-1.5 rounded-none px-3 text-xs font-semibold text-primary hover:bg-gray-50"
                      onClick={() => onOpenPropose(section.type)}
                    >
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-primary/40 text-xs leading-none">
                        +
                      </span>
                      Proponi un&apos;opzione
                    </Button>
                  </CardFooter>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Event Switcher ─── */
function formatActivityLabel(activity: string): string {
  return activity.split("/").map(s => {
    const t = s.trim();
    return t.charAt(0).toUpperCase() + t.slice(1);
  }).join(" / ");
}

function EventSwitcher({
  events, activeId, onChange,
}: {
  events: ReturnType<typeof parseEvent>[];
  activeId: number;
  onChange: (id: number) => void;
}) {
  if (events.length === 0) return null;
  return (
    <div className="overflow-x-auto border-b border-border bg-card">
      <div className="flex items-center gap-2 px-4 py-2" style={{ minWidth: "max-content" }}>
        {events.map(e => {
          const active = e.id === activeId;
          const label = e.status === "confirmed"
            ? `${e.confirmedDate} · ${e.confirmedTime}`
            : e.dateOptions.length > 0
            ? `${e.dateOptions[0]}${e.dateOptions.length > 1 ? ` +${e.dateOptions.length - 1}` : ""}`
            : "Da decidere";
          return (
            <button
              key={e.id}
              data-testid={`event-tab-${e.id}`}
              onClick={() => onChange(e.id)}
              className={`flex shrink-0 items-center gap-2 rounded-xl border-2 px-3 py-2 transition-all ${
                active
                  ? "border-foreground bg-foreground shadow-sm"
                  : "border-border bg-background hover:border-primary/35"
              }`}
            >
              <div className="text-left">
                <p className={`text-xs font-bold leading-tight ${active ? "text-background" : "text-foreground"}`}>
                  {formatActivityLabel(e.activity)}
                </p>
                <p className={`text-[10px] leading-tight ${active ? "text-white/90" : "text-muted-foreground"}`}>{label}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Main ─── */
export default function AppChatDetail() {
  const [, params] = useRoute("/events/:id/chat");
  const initialId = parseInt(params?.id ?? "0");
  const [activeEventId, setActiveEventId] = useState(initialId);
  const [view, setView] = useState<"vote" | "chat">("vote");
  const [text, setText] = useState("");
  const [bannerExpanded, setBannerExpanded] = useState(true);
  const [proposeSheetType, setProposeSheetType] = useState<"date" | "time" | "venue" | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [chatNames, setChatNames] = useState<Record<string, string>>(loadChatNames);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUnconfirmCalendar, setShowUnconfirmCalendar] = useState(false);
  const [profileUser, setProfileUser] = useState<string | null>(null);
  const [showVoteBanner, setShowVoteBanner] = useState(false);
  const voteBannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showCreatorOptions, setShowCreatorOptions] = useState(false);
  const [proposalSheetType, setProposalSheetType] = useState<"date" | "time" | "venue" | null>(null);
  const [showProposalTypeChooser, setShowProposalTypeChooser] = useState(false);
  const [contactNames, setContactNames] = useState<Record<string, string>>(loadContactNames);
  const [showChatLockedBanner, setShowChatLockedBanner] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const chatLockedBannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const currentUser = getCurrentUser();
  const [, navigate] = useLocation();

  // Sync activeEventId when URL param changes (direct navigation)
  useEffect(() => {
    const id = parseInt(params?.id ?? "0");
    if (id && id !== activeEventId) {
      setActiveEventId(id);
      setBannerExpanded(false);
      setText("");
      setEditingName(false);
      setShowChatLockedBanner(false);
    }
  }, [params?.id]);

  // All events (for switcher — find events sharing participants)
  const { data: allRaw } = useQuery<any[]>({ queryKey: ["/api/app/events"] });
  const allEvents = useMemo(() => (allRaw || []).map(parseEvent), [allRaw]);

  // Helper: fetch che lancia errore su risposta non-OK
  const safeFetch = (url: string) =>
    fetch(url).then(async r => {
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json();
    });

  // Active event
  const { data: rawEvent } = useQuery<any>({
    queryKey: ["/api/app/events", activeEventId],
    queryFn: () => safeFetch(`/api/app/events/${activeEventId}`),
    enabled: !!activeEventId,
  });
  // Guard: rawEvent deve avere id valido, altrimenti l'evento è stato eliminato
  const activeEvent = useMemo(
    () => (rawEvent?.id ? parseEvent(rawEvent) : null),
    [rawEvent],
  );

  const inviteChatUrl = useMemo(() => getEventChatInviteUrl(activeEventId), [activeEventId]);

  const copyInviteChatLink = async () => {
    if (!inviteChatUrl) return;
    try {
      await navigator.clipboard.writeText(inviteChatUrl);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    } catch {
      toast({
        title: "Impossibile copiare",
        description: "Seleziona il link e copialo manualmente.",
        variant: "destructive",
      });
    }
  };

  // Related events: same non-"Io" participants (exact match for switcher tabs)
  const relatedEvents = useMemo(() => {
    if (!activeEvent) return [];
    const aKey = activeEvent.participants.filter(p => p !== currentUser).sort().join("|");
    if (!aKey) return [];
    return allEvents.filter(e => {
      const eKey = e.participants.filter(p => p !== currentUser).sort().join("|");
      return aKey === eKey;
    });
  }, [activeEvent, allEvents, currentUser]);

  // Votes — safeFetch garantisce array o errore (mai oggetto non-array)
  const { data: votes = [] } = useQuery<Vote[]>({
    queryKey: ["/api/app/events", activeEventId, "votes"],
    queryFn: () => safeFetch(`/api/app/events/${activeEventId}/votes`),
    enabled: !!activeEventId,
    refetchInterval: view === "vote" ? 5000 : false,
    refetchOnWindowFocus: false,
    select: (data) => (Array.isArray(data) ? data : []),
  });

  // Messages — safeFetch garantisce array o errore (mai oggetto non-array)
  const { data: messages = [], isFetching: isFetchingMessages } = useQuery<Msg[]>({
    queryKey: ["/api/app/events", activeEventId, "messages"],
    queryFn: () => safeFetch(`/api/app/events/${activeEventId}/messages`),
    enabled: !!activeEventId,
    refetchInterval: view === "chat" ? 3000 : false,
    refetchOnWindowFocus: false,
    staleTime: 10000,
    placeholderData: (prev) => prev,
    select: (data) => (Array.isArray(data) ? data : []),
  });

  // Send message
  const { mutate: sendMessage, isPending } = useMutation({
    mutationFn: (content: string) =>
      apiRequest("POST", `/api/app/events/${activeEventId}/messages`, {
        senderName: currentUser, content,
      }),
    onSuccess: () => {
      setText("");
      queryClient.invalidateQueries({ queryKey: ["/api/app/events", activeEventId, "messages"] });
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    },
    onError: (err: Error) => {
      const msg = err.message?.includes("403")
        ? "Completa tutte le votazioni obbligatorie (giorno, ora, luogo) prima di scrivere in chat."
        : "Impossibile inviare il messaggio.";
      toast({ title: "Chat non disponibile", description: msg, variant: "destructive" });
    },
  });

  // Vote
  const { mutate: castVote } = useMutation({
    mutationFn: async ({ voteType, voteValue }: { voteType: string; voteValue: string }) => {
      const res = await apiRequest("POST", `/api/app/events/${activeEventId}/votes`, {
        voterName: currentUser, voteType, voteValue,
      });
      return res.json() as Promise<{ id?: number; toggled?: boolean }>;
    },
    onSuccess: (data) => {
      if (data && data.id) {
        if (voteBannerTimer.current) clearTimeout(voteBannerTimer.current);
        setShowVoteBanner(true);
        voteBannerTimer.current = setTimeout(() => setShowVoteBanner(false), 2000);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/app/events", activeEventId, "votes"] });
    },
    onError: (err: Error) => {
      toast({
        title: "Voto non registrato",
        description: err.message || "Controlla la connessione e riprova.",
        variant: "destructive",
      });
    },
  });

  // Delete event
  const { mutate: deleteEvent, isPending: isDeleting } = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/app/events/${activeEventId}`),
    onSuccess: () => {
      // Rimuovi dalla cache le query dell'evento eliminato (evita refetch verso 404)
      queryClient.removeQueries({ queryKey: ["/api/app/events", activeEventId] });
      // Aggiorna la lista eventi
      queryClient.invalidateQueries({ queryKey: ["/api/app/events"] });
      setShowDeleteConfirm(false);
      navigate("/chat");
    },
  });

  // Conferma evento sul server
  const { mutate: confirmEvent } = useMutation({
    mutationFn: ({ confirmedDate, confirmedTime, confirmedVenue }: { confirmedDate: string; confirmedTime: string; confirmedVenue: string }) =>
      apiRequest("PUT", `/api/app/events/${activeEventId}/confirm`, { confirmedDate, confirmedTime, confirmedVenue }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/app/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/app/events", activeEventId] });
    },
  });

  // Proposta nuova opzione di voto diretta (creatore)
  const { mutate: proposeOption } = useMutation({
    mutationFn: ({ type, value }: { type: string; value: string }) =>
      apiRequest("POST", `/api/app/events/${activeEventId}/options`, { type, value, addedBy: currentUser }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/app/events", activeEventId] });
      queryClient.invalidateQueries({ queryKey: ["/api/app/events"] });
    },
  });

  // Proposals (non-creator suggestions pending approval)
  const { data: proposals = [] } = useQuery<Proposal[]>({
    queryKey: ["/api/app/events", activeEventId, "proposals"],
    queryFn: () => fetch(`/api/app/events/${activeEventId}/proposals`).then(r => r.json()),
    enabled: !!activeEventId,
    refetchInterval: view === "vote" ? 5000 : false,
    refetchOnWindowFocus: false,
    select: (data) => (Array.isArray(data) ? data : []),
  });

  const { mutate: createProposal, isPending: isProposing } = useMutation({
    mutationFn: ({ proposalType, proposalValue }: { proposalType: string; proposalValue: string }) =>
      apiRequest("POST", `/api/app/events/${activeEventId}/proposals`, {
        proposerName: currentUser, proposalType, proposalValue,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/app/events", activeEventId, "proposals"] });
    },
  });

  const { mutate: respondProposal } = useMutation({
    mutationFn: ({ id, status }: { id: number; status: "approved" | "rejected" }) =>
      apiRequest("PUT", `/api/app/proposals/${id}`, { status, creatorName: currentUser }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/app/events", activeEventId, "proposals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/app/events", activeEventId] });
      queryClient.invalidateQueries({ queryKey: ["/api/app/events"] });
    },
  });

  // Attendance helpers
  const myAttendance = votes.find(
    v => v.voterName === currentUser && v.voteType === "attendance"
  )?.voteValue ?? null;

  const isDeclined = myAttendance === "no";

  // Solo il creatore può confermare l'evento
  const isCreator = currentUser === activeEvent?.createdBy;
  const isConfirmed = activeEvent?.status === "confirmed";

  type AppJoinRequestRow = {
    id: number;
    eventId: number;
    requesterName: string;
    status: string;
    createdAt?: string;
  };

  const { data: joinRequests = [] } = useQuery<AppJoinRequestRow[]>({
    queryKey: ["/api/app/events", activeEventId, "join-requests", currentUser],
    queryFn: () =>
      safeFetch(
        `/api/app/events/${activeEventId}/join-requests?forUser=${encodeURIComponent(currentUser)}`,
      ),
    enabled:
      Boolean(activeEventId) &&
      Boolean(activeEvent && currentUser === activeEvent.createdBy),
    refetchInterval: 8000,
  });

  const { mutate: resolveJoinRequest } = useMutation({
    mutationFn: ({ id, status }: { id: number; status: "accepted" | "rejected" }) =>
      apiRequest("PUT", `/api/app/join-requests/${id}`, { status, resolverName: currentUser }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/app/events", activeEventId, "join-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/app/events", activeEventId] });
      queryClient.invalidateQueries({ queryKey: ["/api/app/events"] });
      toast({ title: "Richiesta aggiornata" });
    },
    onError: () => {
      toast({ title: "Operazione non riuscita", variant: "destructive" });
    },
  });

  const { mutate: unconfirmFromCalendar, isPending: unconfirmingCalendar } = useMutation({
    mutationFn: () =>
      apiRequest("PUT", `/api/app/events/${activeEventId}/unconfirm`, { actorName: currentUser }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/app/events", activeEventId] });
      queryClient.invalidateQueries({ queryKey: ["/api/app/events"] });
      setShowUnconfirmCalendar(false);
      toast({
        title: "Rimosso dal calendario",
        description: "L'evento è tornato in pianificazione: potete votare di nuovo.",
      });
    },
    onError: (e: Error) => {
      toast({ title: "Operazione non riuscita", description: e.message, variant: "destructive" });
    },
  });

  const canUseChat = useMemo(() => {
    if (!activeEvent) return false;
    return userHasCompletedVotablePoll(currentUser, activeEvent, votes);
  }, [activeEvent, currentUser, votes]);

  useEffect(() => {
    if (canUseChat) setShowChatLockedBanner(false);
  }, [canUseChat]);

  useEffect(() => {
    return () => {
      if (chatLockedBannerTimer.current) clearTimeout(chatLockedBannerTimer.current);
    };
  }, []);

  const showChatLockedNotice = () => {
    if (chatLockedBannerTimer.current) clearTimeout(chatLockedBannerTimer.current);
    setShowChatLockedBanner(true);
    chatLockedBannerTimer.current = setTimeout(() => {
      setShowChatLockedBanner(false);
      chatLockedBannerTimer.current = null;
    }, 4500);
  };

  const handleConfirmEvent = () => {
    if (!activeEvent || !isCreator || isConfirmed) return;
    const confirmedDate = getMostVoted(votes, "date") || activeEvent.dateOptions[0] || "";
    const confirmedTime = getMostVoted(votes, "time") || activeEvent.timeOptions[0] || "";
    const confirmedVenue = getMostVoted(votes, "venue") || (activeEvent.venueOptions[0]?.name ?? "");
    if (confirmedDate) {
      confirmEvent({ confirmedDate, confirmedTime, confirmedVenue });
    }
  };

  // Auto-conferma: tutti i partecipanti (individuali) allineati; giorno/ora/luogo unici usano il predefinito senza voto
  useEffect(() => {
    if (!activeEvent || isConfirmed || votes.length === 0) return;
    const groupNames = new Set(GROUPS.map(g => g.name));
    const individuals = activeEvent.participants.filter((p) => !groupNames.has(p));
    if (individuals.length < 2) return;

    const dateVotes = new Map<string, string>();
    const timeVotes = new Map<string, string>();
    const venueVotes = new Map<string, string>();
    votes.forEach((v) => {
      if (v.voteType === "date") dateVotes.set(v.voterName, v.voteValue);
      if (v.voteType === "time") timeVotes.set(v.voterName, v.voteValue);
      if (v.voteType === "venue") venueVotes.set(v.voterName, v.voteValue);
    });

    const first = individuals[0];
    const dateVal = (p: string) =>
      activeEvent.dateOptions.length <= 1 ? activeEvent.dateOptions[0] : dateVotes.get(p);
    const timeVal = (p: string) =>
      activeEvent.timeOptions.length <= 1 ? activeEvent.timeOptions[0] : timeVotes.get(p);
    const venueVal = (p: string) => {
      if (activeEvent.venueOptions.length === 0) return "";
      if (activeEvent.venueOptions.length <= 1) return activeEvent.venueOptions[0]?.name ?? "";
      return venueVotes.get(p);
    };

    const allSameDate =
      Boolean(dateVal(first)) && individuals.every((p) => dateVal(p) === dateVal(first));
    const allSameTime =
      Boolean(timeVal(first)) && individuals.every((p) => timeVal(p) === timeVal(first));
    const hasVenues = activeEvent.venueOptions.length > 0;
    const allSameVenue =
      !hasVenues ||
      (Boolean(venueVal(first)) && individuals.every((p) => venueVal(p) === venueVal(first)));

    if (allSameDate && allSameTime && allSameVenue) {
      confirmEvent({
        confirmedDate: String(dateVal(first)),
        confirmedTime: String(timeVal(first)),
        confirmedVenue: hasVenues ? String(venueVal(first)) : "",
      });
    }
  }, [votes, activeEvent?.id, isConfirmed]);

  useEffect(() => {
    if (view === "chat") {
      setTimeout(() => bottomRef.current?.scrollIntoView(), 50);
    }
  }, [messages, activeEventId, view]);

  useEffect(() => {
    if (view === "chat" && !canUseChat && activeEvent?.status === "planning") {
      setView("vote");
    }
  }, [view, canUseChat, activeEvent?.status]);

  // Switch event: reset view + scroll
  const switchEvent = (id: number) => {
    setActiveEventId(id);
    setView("vote");
    setText("");
    setEditingName(false);
    setShowChatLockedBanner(false);
  };

  const handleSend = () => {
    if (!text.trim() || isPending || !canUseChat) return;
    sendMessage(text.trim());
  };

  // Chat name: custom (from localStorage) or auto from participants
  const defaultName = activeEvent
    ? activeEvent.participants.filter(p => p !== currentUser).slice(0, 3).join(", ")
    : "Chat";
  const headerName = chatNames[String(activeEventId)] ?? defaultName;

  // Is 1:1 chat?
  const isOneToOne = (activeEvent?.participants.length ?? 0) === 2;

  // Name editing helpers
  const startEditing = () => {
    setNameInput(headerName);
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.focus(), 50);
  };
  const confirmName = () => {
    const trimmed = nameInput.trim();
    if (trimmed) {
      saveChatName(activeEventId, trimmed);
      setChatNames(loadChatNames());
    }
    setEditingName(false);
  };

  // Group messages by sender blocks
  type MsgWithGroup = Msg & { showSender: boolean; isFirst: boolean; isLast: boolean };
  const grouped: MsgWithGroup[] = useMemo(
    () =>
      messages.map((msg, i) => ({
        ...msg,
        showSender: i === 0 || messages[i - 1].senderName !== msg.senderName,
        isFirst: i === 0 || messages[i - 1].senderName !== msg.senderName,
        isLast: i === messages.length - 1 || messages[i + 1].senderName !== msg.senderName,
      })),
    [messages],
  );

  return (
    <div className="flex min-h-full flex-col bg-muted/40">

      {/* ─── Voto confermato banner ─── */}
      {showVoteBanner && (
        <div className="fixed top-[72px] left-1/2 -translate-x-1/2 z-[200] pointer-events-none">
          <div className="flex items-center gap-2 rounded-2xl bg-gradient-to-br from-primary to-primary/75 px-4 py-2.5 shadow-lg">
            <CheckIcon size={14} className="text-white shrink-0" />
            <span className="text-sm font-semibold text-white">Voto confermato</span>
          </div>
        </div>
      )}

      {/* ─── Header ─── */}
      <div className="bg-white shadow-sm shrink-0">
        <div className="flex items-center gap-3 px-4 pt-12 pb-3">
          <Link href="/chat">
            <button
              data-testid="button-back-chat"
              className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0"
            >
              <ArrowLeft size={18} className="text-gray-600" />
            </button>
          </Link>
          {activeEvent && (
            <div className="relative shrink-0">
              <div className="flex -space-x-1.5">
                {activeEvent.participants.filter(p => p !== currentUser).slice(0, 3).map(name => (
                  <button
                    key={name}
                    onClick={() => setProfileUser(name)}
                    className="w-9 h-9 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shrink-0 active:opacity-80 transition-opacity"
                    style={{ backgroundColor: getAvatarColor(name) }}>
                    {getInitials(name)}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-1.5">
                <input
                  ref={nameInputRef}
                  data-testid="input-chat-name"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") confirmName(); if (e.key === "Escape") setEditingName(false); }}
                  className="flex-1 text-sm font-bold text-gray-900 bg-gray-100 rounded-lg px-2 py-1 outline-none border border-primary min-w-0"
                  maxLength={40}
                />
                <button
                  data-testid="button-confirm-name"
                  onClick={confirmName}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary"
                >
                  <CheckIcon size={13} className="text-white" strokeWidth={3} />
                </button>
              </div>
            ) : (
              <button
                data-testid="button-edit-name"
                onClick={startEditing}
                className="flex items-center gap-1.5 group max-w-full"
              >
                <p className="font-bold text-gray-900 truncate">{headerName}</p>
                <Pencil size={12} className="text-gray-300 group-hover:text-primary transition-colors shrink-0" />
              </button>
            )}
            {!isOneToOne && !editingName && (
              <p className="text-xs text-gray-400">
                {activeEvent?.participants.length ?? 0} partecipanti
              </p>
            )}
          </div>
        </div>

        {/* ─── Event Switcher ─── */}
        <EventSwitcher
          events={relatedEvents}
          activeId={activeEventId}
          onChange={switchEvent}
        />

        {isCreator &&
          activeEvent &&
          joinRequests.filter((j) => j.status === "pending").length > 0 && (
            <div className="px-3 pb-2 space-y-2" data-testid="join-requests-panel">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                Richieste di partecipazione
              </p>
              {joinRequests
                .filter((j) => j.status === "pending")
                .map((j) => (
                  <div
                    key={j.id}
                    className="flex items-center justify-between gap-2 rounded-xl bg-primary/10 border border-primary/25 px-3 py-2.5"
                  >
                    <span className="text-sm font-semibold text-gray-900 truncate">{j.requesterName}</span>
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        data-testid={`join-accept-${j.id}`}
                        onClick={() => resolveJoinRequest({ id: j.id, status: "accepted" })}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-primary"
                      >
                        Accetta
                      </button>
                      <button
                        type="button"
                        data-testid={`join-reject-${j.id}`}
                        onClick={() => resolveJoinRequest({ id: j.id, status: "rejected" })}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600 bg-gray-100"
                      >
                        Rifiuta
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}

        {inviteChatUrl ? (
          <div className="px-3 pb-2 shrink-0 w-full max-w-full box-border" data-testid="row-chat-invite-link">
            <div className="flex items-center gap-2 rounded-xl bg-gray-50 border border-gray-100 px-2.5 py-2 min-w-0">
              <Link2 size={14} className="text-primary shrink-0" aria-hidden />
              <p className="text-[11px] text-gray-600 flex-1 min-w-0 leading-tight truncate" title={inviteChatUrl}>
                Link per invitare al gruppo
              </p>
              <button
                type="button"
                data-testid="button-copy-chat-invite"
                onClick={copyInviteChatLink}
                className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-700 active:scale-95 transition-transform"
                aria-label={inviteCopied ? "Copiato" : "Copia link invito"}
              >
                {inviteCopied ? (
                  <CheckIcon size={14} className="text-emerald-600" strokeWidth={2.5} />
                ) : (
                  <Copy size={14} strokeWidth={2.25} />
                )}
              </button>
            </div>
          </div>
        ) : null}

        {/* ─── Tab switcher: Voto | Chat (shadcn Tabs) ─── */}
        <Tabs
          value={view}
          onValueChange={(v) => {
            const next = v as "vote" | "chat";
            if (next === "chat" && !canUseChat) {
              showChatLockedNotice();
              return;
            }
            setShowChatLockedBanner(false);
            setView(next);
          }}
          className="w-full shrink-0 border-b border-border"
        >
          <TabsList className="grid h-12 w-full grid-cols-2 gap-0 rounded-none border-0 bg-muted/40 p-0">
            <TabsTrigger
              data-testid="tab-vote"
              value="vote"
              className="h-full rounded-none border-0 border-b-2 border-transparent py-0 text-base font-bold shadow-none data-[state=active]:border-primary data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground"
            >
              Voto
            </TabsTrigger>
            <TabsTrigger
              data-testid="tab-chat"
              value="chat"
              className={`relative h-full rounded-none border-0 border-b-2 border-transparent py-0 text-base font-bold shadow-none data-[state=active]:border-primary data-[state=active]:bg-background data-[state=active]:text-foreground ${
                canUseChat ? "data-[state=inactive]:text-muted-foreground" : "text-muted-foreground/60"
              }`}
            >
              Chat
              {messages.length > 0 && view !== "chat" && (
                <Badge className="ml-2 h-5 min-w-5 border-0 bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                  {messages.length > 9 ? "9+" : messages.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {showChatLockedBanner && !canUseChat && (
          <div className="px-3 pb-2 shrink-0 w-full max-w-full box-border" data-testid="banner-chat-locked">
            <div className="flex items-center gap-2 rounded-xl border border-amber-200/90 bg-amber-50 px-2.5 py-2 w-full min-w-0">
              <AlertCircle className="shrink-0 text-amber-600" size={16} strokeWidth={2.25} aria-hidden />
              <p className="text-[11px] leading-snug font-semibold text-amber-950 min-w-0 flex-1">
                Prima vota nel tab <span className="text-amber-800">Voto</span>.
              </p>
              <button
                type="button"
                aria-label="Chiudi"
                onClick={() => {
                  if (chatLockedBannerTimer.current) clearTimeout(chatLockedBannerTimer.current);
                  setShowChatLockedBanner(false);
                }}
                className="shrink-0 p-1 rounded-lg text-amber-700/80 hover:bg-amber-100/80 active:scale-95"
              >
                <X size={14} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Creator Options Sheet ─── */}
      {showCreatorOptions && activeEvent && (
        <CreatorOptionsSheet
          event={activeEvent}
          onConfirm={(opts) => {
            opts.forEach(({ type, value }) => proposeOption({ type, value }));
            setShowCreatorOptions(false);
          }}
          onClose={() => setShowCreatorOptions(false)}
        />
      )}

      {/* ─── Propose Option Sheet — Creatore (aggiunta diretta) ─── */}
      {proposeSheetType && activeEvent && (
        <ProposeOptionSheet
          type={proposeSheetType}
          eventActivity={activeEvent.activity}
          onConfirm={(value) => {
            proposeOption({ type: proposeSheetType, value });
            setProposeSheetType(null);
          }}
          onClose={() => setProposeSheetType(null)}
        />
      )}

      {/* ─── Proposal Type Chooser (non-creatore) ─── */}
      {showProposalTypeChooser && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end pb-14" onClick={() => setShowProposalTypeChooser(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative z-10 bg-white rounded-t-3xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-1" />
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm">Cosa vuoi proporre?</h3>
              <button onClick={() => setShowProposalTypeChooser(false)} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100">
                <X size={14} className="text-gray-500" />
              </button>
            </div>
            <div className="px-3 py-3 grid grid-cols-3 gap-2 pb-5">
              {[
                { key: "venue", label: "Luogo",  Icon: MapPinned },
                { key: "date",  label: "Data",   Icon: CalendarSearch },
                { key: "time",  label: "Orario", Icon: Timer },
              ].map(({ key, label, Icon }) => (
                <button
                  key={key}
                  data-testid={`button-propose-type-${key}`}
                  onClick={() => {
                    setShowProposalTypeChooser(false);
                    setProposalSheetType(key as "date" | "time" | "venue");
                  }}
                  className="flex flex-col items-center gap-1.5 py-3.5 rounded-xl bg-primary/10 text-primary active:scale-95 transition-transform"
                >
                  <Icon size={18} />
                  <span className="text-xs font-bold">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Propose Option Sheet — Partecipante (proposta in attesa) ─── */}
      {proposalSheetType && activeEvent && (
        <ProposeOptionSheet
          type={proposalSheetType}
          eventActivity={activeEvent.activity}
          onConfirm={(value) => {
            createProposal({ proposalType: proposalSheetType, proposalValue: value });
            setProposalSheetType(null);
          }}
          onClose={() => setProposalSheetType(null)}
        />
      )}

      {/* ════════════════════════════════════════
          VISTA VOTO — principale
      ════════════════════════════════════════ */}
      {view === "vote" && (
        <div className="flex-1 overflow-y-auto bg-white">
          {activeEvent ? (
            <>
              {/* ── RSVP Card ── */}
              {(() => {
                const attendanceByUser = (name: string) =>
                  votes.find(v => v.voterName === name && v.voteType === "attendance")?.voteValue ?? null;
                const participants = activeEvent.participants;
                const yesCount = participants.filter(p => attendanceByUser(p) === "yes").length;
                const noCount  = participants.filter(p => attendanceByUser(p) === "no").length;
                const maybeCount = participants.filter(p => attendanceByUser(p) === "maybe").length;
                const showRsvpYes = getVotablePollTypesForEvent(activeEvent).length === 0;
                const rsvpMode = surveyBehavior(parseSurveyMode(activeEvent.surveyMode));
                const showMaybe = rsvpMode.attendance === "ternary";
                const canRsvpPropose = !isCreator && allowsMemberProposals(parseSurveyMode(activeEvent.surveyMode));

                return (
                  <div className="px-4 pt-5 pb-4 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-bold text-gray-900">Parteciperai all'evento?</p>
                      <div className="flex items-center gap-2 text-xs">
                        {yesCount > 0 && (
                          <span className="font-semibold text-emerald-600">{yesCount} sì</span>
                        )}
                        {maybeCount > 0 && (
                          <span className="font-semibold text-amber-600">{maybeCount} forse</span>
                        )}
                        {noCount > 0 && (
                          <span className="font-semibold text-red-400">{noCount} no</span>
                        )}
                      </div>
                    </div>

                    {/* RSVP: "Sì ci sono" se non ci sono sondaggi votabili; "Forse" se la modalità lo prevede */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {showRsvpYes && (
                        <button
                          data-testid="button-rsvp-yes"
                          type="button"
                          aria-pressed={myAttendance === "yes"}
                          onClick={() => castVote({ voteType: "attendance", voteValue: "yes" })}
                          className={`min-w-[28%] flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                            myAttendance === "yes"
                              ? "bg-emerald-500 text-white shadow-sm"
                              : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                          }`}
                        >
                          <UserCheck size={15} />
                          Sì ci sono
                        </button>
                      )}
                      {showMaybe && (
                        <button
                          data-testid="button-rsvp-maybe"
                          type="button"
                          aria-pressed={myAttendance === "maybe"}
                          onClick={() => castVote({ voteType: "attendance", voteValue: "maybe" })}
                          className={`min-w-[28%] flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                            myAttendance === "maybe"
                              ? "bg-amber-500 text-white shadow-sm"
                              : "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}
                        >
                          Forse
                        </button>
                      )}
                      <button
                        data-testid="button-rsvp-no"
                        type="button"
                        aria-pressed={myAttendance === "no"}
                        onClick={() => castVote({ voteType: "attendance", voteValue: "no" })}
                        className={`min-w-[28%] flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                          myAttendance === "no"
                            ? "bg-red-500 text-white shadow-sm"
                            : "bg-red-50 text-red-500 border border-red-200"
                        }`}
                      >
                        <UserMinus size={15} />
                        No
                      </button>
                      {canRsvpPropose && (
                        <button
                          data-testid="button-rsvp-propose"
                          onClick={() => setShowProposalTypeChooser(true)}
                          className="min-w-[28%] flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold bg-primary/10 text-primary border border-primary/30 active:scale-95 transition-all"
                        >
                          <Plus size={15} />
                          Proponi
                        </button>
                      )}
                    </div>

                    {/* Stato partecipanti */}
                    <div className="flex flex-wrap gap-1.5">
                      {participants.map(name => {
                        const att = attendanceByUser(name);
                        const displayName = contactNames[name] ?? name;
                        return (
                          <div
                            key={name}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border ${
                              att === "yes" ? "bg-emerald-50 border-emerald-100" :
                              att === "maybe" ? "bg-amber-50 border-amber-100" :
                              att === "no"  ? "bg-red-50 border-red-100" :
                              "bg-gray-50 border-gray-100"
                            }`}
                          >
                            <div
                              className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold text-white shrink-0"
                              style={{ backgroundColor: getAvatarColor(name) }}
                            >
                              {getInitials(name)}
                            </div>
                            <span className={`text-xs font-semibold ${
                              att === "yes" ? "text-emerald-600" :
                              att === "maybe" ? "text-amber-700" :
                              att === "no"  ? "text-red-400" :
                              "text-gray-400"
                            }`}>{displayName}</span>
                            <span className="text-xs">
                              {att === "yes" ? "✓" : att === "no" ? "✗" : att === "maybe" ? "?" : "–"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* ── Proposte in attesa (solo creatore) ── */}
              {(() => {
                const pending = proposals.filter(p => p.status === "pending");
                if (!isCreator || pending.length === 0) return null;
                const typeLabel: Record<string, { label: string; Icon: any }> = {
                  date:  { label: "data",   Icon: CalendarSearch },
                  time:  { label: "orario", Icon: Timer },
                  venue: { label: "luogo",  Icon: MapPinned },
                };
                const parseVenueLabel = (value: string) => {
                  try {
                    const p = JSON.parse(value);
                    return p.name ?? value;
                  } catch { return value; }
                };
                return (
                  <div className="border-b border-amber-100 bg-amber-50 px-4 py-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center">
                        <Bell size={12} className="text-amber-700" />
                      </div>
                      <p className="text-sm font-bold text-amber-800">
                        Proposte in attesa ({pending.length})
                      </p>
                    </div>
                    <div className="space-y-2">
                      {pending.map(p => {
                        const tl = typeLabel[p.proposalType] ?? { label: p.proposalType, Icon: Plus };
                        const displayVal = p.proposalType === "venue" ? parseVenueLabel(p.proposalValue) : p.proposalValue;
                        return (
                          <div key={p.id} className="bg-white rounded-2xl border border-amber-100 px-3 py-2.5 flex items-center gap-3">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                              style={{ backgroundColor: getAvatarColor(p.proposerName) }}
                            >
                              {getInitials(p.proposerName)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-500 leading-tight">
                                <span className="font-semibold text-gray-700">{contactNames[p.proposerName] ?? p.proposerName}</span>
                                {" "}propone {tl.label}:
                              </p>
                              <p className="text-sm font-bold text-gray-900 truncate">{displayVal}</p>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                              <button
                                data-testid={`button-approve-proposal-${p.id}`}
                                onClick={() => respondProposal({ id: p.id, status: "approved" })}
                                className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center active:scale-95 transition-transform"
                              >
                                <CheckIcon size={14} />
                              </button>
                              <button
                                data-testid={`button-reject-proposal-${p.id}`}
                                onClick={() => respondProposal({ id: p.id, status: "rejected" })}
                                className="w-8 h-8 rounded-xl bg-red-100 text-red-400 flex items-center justify-center active:scale-95 transition-transform"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* RecapBanner sempre espanso */}
              <RecapBanner
                event={activeEvent}
                votes={votes}
                expanded={true}
                alwaysExpanded={true}
                onToggle={() => {}}
                onVote={(type, val) => castVote({ voteType: type, voteValue: val })}
                onOpenPropose={(type) => {
                  if (isCreator) {
                    setProposeSheetType(type as "date" | "time" | "venue");
                  } else {
                    setProposalSheetType(type as "date" | "time" | "venue");
                  }
                }}
                currentUser={currentUser}
                isCreator={isCreator}
              />

              {surveyBehavior(parseSurveyMode(activeEvent.surveyMode)).creatorTiebreakHint && (
                <p className="px-4 pb-2 text-[10px] leading-snug text-muted-foreground">
                  Pareggio: di solito l&apos;organizzatore propone lo spareggio finale col gruppo.
                </p>
              )}

              {/* ─── Action Strip ─── */}
              <div className="px-4 py-4 border-t border-gray-100 space-y-2.5">
                <div className="flex gap-2 items-center">
                  {isConfirmed ? (
                    isCreator ? (
                      <button
                        type="button"
                        data-testid="button-in-calendar-toggle"
                        onClick={() => setShowUnconfirmCalendar(true)}
                        className="flex items-center gap-2 flex-1 justify-center py-2.5 rounded-xl text-sm font-semibold bg-green-50 text-green-700 border border-green-200 active:scale-[0.98] transition-transform"
                      >
                        <CheckCircle2 size={15} />
                        Nel calendario
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 flex-1 justify-center py-2.5 rounded-xl text-sm font-semibold bg-green-50 text-green-600 border border-green-200">
                        <CheckCircle2 size={15} />Nel calendario
                      </div>
                    )
                  ) : isCreator ? (
                    <button
                      data-testid="button-add-calendar"
                      onClick={handleConfirmEvent}
                      className="flex items-center flex-1 justify-center py-2.5 rounded-xl text-[13px] font-semibold bg-primary text-white transition-all active:scale-95 whitespace-nowrap"
                    >
                      Aggiungi a calendario
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 flex-1 justify-center py-2.5 rounded-xl text-sm font-semibold bg-gray-50 text-gray-400 border border-gray-200">
                      <Clock size={15} />In attesa di conferma
                    </div>
                  )}

                  <button
                    data-testid="button-delete-event"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-red-50 border border-red-100 active:scale-95 transition-transform"
                  >
                    <Trash2 size={17} className="text-red-400" />
                  </button>
                </div>

                {/* Bottone "Aggiungi opzioni" — solo per il creatore, evento in pianificazione */}
                {isCreator && activeEvent?.status === "planning" && (
                  <button
                    data-testid="button-add-options"
                    onClick={() => setShowCreatorOptions(true)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border-2 border-dashed border-primary/40 text-primary bg-primary/10 active:bg-primary/15 transition-colors"
                  >
                    <Plus size={14} />
                    Aggiungi opzioni al sondaggio
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
              Caricamento...
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════
          VISTA CHAT — secondaria
      ════════════════════════════════════════ */}
      {view === "chat" && (
        <>
          {/* ─── Messages ─── */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
            {activeEvent && (
              <div className="flex justify-center mb-3">
                <div className="flex items-center gap-1.5 bg-white/80 border border-gray-100 rounded-full px-4 py-1.5 shadow-sm">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                    style={{ backgroundColor: getAvatarColor(activeEvent.createdBy) }}
                  >
                    {getInitials(activeEvent.createdBy)}
                  </div>
                  <p className="text-xs text-gray-500">
                    <span className="font-semibold text-gray-700">{activeEvent.createdBy}</span>
                    {" "}ha fatto una proposta di attività
                  </p>
                </div>
              </div>
            )}

            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <Send size={24} className="text-gray-300" />
                </div>
                <p className="text-sm font-semibold text-gray-600">Inizia la conversazione!</p>
                <p className="text-xs text-gray-400 mt-1">
                  {isFetchingMessages ? "Carico i messaggi..." : "Scrivi un messaggio qui sotto"}
                </p>
              </div>
            ) : (
              grouped.map(msg => {
                const isMe = msg.senderName === currentUser;
                return (
                  <div
                    key={msg.id}
                    data-testid={`message-${msg.id}`}
                    className={`flex flex-col ${isMe ? "items-end" : "items-start"} ${msg.isFirst ? "mt-3" : "mt-0.5"}`}
                  >
                    {msg.showSender && !isMe && (
                      <button onClick={() => setProfileUser(msg.senderName)} className="flex items-center gap-1.5 mb-1 px-1 active:opacity-70 transition-opacity">
                        <div
                          className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold text-white"
                          style={{ backgroundColor: getAvatarColor(msg.senderName) }}
                        >
                          {getInitials(msg.senderName)}
                        </div>
                        <span className="text-[11px] font-semibold text-gray-500">{contactNames[msg.senderName] ?? msg.senderName}</span>
                      </button>
                    )}

                    <div className="flex items-end gap-1.5 max-w-[80%]">
                      {!isMe && msg.isFirst && (
                        <button
                          onClick={() => setProfileUser(msg.senderName)}
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0 mb-0.5 active:opacity-70 transition-opacity"
                          style={{ backgroundColor: getAvatarColor(msg.senderName) }}
                        >
                          {getInitials(msg.senderName)}
                        </button>
                      )}
                      {!isMe && !msg.isFirst && <div className="w-6 shrink-0" />}

                      <div
                        className={`rounded-2xl px-3.5 py-2.5 ${
                          isMe
                            ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                      </div>
                    </div>

                    {msg.isLast && (
                      <span className="text-[10px] text-gray-300 mt-0.5 px-7">
                        {new Date(msg.createdAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* ─── Input ─── */}
          <div className="bg-white border-t border-gray-100 px-4 py-3 shrink-0">
            {!canUseChat && (
              <p className="text-[11px] text-gray-500 mb-2 text-center px-1 leading-snug">
                Completa i voti nel tab <span className="font-semibold text-gray-700">Voto</span>.
              </p>
            )}
            <div className="flex items-center gap-2">
              <input
                data-testid="input-message"
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder={canUseChat ? "Scrivi un messaggio..." : "Completa i voti per scrivere..."}
                disabled={!canUseChat}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors disabled:opacity-50"
              />
              <button
                data-testid="button-send-message"
                type="button"
                onClick={handleSend}
                disabled={!text.trim() || isPending || !canUseChat}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/75 disabled:opacity-40 active:scale-95 transition-opacity"
              >
                <Send size={16} className="text-white" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* ─── Annulla conferma (calendario) — solo creatore ─── */}
      {showUnconfirmCalendar && activeEvent && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 px-4 pb-8">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-11 h-11 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <CalendarX size={20} className="text-amber-700" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Togliere dal calendario?</h3>
                <p className="text-xs text-gray-400">L&apos;evento torna in pianificazione per tutti</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 my-4 leading-relaxed">
              Confermi di voler annullare la conferma? Potrete votare di nuovo e rimettere l&apos;evento in calendario dopo.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                data-testid="button-cancel-unconfirm-calendar"
                onClick={() => setShowUnconfirmCalendar(false)}
                className="flex-1 py-3 rounded-xl font-semibold text-gray-600 bg-gray-100 text-sm"
              >
                Annulla
              </button>
              <button
                type="button"
                data-testid="button-confirm-unconfirm-calendar"
                onClick={() => unconfirmFromCalendar()}
                disabled={unconfirmingCalendar}
                className="flex-1 py-3 rounded-xl font-semibold text-white bg-amber-600 text-sm disabled:opacity-60"
              >
                {unconfirmingCalendar ? "Aggiornamento…" : "Togli dal calendario"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Conferma eliminazione evento ─── */}
      {showDeleteConfirm && activeEvent && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 px-4 pb-8">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-11 h-11 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 size={20} className="text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Eliminare l'evento?</h3>
                <p className="text-xs text-gray-400">Questa azione è irreversibile</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 my-4">
              <p className="font-semibold text-gray-900 text-sm capitalize">{activeEvent.title}</p>
              <p className="text-xs text-red-400 mt-1">
                L'evento, la chat e tutti i voti verranno eliminati per tutti i{" "}
                {activeEvent.participants.length} partecipanti.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                data-testid="button-cancel-delete-event"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 rounded-xl font-semibold text-gray-600 bg-gray-100 text-sm"
              >
                Annulla
              </button>
              <button
                data-testid="button-confirm-delete-event"
                onClick={() => deleteEvent()}
                disabled={isDeleting}
                className="flex-1 py-3 rounded-xl font-semibold text-white bg-red-500 text-sm disabled:opacity-60"
              >
                {isDeleting ? "Eliminando..." : "Elimina"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── User Profile Modal ─── */}
      {profileUser && (
        <UserProfileModal
          name={profileUser}
          allEvents={allEvents}
          onClose={() => setProfileUser(null)}
          onNicknameChange={() => setContactNames(loadContactNames())}
        />
      )}
    </div>
  );
}
