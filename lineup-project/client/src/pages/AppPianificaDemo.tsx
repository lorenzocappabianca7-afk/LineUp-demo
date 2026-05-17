import { useEffect, useState } from "react";
import { Link } from "wouter";
import { CalendarPlus, X } from "lucide-react";
import AppCreateEvent from "@/pages/AppCreateEvent";
import { AiVenuesSoonIcon } from "@/components/icons/AiVenuesSoonIcon";
import { setCurrentUser } from "@/lib/appUtils";

const GATE_STORAGE_KEY = "lineup_pianifica_demo_gate_v1";

type DemoGateProfile = { name: string; email: string };

function readStoredGate(): DemoGateProfile | null {
  try {
    const raw = sessionStorage.getItem(GATE_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as DemoGateProfile;
    if (!data?.name?.trim() || !data?.email?.trim()) return null;
    return { name: data.name.trim(), email: data.email.trim() };
  } catch {
    return null;
  }
}

function isValidEmail(value: string) {
  const t = value.trim();
  return t.length >= 3 && t.includes("@") && !/\s/.test(t);
}

function completeDemoGate(profile: DemoGateProfile) {
  sessionStorage.setItem(GATE_STORAGE_KEY, JSON.stringify(profile));
  setCurrentUser(profile.name);
}

/**
 * Pagina pubblica di prova (QR): nome + email, poi tasto Pianifica.
 * Senza bottom nav e senza navigazione alla chat dopo la creazione.
 */
export default function AppPianificaDemo() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [gateDone, setGateDone] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  useEffect(() => {
    const stored = readStoredGate();
    if (stored) {
      setName(stored.name);
      setEmail(stored.email);
      setGateDone(true);
      setCurrentUser(stored.name);
    }
  }, []);

  const canConfirmGate = name.trim().length >= 1 && isValidEmail(email);

  const confirmGate = () => {
    if (!canConfirmGate) return;
    const profile = { name: name.trim(), email: email.trim().toLowerCase() };
    completeDemoGate(profile);
    setGateDone(true);
  };

  return (
    <div className="flex min-h-full flex-col bg-background">
      <div className="border-b border-border bg-card px-5 pb-5 pt-12 shadow-soft">
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-primary">Prova</p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Pianifica le tue attività</h1>
        <p className="mt-1 text-sm text-muted-foreground">Torino · dalla Mole al tuo calendario</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Demo interattiva: al termine non è disponibile l&apos;accesso alla chat.
        </p>
      </div>

      {!gateDone ? (
        <div className="flex flex-1 flex-col justify-center px-5 py-10">
          <div className="mx-auto w-full max-w-[320px] rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Prima di provare</h2>
            <p className="mt-1 text-sm text-gray-500 leading-snug">
              Inserisci nome e email per accedere alla demo del tasto Pianifica.
            </p>

            <label className="mt-5 block text-xs font-bold text-gray-600">Nome</label>
            <input
              data-testid="input-demo-gate-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Es. Lorenzo"
              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary/30"
              autoComplete="name"
            />

            <label className="mt-4 block text-xs font-bold text-gray-600">Email</label>
            <input
              data-testid="input-demo-gate-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@email.com"
              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary/30"
              autoComplete="email"
            />

            <button
              type="button"
              data-testid="button-demo-gate-confirm"
              disabled={!canConfirmGate}
              onClick={confirmGate}
              className="mt-5 w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
            >
              Conferma
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-8 px-5 py-12">
          <p className="text-center text-sm text-muted-foreground">
            Ciao <span className="font-semibold text-foreground">{name}</span>, prova il flusso Pianifica.
          </p>

          <button
            type="button"
            data-testid="button-pianifica-demo-page"
            onClick={() => setSheetOpen(true)}
            className="flex h-[168px] w-[168px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-full bg-primary text-primary-foreground shadow-md outline-none ring-offset-background transition-transform duration-200 hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.97] motion-reduce:transform-none"
            aria-label="Apri pianificazione nuovo evento (prova)"
          >
            <CalendarPlus size={46} strokeWidth={2} className="text-primary-foreground" aria-hidden />
            <span className="text-base font-bold tracking-wide">Pianifica</span>
          </button>

          <div className="w-full max-w-[320px] rounded-xl border-2 border-black bg-white px-4 py-3.5 shadow-sm">
            <div className="flex items-start gap-3">
              <AiVenuesSoonIcon className="mt-0.5" />
              <p className="text-left text-sm font-medium leading-snug text-gray-900">
                La ricerca AI dei luoghi a Torino è attiva: nei risultati vedrai soprattutto quartiere e zona, non
                indirizzi precisi inventati.
              </p>
            </div>
          </div>
        </div>
      )}

      <Link
        href="/prova-pianifica/riscontri"
        className="py-3 text-center text-[10px] text-gray-300/80 hover:text-gray-400"
        aria-label="Riscontri demo"
      >
        ·
      </Link>

      {sheetOpen && gateDone && (
        <div
          className="fixed left-1/2 top-10 z-[100] w-[calc(100%-24px)] max-w-[360px] -translate-x-1/2 rounded-[20px] bg-primary bottom-10"
          style={{ animation: "expandFromPianifica 420ms cubic-bezier(0.2,0,0,1) forwards" }}
        >
          <div className="absolute inset-[3px] flex flex-col overflow-hidden rounded-[17px] bg-white">
            <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 pb-4 pt-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Nuovo evento</h2>
                <p className="mt-0.5 text-xs font-medium text-amber-700">Modalità prova</p>
              </div>
              <button
                type="button"
                data-testid="button-close-create-demo"
                onClick={() => setSheetOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100"
              >
                <X size={16} className="text-gray-600" />
              </button>
            </div>
            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
              <AppCreateEvent
                key={`pianifica-demo:${email}`}
                previewMode
                previewProfile={{ name: name.trim(), email: email.trim().toLowerCase() }}
                onClose={() => setSheetOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
