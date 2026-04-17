import {
  getVotablePollTypesFromCounts,
  senderCompletedVotablePoll,
  type PollVoteLike,
} from "@shared/eventPoll";

/* ─── Contatti importati ─── */
export interface MyContact {
  id: string;           // uuid locale
  name: string;
  phone: string;
  source: "rubrica" | "manuale";
}

const LS_MY_CONTACTS = "lineup-my-contacts";

export function getMyContacts(): MyContact[] {
  try { return JSON.parse(localStorage.getItem(LS_MY_CONTACTS) ?? "[]"); } catch { return []; }
}

export function saveMyContacts(contacts: MyContact[]): void {
  localStorage.setItem(LS_MY_CONTACTS, JSON.stringify(contacts));
}

export function addMyContact(c: Omit<MyContact, "id">): MyContact {
  const all = getMyContacts();
  const entry: MyContact = { ...c, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` };
  saveMyContacts([...all, entry]);
  return entry;
}

export function removeMyContact(id: string): void {
  saveMyContacts(getMyContacts().filter(c => c.id !== id));
}

export interface VenueOption {
  name: string;
  rating: number;
  distance: string;
  discount?: string;
}

/** Dati passati da Scopri AI → creazione evento (salta categoria/sottocategoria/luoghi nel wizard). */
export type ScopriToCreatePrefill = {
  venues: VenueOption[];
  categoryKey: string;
  subcategoryLabel: string;
};

export interface ParsedEvent {
  id: number;
  activity: string;
  title: string;
  status: "planning" | "confirmed";
  createdBy: string;
  participants: string[];
  dateOptions: string[];
  timeOptions: string[];
  venueOptions: VenueOption[];
  confirmedDate?: string;
  confirmedTime?: string;
  confirmedVenue?: string;
  createdAt: string;
}

export function parseEvent(raw: any): ParsedEvent {
  return {
    ...raw,
    participants: safeParseJson(raw.participants, []),
    dateOptions: safeParseJson(raw.dateOptions, []),
    timeOptions: safeParseJson(raw.timeOptions, []),
    venueOptions: safeParseJson(raw.venueOptions, []),
  };
}

/** Categorie del sondaggio con più di un’opzione (richiedono voto per aprire la chat). */
export function getVotablePollTypesForEvent(event: ParsedEvent): Array<"date" | "time" | "venue"> {
  return getVotablePollTypesFromCounts(
    event.dateOptions.length,
    event.timeOptions.length,
    event.venueOptions.length,
  );
}

/** L’utente ha votato tutte le categorie attualmente votabili (date/time/venue con almeno 2 opzioni). */
export function userHasCompletedVotablePoll(
  userName: string,
  event: ParsedEvent,
  votes: PollVoteLike[],
): boolean {
  return senderCompletedVotablePoll(
    userName,
    event.status,
    event.dateOptions.length,
    event.timeOptions.length,
    event.venueOptions.length,
    votes,
  );
}

export type { PollVoteLike };

/** Link assoluto alla chat dell’evento (inviti / condivisione). */
export function getEventChatInviteUrl(eventId: number): string {
  if (typeof window === "undefined" || !eventId) return "";
  return `${window.location.origin}/events/${eventId}/chat`;
}

function safeParseJson<T>(val: any, fallback: T): T {
  if (!val) return fallback;
  if (typeof val !== "string") return val as T;
  try { return JSON.parse(val); } catch { return fallback; }
}

export const ACTIVITIES: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  aperitivo:  { label: "Aperitivo",  emoji: "🍸", color: "#4A9BD9", bg: "#EBF5FB" },
  padel:      { label: "Padel",      emoji: "🎾", color: "#10b981", bg: "#D1FAE5" },
  cena:       { label: "Cena",       emoji: "🍽️", color: "#f97316", bg: "#FEF3C7" },
  pizza:      { label: "Pizza",      emoji: "🍕", color: "#ef4444", bg: "#FEE2E2" },
  calcio:     { label: "Calcio",     emoji: "⚽", color: "#22c55e", bg: "#D1FAE5" },
  cinema:     { label: "Cinema",     emoji: "🎬", color: "#8b5cf6", bg: "#EDE9FE" },
  gita:       { label: "Gita",       emoji: "🚗", color: "#0ea5e9", bg: "#E0F2FE" },
  montagna:   { label: "Montagna",   emoji: "⛰️", color: "#84cc16", bg: "#ECFCCB" },
  mare:       { label: "Mare",       emoji: "🌊", color: "#0284c7", bg: "#E0F2FE" },
  sport:      { label: "Sport",      emoji: "💪", color: "#f59e0b", bg: "#FEF3C7" },
  palestra:   { label: "Palestra",   emoji: "🏋️", color: "#f59e0b", bg: "#FEF3C7" },
  teatro:     { label: "Teatro",     emoji: "🎭", color: "#8b5cf6", bg: "#EDE9FE" },
  spuntino:   { label: "Spuntino",   emoji: "🥐", color: "#f97316", bg: "#FEF3C7" },
  musei:      { label: "Musei",      emoji: "🏛️", color: "#0ea5e9", bg: "#E0F2FE" },
  escape:     { label: "Escape room",emoji: "🔑", color: "#8b5cf6", bg: "#EDE9FE" },
  concerto:   { label: "Concerto",   emoji: "🎵", color: "#ec4899", bg: "#FCE7F3" },
  altro:      { label: "Altro",      emoji: "📅", color: "#6b7280", bg: "#F3F4F6" },
};

export function getActivity(key: string) {
  if (ACTIVITIES[key]) return ACTIVITIES[key];
  // Fuzzy match: cerca la chiave nell'attività o l'attività nella chiave
  const k = (key ?? "").toLowerCase();
  const found = Object.entries(ACTIVITIES).find(([aKey]) =>
    aKey !== "altro" && (k.includes(aKey) || aKey.includes(k))
  );
  return found ? found[1] : ACTIVITIES.altro;
}

export const AVATAR_COLORS: Record<string, string> = {
  Io: "#4A9BD9",
  Giovanni: "#f97316",
  Elena: "#10b981",
  Marco: "#8b5cf6",
  Luca: "#ef4444",
  Mary: "#ec4899",
};

export function getAvatarColor(name: string) {
  return AVATAR_COLORS[name] ?? "#6b7280";
}

export function getInitials(name: string) {
  if (name === "Io") return "IO";
  return name.slice(0, 2).toUpperCase();
}

export const CONTACTS = ["Giovanni", "Elena", "Marco", "Luca", "Mary"];
export const GROUPS = [
  { name: "Calcetto Sabato", count: 6 },
  { name: "Gruppo Classe", count: 12 },
  { name: "Amici storici", count: 8 },
];

export const DAYS_IT = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
export const MONTHS_IT = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

export function generateDateOptions(daysAhead = 14): string[] {
  const options: string[] = [];
  const today = new Date();
  for (let i = 1; i <= daysAhead; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    options.push(`${DAYS_IT[d.getDay()]} ${d.getDate()}`);
  }
  return options;
}

export const VENUES_BY_ACTIVITY: Record<string, VenueOption[]> = {
  aperitivo: [
    { name: "Bar del Corso", rating: 4.6, distance: "0.3 km", discount: "Tagliere gratis" },
    { name: "Terrazza Skyline", rating: 4.8, distance: "1.0 km", discount: "2x1 Spritz" },
    { name: "Lounge Cafè", rating: 4.5, distance: "1.8 km" },
    { name: "Osteria Moderna", rating: 4.4, distance: "2.1 km" },
    { name: "Freni e Frizioni", rating: 4.6, distance: "1.3 km", discount: "Spritz €5" },
    { name: "Il Sorpasso", rating: 4.7, distance: "0.9 km" },
  ],
  padel: [
    { name: "Padel Club Roma", rating: 4.8, distance: "1.2 km", discount: "15% di sconto" },
    { name: "Sport Arena", rating: 4.6, distance: "0.9 km" },
    { name: "Centro Sportivo Nord", rating: 4.5, distance: "2.3 km" },
    { name: "PlayPadel", rating: 4.7, distance: "3.1 km", discount: "Racchetta inclusa" },
    { name: "Padel Rome Eur", rating: 4.6, distance: "4.0 km" },
    { name: "Smash Padel Club", rating: 4.5, distance: "2.8 km", discount: "1a ora gratis" },
  ],
  cena: [
    { name: "Trattoria Da Mario", rating: 4.9, distance: "0.8 km", discount: "10% sul conto" },
    { name: "Ristorante La Pergola", rating: 4.7, distance: "1.5 km" },
    { name: "Osteria del Borgo", rating: 4.8, distance: "1.1 km", discount: "Dolce offerto" },
    { name: "Il Cortile", rating: 4.6, distance: "2.0 km" },
    { name: "Ristorante Uno e Bino", rating: 4.8, distance: "1.3 km" },
    { name: "Da Enzo al 29", rating: 4.9, distance: "0.7 km", discount: "Vino della casa" },
  ],
  pranzo: [
    { name: "Trattoria Moderna", rating: 4.7, distance: "0.4 km", discount: "Menù €12" },
    { name: "Salumeria Roscioli", rating: 4.9, distance: "1.1 km" },
    { name: "Osteria Barberini", rating: 4.6, distance: "0.8 km" },
    { name: "Supplì Roma", rating: 4.7, distance: "0.5 km", discount: "2x1 supplì" },
    { name: "Forno Campo de' Fiori", rating: 4.8, distance: "0.6 km" },
  ],
  colazione: [
    { name: "Bar San Calisto", rating: 4.6, distance: "0.2 km", discount: "Cornetto gratis" },
    { name: "Pasticceria Regoli", rating: 4.9, distance: "1.4 km" },
    { name: "Antico Forno Roscioli", rating: 4.8, distance: "0.9 km" },
    { name: "Caffè Greco", rating: 4.7, distance: "1.6 km" },
    { name: "Bar del Fico", rating: 4.5, distance: "0.7 km" },
  ],
  spuntino: [
    { name: "Supplì Roma", rating: 4.7, distance: "0.5 km" },
    { name: "Bonci Pizzarium", rating: 4.9, distance: "1.8 km" },
    { name: "Trapizzino", rating: 4.8, distance: "1.0 km", discount: "3x2 trappizzini" },
    { name: "Forno La Renella", rating: 4.7, distance: "0.8 km" },
  ],
  pizza: [
    { name: "Pizzeria Napoli", rating: 4.6, distance: "0.5 km" },
    { name: "Da Gennaro", rating: 4.9, distance: "1.3 km", discount: "Pizza margherita gratis" },
    { name: "Pizza 4 Stagioni", rating: 4.5, distance: "0.7 km" },
    { name: "Fornace Pizzeria", rating: 4.7, distance: "1.8 km" },
    { name: "Seu Pizza Illuminati", rating: 4.8, distance: "1.1 km" },
    { name: "Pizzarium Bonci", rating: 4.9, distance: "1.7 km", discount: "Trancio omaggio" },
  ],
  calcio: [
    { name: "Centro Sportivo Prati", rating: 4.7, distance: "1.0 km", discount: "1 ora gratis" },
    { name: "Oratorio San Paolo", rating: 4.5, distance: "0.6 km" },
    { name: "Campo Sintetico Nord", rating: 4.6, distance: "2.2 km" },
    { name: "Sport Village", rating: 4.8, distance: "3.0 km", discount: "20% sconto" },
    { name: "ASD Calcio Roma Est", rating: 4.6, distance: "3.5 km" },
  ],
  tennis: [
    { name: "Tennis Club Parioli", rating: 4.8, distance: "2.1 km", discount: "Campo gratuito 1a volta" },
    { name: "Circolo Tennis Roma", rating: 4.7, distance: "1.8 km" },
    { name: "Centro Tennis EUR", rating: 4.6, distance: "5.0 km" },
    { name: "TC Foro Italico", rating: 4.9, distance: "2.5 km" },
  ],
  palestra: [
    { name: "Palestra FitLife", rating: 4.7, distance: "0.4 km", discount: "1 giorno gratis" },
    { name: "CrossFit Roma Nord", rating: 4.8, distance: "1.2 km" },
    { name: "Virgin Active Prati", rating: 4.6, distance: "0.9 km", discount: "Giornata prova" },
    { name: "Gym One", rating: 4.5, distance: "0.6 km" },
    { name: "Planet Fitness Roma", rating: 4.4, distance: "1.5 km", discount: "1 mese €29" },
  ],
  piscina: [
    { name: "Piscina delle Rose EUR", rating: 4.7, distance: "5.5 km", discount: "Ingresso €8" },
    { name: "Piscina Olimpica Foro Italico", rating: 4.8, distance: "2.4 km" },
    { name: "Aquaniene", rating: 4.6, distance: "3.0 km" },
    { name: "Piscina Comunale Tor di Quinto", rating: 4.5, distance: "4.0 km", discount: "Abbonamento estate" },
  ],
  cinema: [
    { name: "Cinema Odeon", rating: 4.7, distance: "0.9 km", discount: "Popcorn incluso" },
    { name: "The Space Cinema Moderno", rating: 4.5, distance: "2.1 km", discount: "-15% online" },
    { name: "Cinema Troisi", rating: 4.8, distance: "1.4 km" },
    { name: "Multisala Barberini", rating: 4.6, distance: "1.0 km" },
    { name: "Cinema Farnese", rating: 4.7, distance: "0.8 km" },
  ],
  musei: [
    { name: "Musei Capitolini", rating: 4.8, distance: "1.2 km", discount: "Under 18 gratis" },
    { name: "Galleria Borghese", rating: 4.9, distance: "2.0 km" },
    { name: "Museo Nazionale Romano", rating: 4.7, distance: "0.9 km" },
    { name: "Palazzo Venezia", rating: 4.6, distance: "0.7 km" },
    { name: "MAXXI", rating: 4.7, distance: "2.3 km", discount: "-20% weekend" },
  ],
  mostre: [
    { name: "Palazzo delle Esposizioni", rating: 4.7, distance: "0.8 km" },
    { name: "MACRO Museo Arte Contemporanea", rating: 4.6, distance: "1.5 km" },
    { name: "Fondazione Roma Museo", rating: 4.7, distance: "1.1 km", discount: "Studenti -50%" },
    { name: "Galleria Nazionale d'Arte Moderna", rating: 4.8, distance: "2.0 km" },
  ],
  concerti: [
    { name: "Auditorium Parco della Musica", rating: 4.9, distance: "2.2 km" },
    { name: "Palazzo dello Sport EUR", rating: 4.7, distance: "6.0 km" },
    { name: "Rock in Roma - Ippodromo", rating: 4.6, distance: "4.5 km" },
    { name: "Atlantico Live", rating: 4.6, distance: "5.0 km" },
    { name: "Orion Club", rating: 4.5, distance: "3.0 km" },
  ],
  discoteche: [
    { name: "Centralino Club", rating: 4.5, distance: "1.2 km" },
    { name: "The Beach Murazzi", rating: 4.6, distance: "0.9 km", discount: "Ingresso serale" },
    { name: "Hiroshima Mon Amour", rating: 4.7, distance: "3.5 km" },
    { name: "Notorius Club", rating: 4.4, distance: "2.8 km" },
  ],
  teatro: [
    { name: "Teatro Argentina", rating: 4.9, distance: "0.9 km" },
    { name: "Teatro Valle", rating: 4.7, distance: "1.0 km", discount: "Under 26 -30%" },
    { name: "Teatro Quirino", rating: 4.8, distance: "1.2 km" },
    { name: "Globe Theatre Villa Borghese", rating: 4.8, distance: "2.0 km" },
    { name: "Teatro Eliseo", rating: 4.7, distance: "1.5 km" },
  ],
  fiere: [
    { name: "Fiera di Roma", rating: 4.6, distance: "12 km" },
    { name: "Mercato di Porta Portese", rating: 4.7, distance: "2.3 km" },
    { name: "Mercato Testaccio", rating: 4.8, distance: "1.8 km" },
    { name: "La Città dell'Altra Economia", rating: 4.5, distance: "2.0 km" },
  ],
  festival: [
    { name: "Rock in Roma", rating: 4.7, distance: "4.5 km" },
    { name: "Villa Ada Incontra il Mondo", rating: 4.8, distance: "3.0 km" },
    { name: "Massenzio Festival", rating: 4.7, distance: "1.0 km" },
    { name: "Estate Romana - Lungotevere", rating: 4.6, distance: "0.8 km" },
  ],
  gita: [
    { name: "Castel Gandolfo", rating: 4.8, distance: "25 km", discount: "Tour guidato gratis" },
    { name: "Tivoli - Villa d'Este", rating: 4.9, distance: "30 km" },
    { name: "Ostia Antica", rating: 4.7, distance: "28 km" },
    { name: "Bracciano", rating: 4.6, distance: "40 km" },
  ],
  montagna: [
    { name: "Campo Felice", rating: 4.8, distance: "92 km", discount: "Skipass -10%" },
    { name: "Terminillo", rating: 4.7, distance: "80 km" },
    { name: "Ovindoli", rating: 4.6, distance: "105 km" },
    { name: "Monte Livata", rating: 4.5, distance: "60 km" },
  ],
  mare: [
    { name: "Lido di Ostia", rating: 4.5, distance: "28 km", discount: "Ombrellone gratis" },
    { name: "Anzio Riviera", rating: 4.7, distance: "60 km" },
    { name: "Sperlonga", rating: 4.9, distance: "120 km" },
    { name: "Santa Marinella", rating: 4.6, distance: "65 km" },
  ],
  sport: [
    { name: "Palestra FitLife", rating: 4.7, distance: "0.4 km", discount: "1 giorno gratis" },
    { name: "CrossFit Box", rating: 4.8, distance: "1.2 km" },
    { name: "Piscina Olimpica", rating: 4.6, distance: "2.0 km", discount: "Ingresso €3" },
    { name: "Centro Yoga Vivere", rating: 4.9, distance: "0.8 km" },
    { name: "Circolo Tennis Roma", rating: 4.7, distance: "1.8 km" },
  ],
  altro: [
    { name: "Parco Villa Borghese", rating: 4.8, distance: "1.5 km" },
    { name: "Mercato di Porta Portese", rating: 4.6, distance: "2.3 km" },
    { name: "Centro storico", rating: 4.9, distance: "0.5 km" },
    { name: "Prati - Quartiere", rating: 4.5, distance: "1.0 km" },
    { name: "Piazza Navona", rating: 4.9, distance: "0.8 km" },
    { name: "Trastevere", rating: 4.8, distance: "1.2 km" },
  ],
};

export function getCurrentUser(): string {
  return localStorage.getItem("lineup_username") || "Io";
}

export function setCurrentUser(name: string) {
  localStorage.setItem("lineup_username", name);
}

export function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}
