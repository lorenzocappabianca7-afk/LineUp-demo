import { MapPin, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/** Badge icona per annunci “AI luoghi”: pin + sparkle sovrapposti. */
export function AiVenuesSoonIcon({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/25",
        className,
      )}
      aria-hidden
    >
      <MapPin className="h-[22px] w-[22px]" strokeWidth={2.25} aria-hidden />
      <Sparkles
        className="absolute -right-0.5 -top-0.5 h-[18px] w-[18px] drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]"
        strokeWidth={2.2}
        aria-hidden
      />
    </div>
  );
}
