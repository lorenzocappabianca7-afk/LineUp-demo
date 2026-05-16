import {
  UtensilsCrossed,
  Landmark,
  Dumbbell,
  Ticket,
  Gamepad2,
  type LucideIcon,
} from "lucide-react";

export type PlanCategoryDef = {
  key: string;
  label: string;
  Icon: LucideIcon;
  cols: number;
  radius: string;
};

/** Stesse categorie del tasto nero Pianifica (griglia "Scegli una categoria"). */
export const PLAN_CATEGORIES: readonly PlanCategoryDef[] = [
  { key: "cibo", label: "Cibo", Icon: UtensilsCrossed, cols: 3, radius: "28px 10px 28px 10px" },
  { key: "cultura", label: "Cultura", Icon: Landmark, cols: 2, radius: "10px 28px 10px 28px" },
  { key: "sport", label: "Sport", Icon: Dumbbell, cols: 2, radius: "28px 10px 10px 28px" },
  { key: "eventi", label: "Eventi", Icon: Ticket, cols: 1, radius: "10px 10px 28px 28px" },
  { key: "svago", label: "Svago", Icon: Gamepad2, cols: 2, radius: "10px 28px 28px 10px" },
] as const;

/** Stesse sottocategorie del Pianifica ("Scegli una sottocategoria"). */
export const PLAN_SUBCATEGORIES: Record<string, readonly string[]> = {
  /** Solo le prime sei sottocategorie (fino a Brunch) per il flusso Cibo in app. */
  cibo: ["Aperitivo", "Cena", "Colazione", "Pranzo", "Spuntino", "Brunch"],
  cultura: ["Mostre", "Musei"],
  sport: [
    "Arti marziali",
    "Basket",
    "Beach volley",
    "Bici",
    "Calcio",
    "Camminata",
    "Canoa",
    "Corsa",
    "Hockey",
    "Padel",
    "Palestra",
    "Pallavolo",
    "Pattinaggio",
    "Ping pong",
    "Piscina",
    "Sci",
    "Snowboard",
    "Tennis",
    "Arrampicata",
    "Skateboard",
    "Skateboard park",
    "Tiro con l'arco",
    "Parchi per ciclismo",
    "Nuoto",
  ],
  eventi: ["Concerti", "Discoteche", "Festival", "Fiere", "Teatro"],
  svago: ["Giro in centro", "Giornata al mare", "Mercatino", "Passeggiata", "Uscita", "Uscita in montagna"],
};

/** Allinea le etichette sottocategoria al pool demo `VENUES_BY_ACTIVITY` (come in AppCreateEvent). */
const SUBCATEGORY_TO_VENUE_POOL: Record<string, string> = {
  aperitivo: "aperitivo",
  cena: "cena",
  colazione: "cibo",
  pranzo: "pranzo",
  spuntino: "cibo",
  brunch: "cibo",
  mostre: "gita",
  musei: "gita",
  "arti marziali": "sport",
  basket: "sport",
  "beach volley": "sport",
  bici: "sport",
  calcio: "calcio",
  camminata: "sport",
  canoa: "sport",
  corsa: "sport",
  hockey: "sport",
  padel: "padel",
  palestra: "palestra",
  pallavolo: "sport",
  pattinaggio: "sport",
  "ping pong": "sport",
  piscina: "piscina",
  sci: "montagna",
  snowboard: "montagna",
  tennis: "tennis",
  concerti: "cinema",
  discoteche: "discoteche",
  festival: "cinema",
  fiere: "fiere",
  teatro: "cinema",
  "giro in centro": "altro",
  "giornata al mare": "mare",
  mercatino: "fiere",
  passeggiata: "altro",
  uscita: "altro",
  "uscita in montagna": "montagna",
  arrampicata: "sport",
  skateboard: "sport",
  "skateboard park": "sport",
  "tiro con l'arco": "sport",
  "parchi per ciclismo": "sport",
  nuoto: "sport",
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

export function venuePoolKeyForPlanSubcategory(label: string): string {
  const n = label.trim().toLowerCase();
  return SUBCATEGORY_TO_VENUE_POOL[n] ?? n;
}
