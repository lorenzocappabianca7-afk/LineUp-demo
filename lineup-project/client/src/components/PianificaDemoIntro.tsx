import { CalendarDays, MapPin, Sparkles, Users, Vote } from "lucide-react";

type Props = {
  userName?: string;
  onContinue: () => void;
};

const HIGHLIGHTS = [
  {
    icon: CalendarDays,
    title: "Un calendario sociale",
    body: "Proponi uscite, cene e attività: il gruppo vota date, orari e luoghi in un solo posto.",
  },
  {
    icon: Vote,
    title: "Sondaggi chiari",
    body: "Niente più chat infinite: ognuno esprime preferenze e si vede subito cosa conviene a tutti.",
  },
  {
    icon: MapPin,
    title: "Torino, con intelligenza",
    body: "L’AI ti suggerisce locali e zone adatte a ciò che avete scelto — senza perdere tempo a cercare.",
  },
  {
    icon: Users,
    title: "Pensato per il gruppo",
    body: "Inviti, proposte e decisioni insieme: LineUp tiene unito il piano, non solo la conversazione.",
  },
] as const;

/** Presentazione LineUp prima del tasto Pianifica nella demo QR. */
export function PianificaDemoIntro({ userName, onContinue }: Props) {
  const greeting = userName?.trim() ? `Ciao ${userName.trim()},` : "Ciao,";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        data-testid="demo-intro-scroll"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 [-webkit-overflow-scrolling:touch] touch-pan-y"
      >
        <div className="mx-auto w-full max-w-[320px]">
          <p className="text-center text-sm font-medium text-muted-foreground">{greeting}</p>
          <h2 className="mt-2 text-center text-2xl font-bold tracking-tight text-foreground">
            Cos&apos;è <span className="text-primary">LineUp</span>?
          </h2>
          <p className="mt-3 text-center text-sm leading-relaxed text-gray-600">
            L&apos;app che trasforma &ldquo;ci vediamo?&rdquo; in un piano concreto — dalla Mole al locale giusto,
            con meno messaggi e più decisioni prese insieme.
          </p>

          <div className="mt-5 rounded-2xl border-2 border-primary bg-gradient-to-br from-primary/15 to-primary/5 px-4 py-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/20">
                <Sparkles size={22} className="text-primary" strokeWidth={2} aria-hidden />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-primary">In sintesi</p>
                <p className="mt-1 text-sm font-semibold leading-snug text-gray-900">
                  Organizza, vota e conferma le uscite con chi conta per te.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {HIGHLIGHTS.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="flex gap-3 rounded-xl border border-gray-100 bg-white px-3.5 py-3.5 shadow-sm"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-50">
                  <Icon size={20} className="text-primary" strokeWidth={2} aria-hidden />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-sm font-bold text-gray-900">{title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-gray-600">{body}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground">
            Tra poco proverai <span className="font-semibold text-foreground">Pianifica</span>: il cuore di LineUp
            per creare un evento passo dopo passo.
          </p>
        </div>
      </div>

      <div className="shrink-0 border-t border-gray-100 bg-background px-5 py-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          data-testid="button-demo-intro-continue"
          onClick={onContinue}
          className="mx-auto flex min-h-12 w-full max-w-[320px] touch-manipulation items-center justify-center rounded-xl bg-primary py-3.5 text-base font-semibold text-primary-foreground shadow-md active:opacity-90"
        >
          Prosegui
        </button>
      </div>
    </div>
  );
}
