import { AppWindow, Lightbulb, MessagesSquare } from "lucide-react";

type Props = {
  userName?: string;
  onContinue: () => void;
};

const INTRO_BANNERS = [
  {
    id: "what",
    icon: AppWindow,
    badge: "L'app",
    title: "Cos'è LineUp",
    body: "L'app per organizzare uscite, eventi e attività con chi vuoi, nel modo più facile e veloce e senza stress.",
    border: "border-primary/30",
    badgeClass: "bg-primary/15 text-primary",
    iconClass: "bg-primary/15 text-primary",
  },
  {
    id: "problems",
    icon: Lightbulb,
    badge: "Il valore",
    title: "Che problemi risolve",
    body: "Basta caos durante l'organizzazione di uscite, niente più stress nell'aspettare chi non risponde e stop all'ansia di trovare il luogo che vada bene tutti.",
    border: "border-amber-200/80",
    badgeClass: "bg-amber-100 text-amber-900",
    iconClass: "bg-amber-100 text-amber-800",
  },
  {
    id: "vs-social",
    icon: MessagesSquare,
    badge: "Novità",
    title: "Perché LineUp",
    body: "Grazie all'AI, LineUp supporta te e i tuoi amici nella programmazione delle vostre attività, tiene traccia dei tuoi eventi futuri e ti mette in contatto con persone con i tuoi stessi interessi.",
    border: "border-primary/25",
    badgeClass: "bg-primary/15 text-primary",
    iconClass: "bg-primary/15 text-primary",
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
          <h2 className="mt-2 text-center text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Cos&apos;è <span className="text-primary">LineUp</span>?
          </h2>
          <p className="mt-3 text-center text-sm font-bold leading-snug text-foreground sm:text-base sm:leading-relaxed">
            LineUp, il social organizzativo che semplificherà la tua vita
          </p>

          <div className="mt-5 space-y-3">
            {INTRO_BANNERS.map(({ id, icon: Icon, badge, title, body, border, badgeClass, iconClass }) => (
              <article
                key={id}
                data-testid={`demo-intro-banner-${id}`}
                className={`rounded-2xl border-2 bg-white px-4 py-5 shadow-sm ${border}`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
                  >
                    <Icon size={26} strokeWidth={2} aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className={`text-xs font-bold uppercase tracking-wide ${badgeClass}`}>{badge}</p>
                    <h3 className="mt-1.5 text-base font-bold leading-snug text-gray-900 sm:text-lg">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600 break-words sm:text-[15px] sm:leading-relaxed">
                      {body}
                    </p>
                  </div>
                </div>
              </article>
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
