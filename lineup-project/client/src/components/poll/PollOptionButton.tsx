import type { ReactNode } from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getAvatarColor, getInitials } from "@/lib/appUtils";

export type PollOptionButtonProps = {
  label: string;
  /** Righe secondarie (rating, luogo, …) */
  sub?: ReactNode;
  voters: string[];
  /** Somma voti nella sezione (= partecipanti che hanno votato). */
  totalBallots: number;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  "data-testid"?: string;
  className?: string;
  /** Opzione con più voti (pareggio incluso). */
  showTopBadge?: boolean;
  /** Sfondo blu dietro: pulsante bianco (chat / dettaglio evento). */
  variant?: "default" | "onBlue";
};

/**
 * Riga sondaggio stile WhatsApp: pallino minimale, barra percentuale, avatars.
 */
export function PollOptionButton({
  label,
  sub,
  voters,
  totalBallots,
  selected,
  disabled,
  onClick,
  "data-testid": dataTestId,
  className,
  showTopBadge,
  variant = "default",
}: PollOptionButtonProps) {
  const pct = totalBallots > 0 ? Math.round((voters.length / totalBallots) * 100) : 0;
  const onBlue = variant === "onBlue";

  return (
    <button
      type="button"
      data-testid={dataTestId}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "group w-full rounded-lg border px-2.5 py-2 text-left transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        "active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50",
        onBlue
          ? selected
            ? "border-primary bg-blue-50 ring-2 ring-primary/20 shadow-sm"
            : "border-gray-200/90 bg-white shadow-sm hover:border-primary/35 hover:bg-gray-50/90"
          : selected
            ? "border-primary bg-primary/[0.04] ring-1 ring-primary/15"
            : "border-border bg-card hover:border-primary/30 hover:bg-muted/30",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        {/* Pallino stile WhatsApp / iOS minimale */}
        <span
          className={cn(
            "mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors",
            selected
              ? onBlue
                ? "border-primary bg-primary/15"
                : "border-primary bg-primary/[0.12]"
              : onBlue
                ? "border-gray-300 bg-white group-hover:border-primary/45"
                : "border-muted-foreground/30 bg-background group-hover:border-primary/40",
          )}
          aria-hidden
        >
          {selected ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
        </span>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p
                className={cn(
                  "text-sm font-semibold leading-snug tracking-tight",
                  selected ? "text-primary" : "text-foreground",
                )}
              >
                {label}
              </p>
              {sub ? <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div> : null}
            </div>
            <span
              className={cn(
                "shrink-0 tabular-nums text-xs font-bold tracking-tight",
                voters.length > 0 ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {pct}%
            </span>
          </div>

          <Progress value={pct} className={cn("pointer-events-none h-1", onBlue ? "bg-gray-200" : "bg-muted/80")} />

          {voters.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <div className="flex -space-x-1">
                {voters.slice(0, 5).map((v) => (
                  <div
                    key={v}
                    title={v}
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full border-2 text-[7px] font-bold text-white shadow-sm",
                      onBlue ? "border-white" : "border-card",
                    )}
                    style={{ backgroundColor: getAvatarColor(v) }}
                  >
                    {getInitials(v)}
                  </div>
                ))}
              </div>
              <span className="text-[10px] font-medium text-muted-foreground">
                {voters.length} {voters.length === 1 ? "voto" : "voti"}
              </span>
              {showTopBadge ? (
                <Badge
                  variant="secondary"
                  className="h-4 border-0 bg-accent/90 px-1.5 text-[9px] font-bold uppercase tracking-wide text-accent-foreground"
                >
                  Top
                </Badge>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </button>
  );
}
