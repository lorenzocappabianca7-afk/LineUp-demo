import { useState } from "react";
import { CalendarPlus, X, Sparkles } from "lucide-react";
import AppCreateEvent from "@/pages/AppCreateEvent";
import AppScopri from "@/pages/AppScopri";
import type { ScopriToCreatePrefill } from "@/lib/appUtils";

export default function AppHome() {
  const [showCreate, setShowCreate] = useState(false);
  const [showScopri, setShowScopri] = useState(false);
  const [scopriPrefill, setScopriPrefill] = useState<ScopriToCreatePrefill | null>(null);

  const handleCreateFromScopri = (prefill: ScopriToCreatePrefill) => {
    setScopriPrefill(prefill);
    setShowScopri(false);
    setShowCreate(true);
  };

  const handleCloseCreate = () => {
    setShowCreate(false);
    setScopriPrefill(null);
  };

  return (
    <div className="flex flex-col min-h-full bg-gray-50">

      {/* ─── Header ─── */}
      <div className="bg-white px-5 pt-12 pb-5 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Pianifica le tue attività</h1>
      </div>

      {/* ─── Main: blob in diagonale ─── */}
      <div className="flex flex-col justify-center flex-1 w-full gap-6 py-4">

        {/* Blob nero — in alto a destra */}
        <div className="flex justify-end pr-6">
          <button
            data-testid="button-pianifica"
            onClick={() => { setScopriPrefill(null); setShowCreate(true); }}
            className="blob-fluid-button flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform duration-500 ease-out shadow-xl"
            style={{
              width: "210px",
              height: "210px",
              background: "linear-gradient(135deg, #1a1a1a 0%, #333 100%)",
              borderRadius: "62% 38% 46% 54% / 60% 44% 56% 40%",
              animation: "blobPulse 9.5s cubic-bezier(0.4, 0, 0.2, 1) infinite",
            }}
          >
            <CalendarPlus size={40} className="text-white" strokeWidth={1.5} />
            <span className="text-white font-bold text-xl tracking-wide">Pianifica</span>
          </button>
        </div>

        {/* Blob rosa — in basso a sinistra */}
        <div className="flex justify-start pl-6">
          <button
            data-testid="button-scopri-ai"
            onClick={() => setShowScopri(true)}
            className="blob-fluid-button flex flex-col items-center justify-center gap-2.5 active:scale-95 transition-transform duration-500 ease-out shadow-xl"
            style={{
              width: "190px",
              height: "190px",
              background: "linear-gradient(135deg, #4A9BD9 0%, #7CB9E8 100%)",
              borderRadius: "38% 62% 54% 46% / 44% 56% 40% 60%",
              animation: "blobPulse 9.5s cubic-bezier(0.4, 0, 0.2, 1) infinite",
              animationDelay: "3s",
            }}
          >
            <Sparkles size={34} className="text-white" strokeWidth={1.5} />
            <span className="text-white font-bold text-base tracking-wide text-center px-4 leading-snug">
              Non sai ancora cosa fare?
            </span>
          </button>
        </div>

      </div>

      {/* ─── Sheet: Pianifica ─── */}
      {showCreate && (
        <div
          className="fixed top-10 bottom-[72px] left-1/2 -translate-x-1/2 w-[calc(100%-24px)] max-w-[360px] z-[100] bg-black rounded-[20px]"
          style={{ animation: "expandFromPianifica 420ms cubic-bezier(0.2,0,0,1) forwards" }}
        >
          <div className="absolute inset-[3px] bg-white rounded-[17px] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Nuovo evento</h2>
                {scopriPrefill?.venues?.length ? (
                  <p className="text-xs text-[#4A9BD9] font-semibold mt-0.5">
                    {scopriPrefill.subcategoryLabel}
                    {" · "}
                    {scopriPrefill.venues[0].name}
                    {scopriPrefill.venues.length > 1 ? ` +${scopriPrefill.venues.length - 1}` : ""}
                  </p>
                ) : null}
              </div>
              <button
                data-testid="button-close-create"
                onClick={handleCloseCreate}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
              >
                <X size={16} className="text-gray-600" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 no-scrollbar">
              <AppCreateEvent onClose={handleCloseCreate} fromScopri={scopriPrefill ?? undefined} />
            </div>
          </div>
        </div>
      )}

      {/* ─── Sheet: Scopri AI ─── */}
      {showScopri && (
        <div
          className="fixed top-10 bottom-[72px] left-1/2 -translate-x-1/2 w-[calc(100%-24px)] max-w-[360px] z-[100] rounded-[20px]"
          style={{
            background: "linear-gradient(135deg, #4A9BD9 0%, #7CB9E8 100%)",
            animation: "expandFromScopri 420ms cubic-bezier(0.2,0,0,1) forwards",
          }}
        >
          <div className="absolute inset-[3px] bg-white rounded-[17px] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 shrink-0">
              <h2 className="text-lg font-bold text-gray-900">Scopri cosa fare</h2>
              <button
                data-testid="button-close-scopri"
                onClick={() => setShowScopri(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
              >
                <X size={16} className="text-gray-600" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 no-scrollbar">
              <AppScopri embedded onCreateEvent={handleCreateFromScopri} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
