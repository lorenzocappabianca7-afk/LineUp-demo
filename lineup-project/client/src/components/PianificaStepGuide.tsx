import { cn } from "@/lib/utils";

type PianificaStepGuideProps = {
  stepLabel: string;
  title: string;
  body: string;
  action: string;
  /** Su sfondo primary (es. scelta sondaggio): card bianca, testi scuri leggibili. */
  variant?: "default" | "onBlue";
};

/** Banner istruzioni per la demo / prima esperienza del wizard Pianifica. */
export function PianificaStepGuide({
  stepLabel,
  title,
  body,
  action,
  variant = "default",
}: PianificaStepGuideProps) {
  const onBlue = variant === "onBlue";

  return (
    <div
      className={cn(
        "mx-5 mt-3 mb-2 rounded-xl px-4 py-3.5",
        onBlue
          ? "border border-gray-200 !bg-white shadow-lg ring-1 ring-black/5"
          : "border border-primary/25 bg-gradient-to-br from-primary/10 to-primary/5",
      )}
      style={onBlue ? { backgroundColor: "#ffffff" } : undefined}
      data-testid={onBlue ? "pianifica-step-guide-survey" : "pianifica-step-guide"}
      role="status"
      aria-live="polite"
    >
      <p
        className={cn(
          "text-[11px] font-bold uppercase tracking-wide",
          "text-primary",
        )}
      >
        {stepLabel}
      </p>
      <h3 className="mt-1.5 text-base font-bold leading-snug text-gray-900">{title}</h3>
      <p
        className={cn(
          "mt-1.5 text-sm leading-relaxed",
          onBlue ? "text-gray-800" : "text-gray-600",
        )}
      >
        {body}
      </p>
      <p className="mt-2.5 text-sm font-semibold leading-snug text-gray-900">
        <span className="text-primary">Cosa fare ora:</span> {action}
      </p>
    </div>
  );
}
