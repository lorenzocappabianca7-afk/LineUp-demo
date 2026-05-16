import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import {
  ArrowLeft, MessageCircle, CheckCircle2, Star, MapPin, Tag,
  Users, Clock, Trophy,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  parseEvent,
  getActivity,
  getAvatarColor,
  getInitials,
  getCurrentUser,
  userHasCompletedVotablePoll,
  venueLocationPreview,
} from "@/lib/appUtils";
import { PollOptionButton } from "@/components/poll/PollOptionButton";

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
    mutationFn: async ({ voteType, voteValue }: { voteType: string; voteValue: string }) => {
      const res = await apiRequest("POST", `/api/app/events/${id}/votes`, {
        voterName: currentUser,
        voteType,
        voteValue,
      });
      return res.json().catch(() => ({}));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/app/events", id, "votes"] });
    },
    onError: (err: Error) =>
      toast({
        title: "Errore nel voto",
        description: err.message || "Riprova tra poco.",
        variant: "destructive",
      }),
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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const event = parseEvent(rawEvent);
  const act = getActivity(event.activity);
  const isPlanning = event.status === "planning";
  const canUseChat = userHasCompletedVotablePoll(currentUser, event, votes);

  const dateVotes = groupVotes(votes, "date");
  const timeVotes = groupVotes(votes, "time");
  const venueVotes = groupVotes(votes, "venue");

  const dateBallotTotal = event.dateOptions.reduce((sum, d) => {
    const g = dateVotes.find((x) => x.value === d);
    return sum + (g?.voters.length ?? 0);
  }, 0);
  const timeBallotTotal = event.timeOptions.reduce((sum, t) => {
    const g = timeVotes.find((x) => x.value === t);
    return sum + (g?.voters.length ?? 0);
  }, 0);
  const venueBallotTotal = event.venueOptions.reduce((sum, v) => {
    const g = venueVotes.find((x) => x.value === v.name);
    return sum + (g?.voters.length ?? 0);
  }, 0);

  const dateMaxVoters = Math.max(
    0,
    ...event.dateOptions.map((d) => dateVotes.find((g) => g.value === d)?.voters.length ?? 0),
  );
  const timeMaxVoters = Math.max(
    0,
    ...event.timeOptions.map((t) => timeVotes.find((g) => g.value === t)?.voters.length ?? 0),
  );
  const venueMaxVoters = Math.max(
    0,
    ...event.venueOptions.map((v) => venueVotes.find((g) => g.value === v.name)?.voters.length ?? 0),
  );

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
      <div className="bg-card px-5 pt-12 pb-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/">
            <button
              data-testid="button-back"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-muted"
            >
              <ArrowLeft size={18} className="text-muted-foreground" />
            </button>
          </Link>
          <div className="flex-1" />
          {canUseChat || !isPlanning ? (
            <Link href={`/events/${id}/chat`}>
              <button
                data-testid="button-go-chat"
                type="button"
                className="flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-2 text-sm font-semibold text-primary"
              >
                <MessageCircle size={15} />
                Chat
                {messages.length > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {messages.length}
                  </span>
                )}
              </button>
            </Link>
          ) : (
            <button
              type="button"
              data-testid="button-go-chat-locked"
              onClick={() =>
                toast({
                  title: "Completa il sondaggio",
                  description:
                    "Vota tutte le categorie con più opzioni (giorno, ora, luogo) prima di aprire la chat.",
                })
              }
              className="flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-2 text-sm font-semibold text-primary opacity-50"
            >
              <MessageCircle size={15} />
              Chat
            </button>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl shrink-0"
            style={{ backgroundColor: act.bg }}
          >
            {act.emoji}
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{act.label}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Organizzato da {event.createdBy}
            </p>
            <div className="mt-2">
              {isPlanning ? (
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
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
          <Users size={14} className="text-muted-foreground" />
          <div className="flex -space-x-1.5">
            {event.participants.map(name => (
              <div
                key={name}
                title={name}
                className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card text-[10px] font-bold text-white"
                style={{ backgroundColor: getAvatarColor(name) }}
              >
                {getInitials(name)}
              </div>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">
            {event.participants.join(", ")}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-4 space-y-3.5">
        {/* Confirmed info */}
        {!isPlanning && (
          <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
            <h3 className="text-sm font-bold text-emerald-700 mb-3 flex items-center gap-1.5">
              <CheckCircle2 size={14} />
              Dettagli confermati
            </h3>
            <div className="space-y-2">
              {event.confirmedVenue && (
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-emerald-500" />
                  <span className="text-sm text-gray-700 font-medium">{event.confirmedVenue}</span>
                </div>
              )}
              {event.confirmedDate && (
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-emerald-500" />
                  <span className="text-sm text-gray-700 font-medium">
                    {event.confirmedDate} · {event.confirmedTime}
                  </span>
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
              <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 p-3">
                <div className="flex items-start gap-2">
                  <Trophy size={14} className="mt-0.5 shrink-0 text-primary" />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-primary">Abbastanza voti raccolti!</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground leading-snug">
                      Proposta: {winVenue ? `${winVenue} · ` : ""}{winDate} · {winTime}
                    </p>
                    <button
                      data-testid="button-confirm-event"
                      onClick={() => confirmEvent({
                        confirmedDate: winDate,
                        confirmedTime: winTime,
                        confirmedVenue: winVenue,
                      })}
                      className="mt-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground hover:bg-primary/90"
                    >
                      Conferma evento
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Sondaggi: sfondo blu, opzioni bianche */}
            <div className="space-y-4 rounded-2xl bg-blue-600 p-3 shadow-sm">
            {/* Venue voting — prima del giorno */}
            <section>
              <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-white">
                📍 Dove?
                {event.venueOptions.length > 1 && (
                  <span className="text-[11px] font-normal text-blue-200">
                    ({votes.filter((v) => v.voteType === "venue").length} voti)
                  </span>
                )}
              </h3>
              {event.venueOptions.length <= 1 ? (
                <div className="space-y-1.5">
                  {event.venueOptions.length === 0 ? (
                    <p className="text-[11px] text-blue-200 px-1">Nessun luogo indicato nel sondaggio.</p>
                  ) : (
                    event.venueOptions.map((venue) => (
                      <div key={venue.name} className="relative">
                        <div className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-left text-xs font-semibold text-gray-800 shadow-sm">
                          {venue.name}
                          <span className="block text-[9px] font-medium text-gray-400 mt-0.5">
                            Predefinito dall&apos;organizzatore
                          </span>
                        </div>
                        <div className="px-2.5 pb-1.5 -mt-0.5 flex flex-wrap items-center gap-2">
                          <span className="flex items-center gap-0.5 text-[11px] text-amber-500 font-semibold">
                            <Star size={9} fill="currentColor" />
                            {venue.rating}
                          </span>
                          <span className="flex items-center gap-0.5 text-[11px] text-gray-400">
                            <MapPin size={9} />
                            {venueLocationPreview(venue)}
                          </span>
                          {venue.discount && (
                            <span className="flex items-center gap-0.5 text-[9px] text-emerald-600 font-semibold">
                              <Tag size={8} />
                              {venue.discount}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {event.venueOptions.map((venue) => {
                    const group = venueVotes.find((g) => g.value === venue.name);
                    const voters = group?.voters ?? [];
                    const n = voters.length;
                    return (
                      <PollOptionButton
                        key={venue.name}
                        variant="onBlue"
                        label={venue.name}
                        sub={
                          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                            <span className="flex items-center gap-0.5 text-[11px] font-semibold text-amber-500">
                              <Star size={9} fill="currentColor" />
                              {venue.rating}
                            </span>
                            <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                              <MapPin size={9} />
                              {venueLocationPreview(venue)}
                            </span>
                            {venue.discount ? (
                              <span className="flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600">
                                <Tag size={8} />
                                {venue.discount}
                              </span>
                            ) : null}
                          </div>
                        }
                        voters={voters}
                        totalBallots={venueBallotTotal}
                        selected={isMine("venue", venue.name)}
                        onClick={() => castVote({ voteType: "venue", voteValue: venue.name })}
                        showTopBadge={n > 0 && n === venueMaxVoters}
                        data-testid={`vote-option-${venue.name}`}
                      />
                    );
                  })}
                </div>
              )}
            </section>

            {/* Date voting */}
            <section>
              <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-white">
                📅 Quando?
                {event.dateOptions.length > 1 && (
                  <span className="text-[11px] font-normal text-blue-200">
                    ({votes.filter((v) => v.voteType === "date").length} voti)
                  </span>
                )}
              </h3>
              {event.dateOptions.length <= 1 ? (
                <div className="space-y-1.5">
                  {(event.dateOptions[0] ? [event.dateOptions[0]] : ["—"]).map((date) => (
                    <div
                      key={date}
                      className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-left text-xs font-semibold text-gray-800 shadow-sm"
                    >
                      {date}
                      <span className="block text-[9px] font-medium text-gray-400 mt-0.5">
                        Predefinito dall&apos;organizzatore
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {event.dateOptions.map((date) => {
                    const group = dateVotes.find((g) => g.value === date);
                    const voters = group?.voters ?? [];
                    const n = voters.length;
                    return (
                      <PollOptionButton
                        key={date}
                        variant="onBlue"
                        label={date}
                        voters={voters}
                        totalBallots={dateBallotTotal}
                        selected={isMine("date", date)}
                        onClick={() => castVote({ voteType: "date", voteValue: date })}
                        showTopBadge={n > 0 && n === dateMaxVoters}
                        data-testid={`vote-option-${date}`}
                      />
                    );
                  })}
                </div>
              )}
            </section>

            {/* Time voting */}
            <section>
              <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-white">
                🕐 A che ora?
                {event.timeOptions.length > 1 && (
                  <span className="text-[11px] font-normal text-blue-200">
                    ({votes.filter((v) => v.voteType === "time").length} voti)
                  </span>
                )}
              </h3>
              {event.timeOptions.length <= 1 ? (
                <div className="space-y-1.5">
                  {(event.timeOptions[0] ? [event.timeOptions[0]] : ["—"]).map((time) => (
                    <div
                      key={time}
                      className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-left text-xs font-semibold text-gray-800 shadow-sm"
                    >
                      {time}
                      <span className="block text-[9px] font-medium text-gray-400 mt-0.5">
                        Predefinito dall&apos;organizzatore
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {event.timeOptions.map((time) => {
                    const group = timeVotes.find((g) => g.value === time);
                    const voters = group?.voters ?? [];
                    const n = voters.length;
                    return (
                      <PollOptionButton
                        key={time}
                        variant="onBlue"
                        label={time}
                        voters={voters}
                        totalBallots={timeBallotTotal}
                        selected={isMine("time", time)}
                        onClick={() => castVote({ voteType: "time", voteValue: time })}
                        showTopBadge={n > 0 && n === timeMaxVoters}
                        data-testid={`vote-option-${time}`}
                      />
                    );
                  })}
                </div>
              )}
            </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
