import type { ReactNode } from "react";
import { Megaphone, Sparkles, Ticket } from "lucide-react";

type TeaserVariant = "primary" | "sky" | "navy";

const VARIANT_STYLES: Record<
  TeaserVariant,
  { border: string; badge: string }
> = {
  primary: {
    border: "border border-primary/35",
    badge: "bg-primary/15 text-primary",
  },
  sky: {
    border: "border border-sky-400/50",
    badge: "bg-sky-400/20 text-sky-700",
  },
  navy: {
    border: "border border-[#1e3a5f]/40",
    badge: "bg-[#1e3a5f]/12 text-[#1e3a5f]",
  },
};

type TeaserBannerProps = {
  variant: TeaserVariant;
  badge: string;
  title: string;
  body: string;
  icon: ReactNode;
  "data-testid"?: string;
};

function TeaserBanner({ variant, badge, title, body, icon, "data-testid": testId }: TeaserBannerProps) {
  const styles = VARIANT_STYLES[variant];
  return (
    <article
      data-testid={testId}
      className={`rounded-2xl px-4 py-4 shadow-lg ${styles.border} bg-gradient-to-br from-[#F0FBFC] via-white to-primary/5`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${styles.badge}`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-900/70">
            {badge}
          </p>
          <h4 className="mt-0.5 text-base font-bold leading-snug text-gray-900 break-words">{title}</h4>
          <p className="mt-1.5 text-sm leading-relaxed text-gray-900 break-words">{body}</p>
        </div>
      </div>
    </article>
  );
}

/** Tre anteprime funzionalità mostrate al termine della prova Pianifica (QR demo). */
export function PianificaPreviewTeasers() {
  return (
    <div className="mt-5 w-full space-y-3 text-left">
      <p className="text-center text-xs font-semibold uppercase tracking-wide text-primary">
        In arrivo su LineUp
      </p>

      <TeaserBanner
        variant="primary"
        badge="Prossimamente"
        title="Luoghi pensati per te"
        icon={<Sparkles size={22} strokeWidth={2} className="text-primary" />}
        body="Se non sai ancora cosa fare, oltre il tasto Pianifica, il tasto Scopri ti permetterà attraverso un semplice questionario di trovare, grazie al supporto dell’AI, luoghi per i tuoi eventi che rispecchiano appieno le tue esigenze."
      />

      <TeaserBanner
        variant="sky"
        badge="Social"
        title="Pubblica con il tuo gruppo"
        data-testid="preview-teaser-social"
        icon={<Megaphone size={22} strokeWidth={2} className="text-sky-600" />}
        body="Potrai rendere visibile l’evento che state pianificando: i tuoi follower nell’app potranno chiedere di unirsi e tu scegli chi aggiungere al piano."
      />

      <TeaserBanner
        variant="navy"
        badge="Prenotazioni"
        title="Prenota con LineUp"
        data-testid="preview-teaser-bookings"
        icon={<Ticket size={22} strokeWidth={2} className="text-[#1e3a5f]" />}
        body="Potrai prenotare ristoranti, eventi e attività tutto attraverso LineUp. I nostri members potranno inoltre accedere a sconti esclusivi sulle loro prenotazioni."
      />
    </div>
  );
}
