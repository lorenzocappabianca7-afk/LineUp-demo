type PianificaStepGuideProps = {
  stepLabel: string;
  title: string;
  body: string;
  action: string;
};

/** Banner istruzioni per la demo / prima esperienza del wizard Pianifica. */
export function PianificaStepGuide({ stepLabel, title, body, action }: PianificaStepGuideProps) {
  return (
    <div
      className="mx-5 mt-3 mb-2 rounded-xl border border-primary/25 bg-gradient-to-br from-primary/10 to-primary/5 px-4 py-3"
      role="status"
      aria-live="polite"
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-primary">{stepLabel}</p>
      <h3 className="mt-1 text-sm font-bold text-gray-900">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-gray-600">{body}</p>
      <p className="mt-2 text-xs font-semibold leading-snug text-gray-800">
        <span className="text-primary">Cosa fare ora:</span> {action}
      </p>
    </div>
  );
}
