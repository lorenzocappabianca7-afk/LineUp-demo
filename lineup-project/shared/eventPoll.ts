import { parseSurveyMode, surveyBehavior, type SurveyModeId } from "./surveyModes";

/** Voto minimale per controlli server/client. */
export type PollVoteLike = { voterName: string; voteType: string };

/** Categorie del sondaggio che richiedono almeno un voto (solo se c’è più di un’opzione). */
export function getVotablePollTypesFromCounts(
  dateLen: number,
  timeLen: number,
  venueLen: number,
): Array<"date" | "time" | "venue"> {
  const out: Array<"date" | "time" | "venue"> = [];
  if (dateLen > 1) out.push("date");
  if (timeLen > 1) out.push("time");
  if (venueLen > 1) out.push("venue");
  return out;
}

/**
 * True se l’utente può usare la chat: evento confermato, oppure nessuna categoria votabile,
 * oppure ha almeno un voto per ogni categoria votabile (date/time/venue).
 */
export function senderCompletedVotablePoll(
  senderName: string,
  eventStatus: string,
  dateLen: number,
  timeLen: number,
  venueLen: number,
  votes: PollVoteLike[],
  surveyModeRaw?: unknown,
): boolean {
  if (eventStatus === "confirmed") return true;
  const needed = getVotablePollTypesFromCounts(dateLen, timeLen, venueLen);
  if (needed.length > 0) {
    return needed.every((t) => votes.some((v) => v.voterName === senderName && v.voteType === t));
  }
  const mode: SurveyModeId = parseSurveyMode(surveyModeRaw);
  const { attendance } = surveyBehavior(mode);
  if (attendance === "ternary") {
    return votes.some((v) => v.voterName === senderName && v.voteType === "attendance");
  }
  return true;
}
