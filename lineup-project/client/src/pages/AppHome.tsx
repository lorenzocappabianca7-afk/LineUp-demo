import { useState, useEffect } from "react";
import { CalendarPlus, X, QrCode } from "lucide-react";
import AppCreateEvent from "@/pages/AppCreateEvent";
import type { ScopriToCreatePrefill } from "@/lib/appUtils";
import { takePendingScopriCreate } from "@/lib/scopriCreateBridge";
import { AiVenuesSoonIcon } from "@/components/icons/AiVenuesSoonIcon";
import { PianificaQrDialog } from "@/components/PianificaQrDialog";

type HomeOverlay = { kind: "none" } | { kind: "create"; prefill: ScopriToCreatePrefill | null };

export default function AppHome() {
  const [overlay, setOverlay] = useState<HomeOverlay>({ kind: "none" });
  const [qrOpen, setQrOpen] = useState(false);

  useEffect(() => {
    const pending = takePendingScopriCreate();
    if (pending) {
      setOverlay({ kind: "create", prefill: pending });
    }
  }, []);

  const openPianificaBlank = () => {
    setOverlay({ kind: "create", prefill: null });
  };

  const closeCreate = () => {
    setOverlay({ kind: "none" });
  };

  const showCreate = overlay.kind === "create";
  const createPrefill = overlay.kind === "create" ? overlay.prefill : null;

  const createEventKey =
    showCreate && createPrefill?.venues?.length
      ? `scopri:${createPrefill.categoryKey}:${createPrefill.subcategoryLabel}:${createPrefill.venues.map((v) => v.name).join("|")}`
      : showCreate
        ? "create-blank"
        : "idle";

  return (
    <div className="flex flex-col min-h-full bg-background">

      {/* ─── Header ─── */}
      <div className="bg-card border-b border-border px-5 pt-12 pb-5 shadow-soft">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Pianifica le tue attività</h1>
        <p className="text-sm text-muted-foreground mt-1">Torino · dalla Mole al tuo calendario</p>
      </div>

      {/* ─── Main: Pianifica (tasto circolare) + banner info AI ─── */}
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-5 py-12">
        <button
          data-testid="button-pianifica"
          type="button"
          onClick={openPianificaBlank}
          className="flex h-[168px] w-[168px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-full bg-primary text-primary-foreground shadow-md outline-none ring-offset-background transition-transform duration-200 hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.97] motion-reduce:transform-none"
          aria-label="Apri pianificazione nuovo evento"
        >
          <CalendarPlus size={46} strokeWidth={2} className="text-primary-foreground" aria-hidden />
          <span className="text-base font-bold tracking-wide">Pianifica</span>
        </button>

        <div className="w-full max-w-[320px] rounded-xl border-2 border-black bg-white px-4 py-3.5 shadow-sm">
          <div className="flex items-start gap-3">
            <AiVenuesSoonIcon className="mt-0.5" />
            <p className="text-left text-sm font-medium leading-snug text-gray-900">
              La ricerca AI dei luoghi a Torino è attiva: nei risultati vedrai soprattutto quartiere e zona, non indirizzi precisi inventati.
            </p>
          </div>
        </div>

        <button
          type="button"
          data-testid="button-open-pianifica-qr"
          onClick={() => setQrOpen(true)}
          className="flex items-center gap-1.5 text-xs font-semibold text-primary underline-offset-4 hover:underline"
        >
          <QrCode size={14} aria-hidden />
          QR prova Pianifica
        </button>
      </div>

      <PianificaQrDialog open={qrOpen} onOpenChange={setQrOpen} />

      {/* ─── Sheet: Pianifica ─── */}
      {showCreate && (
        <div
          className="fixed top-10 bottom-[72px] left-1/2 z-[100] w-[calc(100%-24px)] max-w-[360px] -translate-x-1/2 rounded-[20px] bg-primary"
          style={{ animation: "expandFromPianifica 420ms cubic-bezier(0.2,0,0,1) forwards" }}
        >
          <div className="absolute inset-[3px] bg-white rounded-[17px] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Nuovo evento</h2>
                {createPrefill?.venues?.length ? (
                  <p className="text-xs text-primary font-semibold mt-0.5">
                    {createPrefill.subcategoryLabel}
                    {" · "}
                    {createPrefill.venues[0].name}
                    {createPrefill.venues.length > 1 ? ` +${createPrefill.venues.length - 1}` : ""}
                  </p>
                ) : null}
              </div>
              <button
                data-testid="button-close-create"
                type="button"
                onClick={closeCreate}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
              >
                <X size={16} className="text-gray-600" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 no-scrollbar">
              <AppCreateEvent
                key={createEventKey}
                onClose={closeCreate}
                fromScopri={createPrefill ?? undefined}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
