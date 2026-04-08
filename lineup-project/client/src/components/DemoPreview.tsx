import { useState } from "react";
import { ArrowRight, Plus, Search, Clock, Trophy, Users, MessageSquare, Trash2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, CalendarPlus, Check, MapPin, Calendar, Heart, MessageCircle, Send } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const pollSlots = [
  { time: "18:30", voters: ["E"], totalVotes: 1 },
  { time: "19:00", voters: ["G", "L"], totalVotes: 2 },
  { time: "19:30", voters: ["G"], totalVotes: 1 },
  { time: "20:00", voters: [], totalVotes: 0 },
];

const venuePollSlots = [
  { name: "Terrazza Skyline", voters: ["G", "L"], totalVotes: 2 },
  { name: "Bar del Corso", voters: ["E"], totalVotes: 1 },
  { name: "Lounge Cafè", voters: [], totalVotes: 0 },
];

const dayPollSlots = [
  { day: "Ven 21", voters: ["G"], totalVotes: 1 },
  { day: "Sab 22", voters: ["G", "E", "L"], totalVotes: 3 },
  { day: "Dom 23", voters: ["E"], totalVotes: 1 },
];

const voterColors: Record<string, string> = {
  G: "bg-[#4A9BD9]",
  L: "bg-teal-500",
  E: "bg-orange-400",
  TU: "bg-violet-500",
};

export function DemoPreview() {
  const [votes, setVotes] = useState<Record<string, { voters: string[]; totalVotes: number }>>(() => {
    const init: Record<string, { voters: string[]; totalVotes: number }> = {};
    pollSlots.forEach(s => { init[s.time] = { voters: [...s.voters], totalVotes: s.totalVotes }; });
    return init;
  });
  const [venueVotes, setVenueVotes] = useState<Record<string, { voters: string[]; totalVotes: number }>>(() => {
    const init: Record<string, { voters: string[]; totalVotes: number }> = {};
    venuePollSlots.forEach(s => { init[s.name] = { voters: [...s.voters], totalVotes: s.totalVotes }; });
    return init;
  });
  const [dayVotes, setDayVotes] = useState<Record<string, { voters: string[]; totalVotes: number }>>(() => {
    const init: Record<string, { voters: string[]; totalVotes: number }> = {};
    dayPollSlots.forEach(s => { init[s.day] = { voters: [...s.voters], totalVotes: s.totalVotes }; });
    return init;
  });
  const [pollOpen, setPollOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [showProposeInput, setShowProposeInput] = useState(false);
  const [chosenTime, setChosenTime] = useState<string | null>(null);

  const toggleVote = (time: string) => {
    if (confirmed) return;
    setVotes(prev => {
      const slot = prev[time];
      const hasVoted = slot.voters.includes("TU");
      return {
        ...prev,
        [time]: {
          voters: hasVoted ? slot.voters.filter(v => v !== "TU") : [...slot.voters, "TU"],
          totalVotes: hasVoted ? slot.totalVotes - 1 : slot.totalVotes + 1,
        }
      };
    });
  };

  const toggleVenueVote = (name: string) => {
    setVenueVotes(prev => {
      const slot = prev[name];
      const hasVoted = slot.voters.includes("TU");
      return {
        ...prev,
        [name]: {
          voters: hasVoted ? slot.voters.filter(v => v !== "TU") : [...slot.voters, "TU"],
          totalVotes: hasVoted ? slot.totalVotes - 1 : slot.totalVotes + 1,
        }
      };
    });
  };

  const toggleDayVote = (day: string) => {
    setDayVotes(prev => {
      const slot = prev[day];
      const hasVoted = slot.voters.includes("TU");
      return {
        ...prev,
        [day]: {
          voters: hasVoted ? slot.voters.filter(v => v !== "TU") : [...slot.voters, "TU"],
          totalVotes: hasVoted ? slot.totalVotes - 1 : slot.totalVotes + 1,
        }
      };
    });
  };

  const myVotes = Object.entries(votes).filter(([_, s]) => s.voters.includes("TU")).map(([t]) => t);

  const getWinningTimes = () => {
    const entries = Object.entries(votes).filter(([_, s]) => s.totalVotes > 0);
    if (entries.length === 0) return [];
    const maxVotes = Math.max(...entries.map(([_, s]) => s.totalVotes));
    return entries.filter(([_, s]) => s.totalVotes === maxVotes).map(([t]) => t);
  };

  const handleAddToCalendar = () => {
    const winners = getWinningTimes();
    if (winners.length === 1) {
      setChosenTime(winners[0]);
    } else {
      setChosenTime(null);
    }
    setShowConfirm(true);
  };

  const handleConfirmAdd = () => {
    setShowConfirm(false);
    setConfirmed(true);
  };

  return (
    <section id="demo" className="py-16 md:py-24 bg-secondary/30">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 md:mb-16">
          <span className="inline-block px-3 md:px-4 py-1 md:py-1.5 rounded-full bg-[#4A9BD9]/10 text-[#4A9BD9] text-xs md:text-sm font-bold uppercase tracking-wider mb-3 md:mb-4">Anteprima</span>
          <h2 className="text-2xl md:text-4xl font-bold font-display">Scopri come funziona <span className="text-[#4A9BD9]">LineUp</span></h2>
          <p className="text-sm md:text-base text-muted-foreground mt-2 md:mt-3 max-w-xl mx-auto">Proponi, vota e organizza eventi con i tuoi amici in pochi tocchi</p>
        </div>

        <div className="flex flex-col md:flex-row gap-6 lg:gap-16 items-center justify-center relative">

          <div className="relative border-black bg-black border-[10px] md:border-[14px] rounded-[2rem] md:rounded-[2.5rem] h-[420px] w-[210px] md:h-[600px] md:w-[300px] shadow-2xl shrink-0 z-10">
            <div className="rounded-[1.5rem] md:rounded-[2rem] overflow-hidden w-[190px] md:w-[272px] h-[400px] md:h-[572px] bg-white relative flex flex-col">
              <div className="p-3 md:p-4 pt-4 md:pt-6 flex justify-between items-center">
                <h3 className="font-bold text-base md:text-xl">Chat</h3>
                <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-[#4A9BD9]/10 flex items-center justify-center text-[#4A9BD9]"><Plus className="w-3 h-3 md:w-4 md:h-4" /></div>
              </div>
              <div className="px-3 md:px-4 mb-2 md:mb-3">
                <div className="relative">
                  <Search className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 md:w-3 md:h-3 text-muted-foreground" />
                  <div className="w-full bg-slate-100 rounded-full py-1 md:py-1.5 pl-7 md:pl-8 text-[8px] md:text-[10px] text-muted-foreground">Cerca persone...</div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-1.5 md:p-2 divide-y divide-black/30">
                {[
                  { name: "Giovanni e Lorenzo", msg: "Aperitivo per sabato?", time: "14:30", color: "bg-[#4A9BD9] text-white", initial: "G", active: true, hasNotification: true, events: 3 },
                  { name: "Elena", msg: "Ti va un caffè?", time: "12:15", color: "bg-orange-400 text-white", initial: "E", events: 1 },
                  { name: "Mary", msg: "Ho prenotato il tavolo!", time: "Ieri", color: "bg-emerald-500 text-white", initial: "M", events: 2 },
                  { name: "Gruppo Classe", msg: "Chi porta gli appunti?", time: "Ieri", color: "bg-violet-500 text-white", initial: "GC", events: 1 },
                  { name: "Mamma", msg: "Vieni a cena?", time: "2gg fa", color: "bg-rose-400 text-white", initial: "M", events: 1 },
                  { name: "Leo", msg: "Partita stasera?", time: "10:05", color: "bg-teal-500 text-white", initial: "L", events: 2 },
                ].map((chat, idx) => (
                  <div key={idx} className={`flex items-center gap-1.5 md:gap-2 p-1.5 md:p-2 ${chat.active ? 'bg-slate-100' : ''}`}>
                    <div className="relative shrink-0">
                      <div className={`w-7 h-7 md:w-10 md:h-10 rounded-full ${chat.color} flex items-center justify-center text-[8px] md:text-[10px] font-bold`}>{chat.initial}</div>
                      {chat.hasNotification && <div className="absolute -top-0.5 -right-0.5 w-2 h-2 md:w-2.5 md:h-2.5 bg-[#4A9BD9] border-2 border-white rounded-full" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <h4 className="font-semibold text-[9px] md:text-xs truncate">{chat.name}</h4>
                        <span className="text-[6px] md:text-[8px] text-muted-foreground">{chat.time}</span>
                      </div>
                      <p className="text-[8px] md:text-[10px] text-muted-foreground truncate">{chat.msg}</p>
                    </div>
                    {chat.events > 1 && (
                      <div className="shrink-0 bg-[#4A9BD9]/10 text-[#4A9BD9] text-[7px] md:text-[8px] font-bold px-1 md:px-1.5 py-0.5 rounded-full">{chat.events}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center justify-center z-0">
            <ArrowRight className="w-10 h-10 text-[#4A9BD9]/40" />
          </div>

          <div className="relative border-black bg-black border-[10px] md:border-[14px] rounded-[2rem] md:rounded-[2.5rem] h-[420px] w-[210px] md:h-[600px] md:w-[300px] shadow-2xl shrink-0 z-10">
            <div className="rounded-[1.5rem] md:rounded-[2rem] overflow-hidden w-[190px] md:w-[272px] h-[400px] md:h-[572px] bg-white relative flex flex-col">
              <div className="p-2 md:p-3 pt-3 md:pt-5 border-b bg-slate-50/50">
                <div className="flex items-center gap-1 md:gap-1.5 mb-1.5 md:mb-2">
                  <ChevronLeft className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground" />
                  <Avatar className="w-5 h-5 md:w-6 md:h-6 border-0"><AvatarFallback className="text-[7px] md:text-[8px] bg-[#4A9BD9] text-white">G</AvatarFallback></Avatar>
                  <span className="text-[10px] md:text-xs font-bold text-foreground">Giovanni e Lorenzo</span>
                </div>

                <div className="flex gap-1 md:gap-1.5 overflow-x-auto pb-1">
                  <div className="flex-shrink-0 bg-black text-white rounded-md md:rounded-lg px-2 md:px-2.5 py-1 md:py-1.5 shadow-md min-w-0">
                    <div className="text-[6px] md:text-[7px] font-bold uppercase tracking-tight text-gray-400">Sab 24 Ott</div>
                    <div className="text-[8px] md:text-[9px] font-bold truncate">Aperitivo in Terrazza</div>
                  </div>
                  <div className="flex-shrink-0 bg-slate-100 text-foreground rounded-md md:rounded-lg px-2 md:px-2.5 py-1 md:py-1.5 border border-slate-200 min-w-0 opacity-60">
                    <div className="text-[6px] md:text-[7px] font-bold uppercase tracking-tight text-muted-foreground">Dom 25 Ott</div>
                    <div className="text-[8px] md:text-[9px] font-bold truncate">Brunch da Mario</div>
                  </div>
                  <div className="flex-shrink-0 bg-slate-100 text-foreground rounded-md md:rounded-lg px-2 md:px-2.5 py-1 md:py-1.5 border border-slate-200 min-w-0 opacity-40">
                    <div className="text-[6px] md:text-[7px] font-bold uppercase tracking-tight text-muted-foreground">Ven 30 Ott</div>
                    <div className="text-[8px] md:text-[9px] font-bold truncate">Cinema</div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-1 mt-1">
                  <div className="w-3 md:w-4 h-0.5 rounded-full bg-[#4A9BD9]"></div>
                  <div className="w-1 md:w-1.5 h-0.5 rounded-full bg-slate-300"></div>
                  <div className="w-1 md:w-1.5 h-0.5 rounded-full bg-slate-300"></div>
                </div>
              </div>

              <div className="flex-1 p-2 md:p-3 space-y-3 md:space-y-4 overflow-y-auto">
                <div className="flex gap-1.5 md:gap-2">
                  <Avatar className="w-5 h-5 md:w-6 md:h-6 shrink-0 border-0"><AvatarFallback className="text-[7px] md:text-[8px] bg-[#4A9BD9] text-white">G</AvatarFallback></Avatar>
                  <div className="flex-1 space-y-1.5 md:space-y-2">
                    <div className="bg-slate-100 p-1.5 md:p-2 rounded-xl rounded-tl-none max-w-[85%]"><p className="text-[8px] md:text-[10px] text-slate-800">Giovanni sta proponendo un'attività</p></div>
                    <div className="bg-white border rounded-xl shadow-sm max-w-[95%] overflow-hidden relative">
                      {/* Compact header - always visible */}
                      <div className="p-2 md:p-2.5">
                        <div className="flex items-center justify-between mb-1.5">
                          <div>
                            <h5 className="text-[8px] md:text-[10px] font-bold">Aperitivo</h5>
                            <p className="text-[6px] md:text-[7px] text-muted-foreground">Proposta di Giovanni</p>
                          </div>
                          <button
                            onClick={() => setPollOpen(o => !o)}
                            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 transition-all"
                            data-testid="button-toggle-poll"
                          >
                            <span className="text-[6px] md:text-[7px] font-bold text-slate-500">Vota</span>
                            {pollOpen ? <ChevronUp className="w-2.5 h-2.5 text-slate-500" /> : <ChevronDown className="w-2.5 h-2.5 text-slate-500" />}
                          </button>
                        </div>

                        {/* Mini summary - vertical list of top votes */}
                        <div className="space-y-1">
                          {/* Top venue */}
                          {(() => {
                            const top = Object.entries(venueVotes).sort((a,b) => b[1].totalVotes - a[1].totalVotes)[0];
                            return top ? (
                              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-2 h-2 text-[#4A9BD9] shrink-0" />
                                  <span className="text-[6px] md:text-[7px] text-muted-foreground font-semibold">Luogo più votato:</span>
                                  <span className="text-[6px] md:text-[7px] font-bold text-slate-700 max-w-[55px] truncate">{top[0]}</span>
                                </div>
                                <div className="flex -space-x-1">
                                  {top[1].voters.slice(0,3).map((v,i) => <div key={i} className={`w-2.5 h-2.5 rounded-full ${voterColors[v]||'bg-slate-400'} border border-white`} />)}
                                </div>
                              </div>
                            ) : null;
                          })()}
                          {/* Top day */}
                          {(() => {
                            const top = Object.entries(dayVotes).sort((a,b) => b[1].totalVotes - a[1].totalVotes)[0];
                            return top ? (
                              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-2 h-2 text-emerald-500 shrink-0" />
                                  <span className="text-[6px] md:text-[7px] text-muted-foreground font-semibold">Giorno più votato:</span>
                                  <span className="text-[6px] md:text-[7px] font-bold text-slate-700">{top[0]}</span>
                                </div>
                                <div className="flex -space-x-1">
                                  {top[1].voters.slice(0,3).map((v,i) => <div key={i} className={`w-2.5 h-2.5 rounded-full ${voterColors[v]||'bg-slate-400'} border border-white`} />)}
                                </div>
                              </div>
                            ) : null;
                          })()}
                          {/* Top time */}
                          {(() => {
                            const top = Object.entries(votes).sort((a,b) => b[1].totalVotes - a[1].totalVotes)[0];
                            return top && top[1].totalVotes > 0 ? (
                              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-2 h-2 text-orange-400 shrink-0" />
                                  <span className="text-[6px] md:text-[7px] text-muted-foreground font-semibold">Orario più votato:</span>
                                  <span className="text-[6px] md:text-[7px] font-bold text-slate-700">{top[0]}</span>
                                </div>
                                <div className="flex -space-x-1">
                                  {top[1].voters.slice(0,3).map((v,i) => <div key={i} className={`w-2.5 h-2.5 rounded-full ${voterColors[v]||'bg-slate-400'} border border-white`} />)}
                                </div>
                              </div>
                            ) : null;
                          })()}
                        </div>
                      </div>

                      {/* Expanded voting panel */}
                      {pollOpen && (
                        <div className="border-t border-slate-100 p-2 md:p-2.5 space-y-2 bg-slate-50/50 max-h-[200px] md:max-h-[250px] overflow-y-auto">
                          {/* Venue poll */}
                          <div>
                            <p className="text-[6px] md:text-[7px] text-muted-foreground font-bold uppercase flex items-center gap-0.5 mb-1"><MapPin className="w-2 h-2" /> Luogo</p>
                            <div className="space-y-0.5">
                              {Object.entries(venueVotes).map(([name, slot]) => {
                                const hasMyVote = slot.voters.includes("TU");
                                const maxV = Math.max(...Object.values(venueVotes).map(v => v.totalVotes), 1);
                                const bw = slot.totalVotes > 0 ? (slot.totalVotes / maxV) * 100 : 0;
                                return (
                                  <button key={name} onClick={() => toggleVenueVote(name)} className={`w-full text-left rounded-lg border p-1 transition-all cursor-pointer relative overflow-hidden ${hasMyVote ? 'border-[#4A9BD9]/40' : 'border-slate-200 hover:border-slate-300'}`} data-testid={`button-vote-venue-${name.replace(/\s+/g,'-').toLowerCase()}`}>
                                    <div className="absolute inset-y-0 left-0 rounded-lg" style={{ width: `${bw}%`, backgroundColor: hasMyVote ? 'rgba(74,155,217,0.15)' : 'rgba(148,163,184,0.1)' }} />
                                    <div className="relative flex items-center justify-between">
                                      <div className="flex items-center gap-1">
                                        <div className={`w-2.5 h-2.5 rounded-sm border flex items-center justify-center ${hasMyVote ? 'border-[#4A9BD9] bg-[#4A9BD9]' : 'border-slate-300'}`}>{hasMyVote && <Check className="w-1.5 h-1.5 text-white" />}</div>
                                        <span className={`text-[7px] font-bold truncate max-w-[75px] ${hasMyVote ? 'text-[#4A9BD9]' : 'text-slate-600'}`}>{name}</span>
                                      </div>
                                      <div className="flex items-center gap-0.5">
                                        <div className="flex -space-x-1">{slot.voters.map((v,i) => <div key={i} className={`w-3 h-3 rounded-full ${voterColors[v]||'bg-slate-400'} border border-white flex items-center justify-center`}><span className="text-[5px] text-white font-bold">{v}</span></div>)}</div>
                                        {slot.totalVotes > 0 && <span className="text-[6px] text-muted-foreground font-bold ml-0.5">{slot.totalVotes}</span>}
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Day poll */}
                          <div>
                            <p className="text-[6px] md:text-[7px] text-muted-foreground font-bold uppercase flex items-center gap-0.5 mb-1"><Calendar className="w-2 h-2" /> Giorno</p>
                            <div className="space-y-0.5">
                              {Object.entries(dayVotes).map(([day, slot]) => {
                                const hasMyVote = slot.voters.includes("TU");
                                const maxV = Math.max(...Object.values(dayVotes).map(v => v.totalVotes), 1);
                                const bw = slot.totalVotes > 0 ? (slot.totalVotes / maxV) * 100 : 0;
                                return (
                                  <button key={day} onClick={() => toggleDayVote(day)} className={`w-full text-left rounded-lg border p-1 transition-all cursor-pointer relative overflow-hidden ${hasMyVote ? 'border-emerald-400/40' : 'border-slate-200 hover:border-slate-300'}`} data-testid={`button-vote-day-${day.replace(/\s+/g,'-').toLowerCase()}`}>
                                    <div className="absolute inset-y-0 left-0 rounded-lg" style={{ width: `${bw}%`, backgroundColor: hasMyVote ? 'rgba(52,211,153,0.15)' : 'rgba(148,163,184,0.1)' }} />
                                    <div className="relative flex items-center justify-between">
                                      <div className="flex items-center gap-1">
                                        <div className={`w-2.5 h-2.5 rounded-sm border flex items-center justify-center ${hasMyVote ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'}`}>{hasMyVote && <Check className="w-1.5 h-1.5 text-white" />}</div>
                                        <span className={`text-[7px] font-bold ${hasMyVote ? 'text-emerald-600' : 'text-slate-600'}`}>{day}</span>
                                      </div>
                                      <div className="flex items-center gap-0.5">
                                        <div className="flex -space-x-1">{slot.voters.map((v,i) => <div key={i} className={`w-3 h-3 rounded-full ${voterColors[v]||'bg-slate-400'} border border-white flex items-center justify-center`}><span className="text-[5px] text-white font-bold">{v}</span></div>)}</div>
                                        {slot.totalVotes > 0 && <span className="text-[6px] text-muted-foreground font-bold ml-0.5">{slot.totalVotes}</span>}
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Time poll */}
                          <div>
                            <p className="text-[6px] md:text-[7px] text-muted-foreground font-bold uppercase flex items-center gap-0.5 mb-1"><Clock className="w-2 h-2" /> Orario</p>
                            <div className="space-y-0.5">
                              {Object.entries(votes).map(([time, slot]) => {
                                const hasMyVote = slot.voters.includes("TU");
                                const maxV = Math.max(...Object.values(votes).map(v => v.totalVotes), 1);
                                const bw = slot.totalVotes > 0 ? (slot.totalVotes / maxV) * 100 : 0;
                                return (
                                  <button key={time} onClick={() => toggleVote(time)} aria-pressed={hasMyVote} className={`w-full text-left rounded-lg border p-1 transition-all cursor-pointer relative overflow-hidden ${hasMyVote ? 'border-[#4A9BD9]/40' : 'border-slate-200 hover:border-slate-300'}`} data-testid={`button-vote-${time.replace(':','')}`}>
                                    <div className="absolute inset-y-0 left-0 rounded-lg" style={{ width: `${bw}%`, backgroundColor: hasMyVote ? 'rgba(74,155,217,0.15)' : 'rgba(148,163,184,0.1)' }} />
                                    <div className="relative flex items-center justify-between">
                                      <div className="flex items-center gap-1">
                                        <div className={`w-2.5 h-2.5 rounded-sm border flex items-center justify-center ${hasMyVote ? 'border-[#4A9BD9] bg-[#4A9BD9]' : 'border-slate-300'}`}>{hasMyVote && <Check className="w-1.5 h-1.5 text-white" />}</div>
                                        <span className={`text-[7px] font-bold ${hasMyVote ? 'text-[#4A9BD9]' : 'text-slate-600'}`}>{time}</span>
                                      </div>
                                      <div className="flex items-center gap-0.5">
                                        <div className="flex -space-x-1">{slot.voters.map((v,i) => <div key={i} className={`w-3 h-3 rounded-full ${voterColors[v]||'bg-slate-400'} border border-white flex items-center justify-center`}><span className="text-[5px] text-white font-bold">{v}</span></div>)}</div>
                                        {slot.totalVotes > 0 && <span className="text-[6px] text-muted-foreground font-bold ml-0.5">{slot.totalVotes}</span>}
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Add to calendar */}
                          <div className="flex gap-1 pt-0.5">
                            {!confirmed ? (
                              <button onClick={handleAddToCalendar} disabled={myVotes.length === 0} className={`flex-1 flex items-center justify-center gap-0.5 py-1 rounded-lg text-[6px] md:text-[7px] font-bold transition-all ${myVotes.length > 0 ? 'bg-[#4A9BD9] text-white cursor-pointer hover:bg-[#3A8BC8]' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`} data-testid="button-add-calendar">
                                <CalendarPlus className="w-2 h-2 md:w-2.5 md:h-2.5" />Aggiungi al calendario
                              </button>
                            ) : (
                              <div className="flex-1 flex items-center justify-center gap-0.5 py-1 rounded-lg bg-green-100 text-green-700 text-[6px] md:text-[7px] font-bold">
                                <Check className="w-2 h-2 md:w-2.5 md:h-2.5" />Aggiunto!
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {showConfirm && (() => {
                        const winners = getWinningTimes();
                        const isTie = winners.length > 1;
                        return (
                          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center p-2 z-10">
                            <p className="text-[8px] md:text-[9px] font-bold text-center mb-1">Confermi di aggiungere</p>
                            <p className="text-[7px] md:text-[8px] text-[#4A9BD9] font-bold text-center mb-1">Aperitivo in terrazza</p>
                            {isTie ? (
                              <div className="mb-2">
                                <p className="text-[6px] md:text-[7px] text-muted-foreground text-center mb-1">Parità di voti! Scegli l'orario:</p>
                                <div className="flex gap-1 justify-center">
                                  {winners.map(t => (
                                    <button key={t} onClick={() => setChosenTime(t)} className={`px-2 py-0.5 rounded-md text-[7px] font-bold transition-all ${chosenTime === t ? 'bg-[#4A9BD9] text-white' : 'border border-slate-300 text-slate-600 hover:border-[#4A9BD9]'}`} data-testid={`button-pick-time-${t.replace(':','')}`}>{t}</button>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <p className="text-[6px] md:text-[7px] text-muted-foreground text-center mb-2">alle <span className="font-bold text-foreground">{chosenTime}</span> · orario più votato</p>
                            )}
                            <p className="text-[6px] md:text-[7px] text-muted-foreground text-center mb-2">al tuo calendario?</p>
                            <div className="flex gap-1.5">
                              <button onClick={() => setShowConfirm(false)} className="px-2.5 py-1 rounded-lg border border-slate-200 text-[7px] font-bold text-slate-600 hover:bg-slate-50" data-testid="button-cancel-calendar">Annulla</button>
                              <button onClick={handleConfirmAdd} disabled={isTie && !chosenTime} className={`px-2.5 py-1 rounded-lg text-[7px] font-bold ${isTie && !chosenTime ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-[#4A9BD9] text-white hover:bg-[#3A8BC8]'}`} data-testid="button-confirm-calendar">Conferma</button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1.5 md:gap-2 flex-row-reverse">
                  <div className="bg-[#4A9BD9] p-1.5 md:p-2 rounded-xl rounded-tr-none max-w-[85%]"><p className="text-[8px] md:text-[10px] text-white">Io ci sono! Porto io il vino?</p></div>
                </div>
                <div className="flex gap-1.5 md:gap-2">
                  <Avatar className="w-5 h-5 md:w-6 md:h-6 shrink-0 border-0"><AvatarFallback className="text-[7px] md:text-[8px] bg-teal-500 text-white">L</AvatarFallback></Avatar>
                  <div className="bg-slate-100 p-1.5 md:p-2 rounded-xl rounded-tl-none max-w-[85%]"><p className="text-[8px] md:text-[10px] text-slate-800">Perfetto! Ci vediamo alle 19:30 🍷</p></div>
                </div>
              </div>
              <div className="p-2 md:p-3 border-t bg-slate-50/50">
                <div className="bg-white border rounded-full px-2 md:px-3 py-1 md:py-1.5 flex items-center justify-between shadow-sm">
                  <span className="text-[8px] md:text-[10px] text-muted-foreground">Messaggio...</span>
                  <div className="w-4 h-4 md:w-5 md:h-5 bg-[#4A9BD9] rounded-full flex items-center justify-center text-white"><ArrowRight className="w-2 h-2 md:w-3 md:h-3" /></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 md:mt-16 max-w-4xl mx-auto">
          <h3 className="text-xl md:text-3xl font-bold font-display text-center mb-2 md:mb-3">Una chat per ogni evento</h3>
          <p className="text-center text-sm md:text-base text-muted-foreground max-w-2xl mx-auto mb-6 md:mb-8">
            Ogni conversazione è legata a un evento specifico. Niente confusione, niente messaggi persi tra argomenti diversi.
          </p>

          {/* Booking callout */}
          <div className="flex items-center gap-4 bg-black text-white rounded-2xl px-5 md:px-8 py-4 md:py-5 mb-8 md:mb-10 max-w-2xl mx-auto">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 md:w-6 md:h-6 text-[#7CB9E8]" />
            </div>
            <div>
              <p className="font-bold text-sm md:text-base">Prenota il posto direttamente dall'app</p>
              <p className="text-white/60 text-xs md:text-sm mt-0.5">Scelto il luogo con il gruppo, puoi prenotare in pochi tap senza uscire da LineUp.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 md:p-6 shadow-sm">
              <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-[#4A9BD9]/10 flex items-center justify-center mb-3 md:mb-4">
                <MessageSquare className="w-4 h-4 md:w-5 md:h-5 text-[#4A9BD9]" />
              </div>
              <h4 className="font-bold text-sm md:text-base mb-1.5 md:mb-2">Chat per evento</h4>
              <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                Ogni evento ha la sua chat dedicata con nome, data e orario sempre visibili in alto. Tutto il contesto a portata di mano.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5 md:p-6 shadow-sm">
              <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-emerald-100 flex items-center justify-center mb-3 md:mb-4">
                <div className="flex items-center gap-0.5">
                  <ChevronLeft className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-600" />
                  <ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-600" />
                </div>
              </div>
              <h4 className="font-bold text-sm md:text-base mb-1.5 md:mb-2">Scorri tra gli eventi</h4>
              <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                Con le stesse persone puoi avere più eventi in programma. Scorri lateralmente per passare da una chat all'altra.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5 md:p-6 shadow-sm">
              <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-rose-100 flex items-center justify-center mb-3 md:mb-4">
                <Trash2 className="w-4 h-4 md:w-5 md:h-5 text-rose-500" />
              </div>
              <h4 className="font-bold text-sm md:text-base mb-1.5 md:mb-2">Pulizia automatica</h4>
              <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                Quando la data dell'evento passa, la chat viene eliminata automaticamente. Zero disordine, sempre tutto in ordine.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-16 md:mt-20 max-w-5xl mx-auto">
          <h2 className="text-xl md:text-3xl font-display text-center mb-6 md:mb-8">Condividi le tue esperienze e fai sapere agli amici <span className="font-bold">cosa hai fatto</span></h2>
        </div>
        <div className="max-w-5xl mx-auto">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl md:rounded-[2.5rem] border shadow-xl p-5 md:p-8 flex flex-col md:flex-row items-start gap-8 md:gap-12">

            {/* Left: event story cards */}
            <div className="flex-[1.5] w-full">
              <div className="flex items-center justify-between mb-4 md:mb-5">
                <h3 className="text-lg md:text-xl font-bold font-display text-[#4A9BD9]">Storie degli eventi</h3>
                <Button size="sm" className="bg-[#4A9BD9] hover:bg-[#3A8BC8] text-white rounded-full flex items-center gap-1.5 h-7 md:h-8 px-3 md:px-4 text-[10px] md:text-xs">
                  <Plus className="w-3 h-3 md:w-3.5 md:h-3.5" />Pubblica storia
                </Button>
              </div>

              <div className="space-y-3 md:space-y-4">
                {[
                  {
                    user: "Tu", initial: "TU", color: "bg-[#4A9BD9]",
                    event: "Aperitivo @ Bar del Corso", time: "Ven 21 · 19:30",
                    image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80",
                    caption: "Serata pazzesca con i soliti 🥂",
                    likes: 14, replies: 4, liked: true,
                  },
                  {
                    user: "Giovanni", initial: "G", color: "bg-orange-400",
                    event: "Padel @ Club Roma", time: "Gio 20 · 18:00",
                    image: "https://images.unsplash.com/photo-1617083934551-ac62d3eed4a0?auto=format&fit=crop&w=600&q=80",
                    caption: "Prima vittoria della stagione 🏆",
                    likes: 9, replies: 2, liked: false,
                  },
                  {
                    user: "Mary", initial: "M", color: "bg-emerald-500",
                    event: "Cena @ Trattoria Da Mario", time: "Mer 19 · 20:30",
                    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=600&q=80",
                    caption: "La migliore carbonara di Roma 🍝",
                    likes: 21, replies: 7, liked: false,
                  },
                ].map((story, idx) => (
                  <div key={idx} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center gap-2 px-3 py-2.5">
                      <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full ${story.color} flex items-center justify-center text-[9px] md:text-[10px] font-bold text-white shrink-0`}>{story.initial}</div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold block leading-tight">{story.user}</span>
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[9px] md:text-[10px] text-[#4A9BD9] font-semibold truncate">{story.event}</span>
                          <span className="text-[8px] text-muted-foreground shrink-0">· {story.time}</span>
                        </div>
                      </div>
                    </div>
                    {/* Photo */}
                    <div className="w-full h-24 md:h-32 overflow-hidden">
                      <img src={story.image} alt={story.event} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    {/* Caption + interactions */}
                    <div className="px-3 py-2">
                      <p className="text-[10px] md:text-xs text-foreground mb-2 leading-snug">{story.caption}</p>
                      <div className="flex items-center gap-3">
                        <button className={`flex items-center gap-1 ${story.liked ? 'text-rose-500' : 'text-gray-400 hover:text-rose-400'} transition-colors`}>
                          <Heart className={`w-3.5 h-3.5 ${story.liked ? 'fill-rose-500' : ''}`} />
                          <span className="text-[10px] font-semibold">{story.likes}</span>
                        </button>
                        <button className="flex items-center gap-1 text-gray-400 hover:text-[#4A9BD9] transition-colors">
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-semibold">{story.replies}</span>
                        </button>
                        <button className="flex items-center gap-1 text-gray-400 hover:text-[#4A9BD9] transition-colors ml-auto">
                          <Send className="w-3 h-3" />
                          <span className="text-[10px] font-semibold">Rispondi</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: explanation */}
            <div className="flex-1 w-full md:border-l md:pl-8 lg:pl-12 md:pt-1">
              <div className="flex items-center gap-3 mb-3 md:mb-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-[#4A9BD9] rounded-2xl flex items-center justify-center shadow-lg shadow-[#4A9BD9]/30">
                  <Heart className="w-5 h-5 md:w-6 md:h-6 text-white fill-white" />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-bold font-display leading-tight">Storie degli eventi</h3>
                  <p className="text-[#4A9BD9] font-bold text-xs md:text-sm tracking-wide">DOPO OGNI USCITA</p>
                </div>
              </div>
              <p className="text-xs md:text-sm text-muted-foreground leading-relaxed mb-4">
                Dopo ogni evento, pubblica una <span className="text-foreground font-bold">storia</span> con foto e caption per raccontare com'è andata. I tuoi amici la vedono nel calendario, possono <span className="text-foreground font-semibold">mettere like</span> e <span className="text-foreground font-semibold">risponderti</span> direttamente.
              </p>
              <div className="space-y-2.5">
                {[
                  { icon: Heart, label: "Like e reazioni alle storie", color: "text-rose-500" },
                  { icon: MessageCircle, label: "Risposte e commenti privati", color: "text-[#4A9BD9]" },
                  { icon: Calendar, label: "Visibili nel calendario dell'evento", color: "text-emerald-600" },
                  { icon: Trophy, label: "Accumula strike e ottieni sconti", color: "text-yellow-500" },
                ].map(({ icon: Icon, label, color }) => (
                  <div key={label} className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 shrink-0 ${color}`} />
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
