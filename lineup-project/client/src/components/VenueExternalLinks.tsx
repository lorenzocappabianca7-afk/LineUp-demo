import type { VenueOption } from "@/lib/appUtils";
import { Globe, Instagram, MapPinned } from "lucide-react";

type Props = {
  venue: VenueOption;
  /** Icone tonde compatte (banner / card strette). */
  compact?: boolean;
  className?: string;
};

export function VenueExternalLinks({ venue, compact, className = "" }: Props) {
  if (!venue.mapsUrl && !venue.websiteUrl && !venue.instagramUrl) return null;

  const chip = compact
    ? "inline-flex items-center justify-center w-9 h-9 rounded-full bg-card border border-border text-primary shadow-sm active:scale-95 transition-transform"
    : "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-card border border-border text-foreground shadow-sm active:scale-[0.99] transition-transform";

  return (
    <div
      className={`flex flex-wrap gap-2 ${className}`}
      role="group"
      aria-label="Link esterni al luogo"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {venue.mapsUrl ? (
        <a
          href={venue.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={chip}
          title="Apri in Google Maps"
        >
          <MapPinned size={compact ? 16 : 15} className="shrink-0" />
          {!compact && <span>Maps</span>}
        </a>
      ) : null}
      {venue.websiteUrl ? (
        <a
          href={venue.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={chip}
          title="Sito ufficiale"
        >
          <Globe size={compact ? 16 : 15} className="shrink-0" />
          {!compact && <span>Sito</span>}
        </a>
      ) : null}
      {venue.instagramUrl ? (
        <a
          href={venue.instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={chip}
          title="Instagram"
        >
          <Instagram size={compact ? 16 : 15} className="shrink-0" />
          {!compact && <span>Instagram</span>}
        </a>
      ) : null}
    </div>
  );
}
