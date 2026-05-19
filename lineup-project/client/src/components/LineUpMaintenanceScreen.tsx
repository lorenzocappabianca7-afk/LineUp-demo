import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { LINEUP_MAINTENANCE_COPY } from "@shared/maintenanceCopy";
import { checkLineUpServerAvailable } from "@/lib/lineupAvailability";

const RETRY_MS = 20_000;

type Props = {
  onBackOnline?: () => void;
};

export function LineUpMaintenanceScreen({ onBackOnline }: Props) {
  const [checking, setChecking] = useState(false);
  const { title, lead, team, retry } = LINEUP_MAINTENANCE_COPY;

  const tryReconnect = useCallback(async () => {
    setChecking(true);
    try {
      const ok = await checkLineUpServerAvailable();
      if (ok) {
        onBackOnline?.();
        window.location.reload();
      }
    } finally {
      setChecking(false);
    }
  }, [onBackOnline]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void tryReconnect();
    }, RETRY_MS);
    return () => window.clearInterval(id);
  }, [tryReconnect]);

  return (
    <div
      className="flex min-h-[100dvh] flex-col items-center justify-center bg-gradient-to-br from-[#F4FAFF] via-[#FFF9E6] to-white px-5 py-10"
      data-testid="lineup-maintenance-screen"
      role="alert"
    >
      <div className="w-full max-w-sm rounded-2xl border-2 border-primary/30 bg-white px-6 py-8 text-center shadow-lg">
        <p className="text-3xl font-extrabold tracking-tight text-[#4A9BD9]">LineUp</p>
        <h1 className="mt-4 text-lg font-bold leading-snug text-gray-900">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">{lead}</p>
        <p className="mt-3 text-sm font-semibold leading-relaxed text-gray-800">{team}</p>
        <button
          type="button"
          data-testid="button-maintenance-retry"
          disabled={checking}
          onClick={() => void tryReconnect()}
          className="mt-6 flex min-h-11 w-full touch-manipulation items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          <RefreshCw size={18} className={checking ? "animate-spin" : ""} aria-hidden />
          {checking ? "Controllo in corso…" : retry}
        </button>
      </div>
    </div>
  );
}
