import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import {
  ArrowLeft, MessageCircle, CheckCircle2, Star, MapPin, Tag,
  Users, Clock, ThumbsUp, Trophy
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  parseEvent, getActivity, getAvatarColor, getInitials,
  getCurrentUser,
} from "@/lib/appUtils";

interface AppVote {
  id: number;
  eventId: number;
  voterName: string;
  voteType: string;
  voteValue: string;
  createdAt: string;
}

interface VoteGroup {
  value: string;
  voters: string[];
}

function groupVotes(votes: AppVote[], type: string): VoteGroup[] {
  const map: Record<string, string[]> = {};
  votes.filter(v => v.voteType === type).forEach(v => {
    if (!map[v.voteValue]) map[v.voteValue] = [];
    map[v.voteValue].push(v.voterName);
  });
  return Object.entries(map)
    .map(([value, voters]) => ({ value, voters }))
    .sort((a, b) => b.voters.length - a.voters.length);
}

function VoteBar({ value, voters, total, myVote, onVote, disabled }: {
  value: string;
  voters: string[];
  total: number;
  myVote: boolean;
  onVote: () => void;
  disabled: boolean;
}) {
  const pct = total > 0 ? Math.round((voters.length / total) * 100) : 0;
  return (
    <button
      data-testid={`vote-option-${value}`}
      onClick={onVote}
      disabled={disabled}
      className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
        myVote
          ? "border-[#4A9BD9] bg-[#EBF5FB]"
          : "border-gray-100 bg-white hover:border-gray-200"
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-semibold text-gray-900">{value}</span>
        <div className="flex items-center gap-1.5">
          {myVote && <ThumbsUp size={12} className="text-[#4A9BD9]" />}
          <span className="text-xs font-bold text-gray-600">{voters.length} voti</span>
        </div>
      </div>
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            backgroundColor: myVote ? "#4A9BD9" : "#D1D5DB",
          }}
        />
      </div>
      {voters.length > 0 && (
        <div className="flex -space-x-1 mt-2">
          {voters.slice(0, 6).map(name => (
            <div
              key={name}
              title={name}
              className="w-5 h-5 rounded-full border border-white flex items-center justify-center text-[8px] font-bold text-white"
              style={{ backgroundColor: getAvatarColor(name) }}
            >
              {getInitials(name)}
            </div>
          ))}
        </div>
      )}
    </button>
  );
}

export default function AppEventDetail() {
  const [, params] = useRoute("/events/:id");
  const id = parseInt(params?.id ?? "0");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const currentUser = getCurrentUser();

  const safeFetch = (url: string) =>
    fetch(url).then(async r => {
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json();
    });

  const { data: rawEvent, isLoading: loadingEvent } = useQuery<any>({
    queryKey: ["/api/app/events", id],
    queryFn: () => safeFetch(`/api/app/events/${id}`),
    enabled: !!id,
  });

  const { data: votes = [] } = useQuery<AppVote[]>({
    queryKey: ["/api/app/events", id, "votes"],
    queryFn: () => safeFetch(`/api/app/events/${id}/votes`),
    enabled: !!id,
    refetchInterval: 5000,
    select: (data) => (Array.isArray(data) ? data : []),
  });

  const { data: messages = [] } = useQuery<any[]>({
    queryKey: ["/api/app/events", id, "messages"],
    queryFn: () => safeFetch(`/api/app/events/${id}/messages`),
    enabled: !!id,
    select: (data) => (Array.isArray(data) ? data : []),
  });

  const { mutate: castVote } = useMutation({
    mutationFn: ({ voteType, voteValue }: { voteType: string; voteValue: string }) =>
      apiRequest("POST", `/api/app/events/${id}/votes`, {
        voterName: currentUser,
        voteType,
        voteValue,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/app/events", id, "votes"] });
    },
    onError: () => toast({ title: "Errore nel voto", variant: "destructive" }),
  });

  const { mutate: confirmEvent } = useMutation({
    mutationFn: ({ confirmedDate, confirmedTime, confirmedVenue }: any) =>
      apiRequest("PUT", `/api/app/events/${id}/confirm`, { confirmedDate, confirmedTime, confirmedVenue }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/app/events", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/app/events"] });
      toast({ title: "Evento confermato! 🎉" });
    },
  });

  if (loadingEvent || !rawEvent) {
    return (
      <div className="flex items-center justify-center min-h-full">
        <div className="animate-spin w-8 h-8 border-2 border-[#4A9BD9] border-t-transparent rounded-full" />
      </div>
    );
  }

  const event = parseEvent(rawEvent);
  const act = getActivity(event.activity);
  const isPlanning = event.status === "planning";

  const dateVotes = groupVotes(votes, "date");
  const timeVotes = groupVotes(votes, "time");
  const venueVotes = groupVotes(votes, "venue");

  const totalParticipants = event.participants.length;

  const getWinner = (groups: VoteGroup[], options: string[]) => {
    if (groups.length === 0) return options[0] ?? null;
    return groups[0].value;
  };

  const winDate = getWinner(dateVotes, event.dateOptions);
  const winTime = getWinner(timeVotes, event.timeOptions);
  const winVenue = getWinner(venueVotes, event.venueOptions.map(v => v.name));

  const myVotes = votes.filter(v => v.voterName === currentUser);
  const isMine = (type: string, val: string) =>
    myVotes.some(v => v.voteType === type && v.voteValue === val);

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/">
            <button
              data-testid="button-back"
              className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
            >
              <ArrowLeft size={18} className="text-gray-600" />
            </button>
          </Link>
          <div className="flex-1" />
          <Link href={`/events/${id}/chat`}>
            <button
              data-testid="button-go-chat"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "#EBF5FB", color: "#4A9BD9" }}
            >
              <MessageCircle size={15} />
              Chat
              {messages.length > 0 && (
                <span className="bg-[#4A9BD9] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {messages.length}
                </span>
              )}
            </button>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl shrink-0"
            style={{ backgroundColor: act.bg }}
          >
            {act.emoji}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{act.label}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Organizzato da {event.createdBy}
            </p>
            <div className="mt-2">
              {isPlanning ? (
                <span className="text-xs font-semibold text-[#4A9BD9] bg-[#EBF5FB] px-3 py-1 rounded-full">
                  Pianificando...
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full w-fit">
                  <CheckCircle2 size={11} />
                  Confermato
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Participants */}
        <div className="flex items-center gap-2 mt-4">
          <Users size={14} className="text-gray-400" />
          <div className="flex -space-x-1.5">
            {event.participants.map(name => (
              <div
                key={name}
                title={name}
                className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white"
                style={{ backgroundColor: getAvatarColor(name) }}
              >
                {getInitials(name)}
              </div>
            ))}
          </div>
          <span className="text-xs text-gray-500">
            {event.participants.join(", ")}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-5 space-y-5">
        {/* Confirmed info */}
        {!isPlanning && (
          <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
            <h3 className="text-sm font-bold text-emerald-700 mb-3 flex items-center gap-1.5">
              <CheckCircle2 size={14} />
              Dettagli confermati
            </h3>
            <div className="space-y-2">
              {event.confirmedDate && (
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-emerald-500" />
                  <span className="text-sm text-gray-700 font-medium">
                    {event.confirmedDate} · {event.confirmedTime}
                  </span>
                </div>
              )}
              {event.confirmedVenue && (
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-emerald-500" />
                  <span className="text-sm text-gray-700 font-medium">{event.confirmedVenue}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Voting - only in planning */}
        {isPlanning && (
          <>
            {/* Confirm suggestion */}
            {event.createdBy === currentUser && votes.length >= 3 && (
              <div
                className="rounded-2xl p-4 border"
                style={{ background: "linear-gradient(135deg, #EBF5FB, #D6EAF8)", borderColor: "#7CB9E8" }}
              >
                <div className="flex items-start gap-2">
                  <Trophy size={16} className="text-[#4A9BD9] mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-[#4A9BD9]">Abbastanza voti raccolti!</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Proposta: {winDate} · {winTime}
                      {winVenue ? ` · ${winVenue}` : ""}
                    </p>
                    <button
                      data-testid="button-confirm-event"
                      onClick={() => confirmEvent({
                        confirmedDate: winDate,
                        confirmedTime: winTime,
                        confirmedVenue: winVenue,
                      })}
                      className="mt-2 px-4 py-2 rounded-lg text-xs font-bold text-white"
                      style={{ background: "#4A9BD9" }}
                    >
                      Conferma evento
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Date voting */}
            <section>
              <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                📅 Quando?
                <span className="text-xs text-gray-400 font-normal">
                  ({votes.filter(v => v.voteType === "date").length} voti)
                </span>
              </h3>
              <div className="space-y-2">
                {event.dateOptions.map(date => {
                  const group = dateVotes.find(g => g.value === date);
                  return (
                    <VoteBar
                      key={date}
                      value={date}
                      voters={group?.voters ?? []}
                      total={totalParticipants}
                      myVote={isMine("date", date)}
                      onVote={() => castVote({ voteType: "date", voteValue: date })}
                      disabled={false}
                    />
                  );
                })}
              </div>
            </section>

            {/* Time voting */}
            <section>
              <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                🕐 A che ora?
                <span className="text-xs text-gray-400 font-normal">
                  ({votes.filter(v => v.voteType === "time").length} voti)
                </span>
              </h3>
              <div className="space-y-2">
                {event.timeOptions.map(time => {
                  const group = timeVotes.find(g => g.value === time);
                  return (
                    <VoteBar
                      key={time}
                      value={time}
                      voters={group?.voters ?? []}
                      total={totalParticipants}
                      myVote={isMine("time", time)}
                      onVote={() => castVote({ voteType: "time", voteValue: time })}
                      disabled={false}
                    />
                  );
                })}
              </div>
            </section>

            {/* Venue voting */}
            <section>
              <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                📍 Dove?
                <span className="text-xs text-gray-400 font-normal">
                  ({votes.filter(v => v.voteType === "venue").length} voti)
                </span>
              </h3>
              <div className="space-y-2">
                {event.venueOptions.map(venue => {
                  const group = venueVotes.find(g => g.value === venue.name);
                  return (
                    <div key={venue.name} className="relative">
                      <VoteBar
                        value={venue.name}
                        voters={group?.voters ?? []}
                        total={totalParticipants}
                        myVote={isMine("venue", venue.name)}
                        onVote={() => castVote({ voteType: "venue", voteValue: venue.name })}
                        disabled={false}
                      />
                      <div className="px-3 pb-2 -mt-1 flex items-center gap-3">
                        <span className="flex items-center gap-0.5 text-xs text-amber-500 font-semibold">
                          <Star size={10} fill="currentColor" />
                          {venue.rating}
                        </span>
                        <span className="flex items-center gap-0.5 text-xs text-gray-400">
                          <MapPin size={10} />
                          {venue.distance}
                        </span>
                        {venue.discount && (
                          <span className="flex items-center gap-0.5 text-[10px] text-emerald-600 font-semibold">
                            <Tag size={9} />
                            {venue.discount}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
