import type { ReactNode } from "react";
import { CalendarDays, Megaphone, Sparkles } from "lucide-react";

type TeaserVariant = "primary" | "sky" | "navy";

const VARIANT_STYLES: Record<
  TeaserVariant,
  { border: string; badge: string }
> = {
  primary: {
    border: "border-2 border-primary",
    badge: "bg-primary/15 text-primary",
  },
  sky: {
    border: "border-2 border-sky-400",
    badge: "bg-sky-400/20 text-sky-700",
  },
  navy: {
    border: "border-2 border-[#1e3a5f]",
    badge: "bg-[#1e3a5f]/12 text-[#1e3a5f]",
  },
};

type TeaserBannerProps = {
  variant: TeaserVariant;
  badge: string;
  title: string;
  body: string;
  icon: ReactNode;
};

function TeaserBanner({ variant, badge, title, body, icon }: TeaserBannerProps) {
  const styles = VARIANT_STYLES[variant];
  return (
    <article
      className={`rounded-2xl px-4 py-4 shadow-sm ${styles.border} bg-[#F4FAFF]`}
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
          <h4 className="mt-0.5 text-base font-bold leading-snug text-gray-900">{title}</h4>
          <p className="mt-1.5 text-sm leading-relaxed text-gray-900">{body}</p>
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
        body="L’intelligenza artificiale ti guiderà verso ristoranti, locali ed eventi che rispecchiano davvero le esigenze tue e del gruppo — meno ricerche, più idee giuste al primo colpo."
      />

      <TeaserBanner
        variant="sky"
        badge="Social"
        title="Pubblica con il tuo gruppo"
        icon={<Megaphone size={22} strokeWidth={2} className="text-sky-600" />}
        body="Potrai rendere visibile l’evento che state pianificando: i tuoi follower nell’app potranno chiedere di unirsi e tu scegli chi aggiungere al piano."
      />

      <TeaserBanner
        variant="navy"
        badge="Organizzazione"
        title="Chat mirate e calendario"
        icon={<CalendarDays size={22} strokeWidth={2} className="text-[#1e3a5f]" />}
        body="Le chat saranno accessibili solo a chi ha votato nel sondaggio, per decisioni più rapide e meno distrazioni. Un calendario integrato ti terrà traccia di tutte le attività pianificate."
      />
    </div>
  );
}
