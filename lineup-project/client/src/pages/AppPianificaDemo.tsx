import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { CalendarPlus, ChevronDown, X } from "lucide-react";
import AppCreateEvent from "@/pages/AppCreateEvent";
import { AiVenuesSoonIcon } from "@/components/icons/AiVenuesSoonIcon";
import { PianificaDemoIntro } from "@/components/PianificaDemoIntro";
import {
  PianificaPreviewCompletion,
  scrollCompletionRoot,
} from "@/components/PianificaPreviewCompletion";
import { useBodyScrollLock, releaseBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { DEMO_COMPLETION_SCROLL_TEST_ID } from "@/lib/demoModalScroll";
import { cn } from "@/lib/utils";
import { setCurrentUser } from "@/lib/appUtils";
import {
  isValidBirthYearInput,
  isValidEmail,
  readStoredDemoProfile,
  storeDemoProfile,
  type PreviewProfile,
} from "@/lib/pianificaDemoProfile";

const INTRO_STORAGE_KEY = "lineup_pianifica_demo_intro_v1";

function completeDemoGate(profile: PreviewProfile) {
  storeDemoProfile(profile);
  setCurrentUser(profile.name);
}

/**
 * Pagina pubblica di prova (QR): nome, email e anno di nascita, poi tasto Pianifica.
 * Senza bottom nav e senza navigazione alla chat dopo la creazione.
 */
const RISCONTRI_DOUBLE_TAP_MS = 450;

export default function AppPianificaDemo() {
  const [, navigate] = useLocation();
  const riscontriLastTapRef = useRef(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [modalPhase, setModalPhase] = useState<"wizard" | "complete">("wizard");
  /** Dopo «Grazie di cuore!»: il modale non si chiude (né torna al tasto Pianifica). */
  const [completionThanksLocked, setCompletionThanksLocked] = useState(false);
  const [gateDone, setGateDone] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const completionScrollRef = useRef<HTMLDivElement>(null);
  const [completionCanScrollMore, setCompletionCanScrollMore] = useState(true);

  useBodyScrollLock(sheetOpen && modalPhase === "wizard");

  useEffect(() => {
    if (sheetOpen && modalPhase === "complete") releaseBodyScrollLock();
  }, [sheetOpen, modalPhase]);

  useEffect(() => {
    if (!sheetOpen || modalPhase !== "complete") {
      setCompletionCanScrollMore(false);
      return;
    }
    const el = completionScrollRef.current;
    if (!el) return;
    const update = () => {
      setCompletionCanScrollMore(el.scrollTop + el.clientHeight < el.scrollHeight - 40);
    };
    update();
    const t = window.setTimeout(update, 150);
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      window.clearTimeout(t);
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [sheetOpen, modalPhase]);

  useEffect(() => {
    if (!sheetOpen) setModalPhase("wizard");
  }, [sheetOpen]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const r of regs) void r.unregister();
      });
    }
    if ("caches" in window) {
      void caches.keys().then((keys) => {
        for (const k of keys) void caches.delete(k);
      });
    }

    const stored = readStoredDemoProfile();
    if (stored) {
      setName(stored.name);
      setEmail(stored.email);
      setBirthYear(String(stored.birthYear));
      setGateDone(true);
      setCurrentUser(stored.name);
    }
    try {
      if (sessionStorage.getItem(INTRO_STORAGE_KEY) === "1") setIntroDone(true);
    } catch {
      /* ignore */
    }
  }, []);

  const canConfirmGate =
    name.trim().length >= 1 && isValidEmail(email) && isValidBirthYearInput(birthYear);

  const confirmGate = (e?: { preventDefault?: () => void }) => {
    e?.preventDefault?.();
    if (!canConfirmGate) return;
    const parsedYear = Number(birthYear.trim());
    const profile: PreviewProfile = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      birthYear: parsedYear,
    };
    setName(profile.name);
    setEmail(profile.email);
    setBirthYear(String(profile.birthYear));
    completeDemoGate(profile);
    setGateDone(true);
  };

  const demoProfile: PreviewProfile | null =
    name.trim() && isValidEmail(email) && isValidBirthYearInput(birthYear)
      ? { name: name.trim(), email: email.trim().toLowerCase(), birthYear: Number(birthYear.trim()) }
      : readStoredDemoProfile();

  const closeSheet = useCallback(() => {
    if (completionThanksLocked) return;
    setSheetOpen(false);
    setModalPhase("wizard");
    setCompletionThanksLocked(false);
  }, [completionThanksLocked]);

  const openSheet = useCallback(() => {
    setCompletionThanksLocked(false);
    setModalPhase("wizard");
    setSheetOpen(true);
  }, []);

  const openRiscontriAdmin = useCallback(() => {
    releaseBodyScrollLock();
    setSheetOpen(false);
    setModalPhase("wizard");
    navigate("/prova-pianifica/riscontri");
  }, [navigate]);

  /** Doppio tap/click: un solo tocco non apre il pannello feedback. */
  const onRiscontriTap = useCallback(() => {
    const now = Date.now();
    if (now - riscontriLastTapRef.current < RISCONTRI_DOUBLE_TAP_MS) {
      riscontriLastTapRef.current = 0;
      openRiscontriAdmin();
    } else {
      riscontriLastTapRef.current = now;
    }
  }, [openRiscontriAdmin]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <div className="shrink-0 border-b border-border bg-card px-5 pb-4 pt-[max(2.75rem,env(safe-area-inset-top))] shadow-soft">
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-primary">Prova</p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Pianifica le tue attività</h1>
        <p className="mt-1 text-sm text-muted-foreground">Torino · dalla Mole al tuo calendario</p>
      </div>

      {!gateDone ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div
            data-testid="demo-gate-scroll"
            className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto overscroll-contain px-5 py-4 [-webkit-overflow-scrolling:touch] touch-pan-y"
          >
          <form
            className="mx-auto w-full max-w-[320px] rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            onSubmit={confirmGate}
            noValidate
          >
            <h2 className="text-lg font-bold text-gray-900">Benvenuto!</h2>
            <p className="mt-1 text-sm text-gray-500 leading-snug">
              Prima di accedere alla simulazione di LineUp, ti chiediamo di inserire qualche dato
            </p>

            <label className="mt-5 block text-xs font-bold text-gray-600">Nome</label>
            <input
              data-testid="input-demo-gate-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Es. Lorenzo"
              className="mt-1.5 min-h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-base text-gray-900 outline-none focus:ring-2 focus:ring-primary/30"
              autoComplete="name"
            />

            <label className="mt-4 block text-xs font-bold text-gray-600">Email</label>
            <input
              data-testid="input-demo-gate-email"
              type="text"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@email.com"
              className="mt-1.5 min-h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-base text-gray-900 outline-none focus:ring-2 focus:ring-primary/30"
              autoComplete="email"
            />

            <label className="mt-4 block text-xs font-bold text-gray-600">Anno di nascita</label>
            <input
              data-testid="input-demo-gate-birth-year"
              type="text"
              inputMode="numeric"
              autoComplete="bday-year"
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="Es. 1995"
              maxLength={4}
              className="mt-1.5 min-h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-base text-gray-900 outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className="mt-1 text-[11px] text-gray-400">Solo l&apos;anno, senza mese e giorno.</p>

            <button
              type="submit"
              data-testid="button-demo-gate-confirm"
              disabled={!canConfirmGate}
              className="mt-5 min-h-12 w-full touch-manipulation rounded-xl bg-primary py-3.5 text-base font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
            >
              Conferma
            </button>
          </form>
          </div>
          <div className="shrink-0 px-5 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              data-testid="link-demo-feedback-admin"
              onClick={onRiscontriTap}
              className="mx-auto block min-h-9 w-full touch-manipulation py-2 text-center text-[10px] font-medium text-gray-300/85 select-none active:text-gray-400"
              aria-label="Riscontri demo. Doppio clic o doppio tocco per aprire l'area riservata."
            >
              riscontri
            </button>
          </div>
        </div>
      ) : !introDone ? (
        <PianificaDemoIntro
          userName={name}
          onContinue={() => {
            try {
              sessionStorage.setItem(INTRO_STORAGE_KEY, "1");
            } catch {
              /* ignore */
            }
            setIntroDone(true);
          }}
        />
      ) : (
        <div
          data-testid="demo-home-scroll"
          className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 overflow-y-auto overscroll-contain px-5 py-8 touch-pan-y [-webkit-overflow-scrolling:touch]"
        >
          <p className="text-center text-sm leading-relaxed text-muted-foreground">
            <span className="font-bold text-foreground">Ciao</span>{" "}
            <span className="font-semibold text-foreground">{name}</span>,{" "}
            <span className="font-bold text-foreground">
              questa è una simulazione di pianificazione di un evento con LineUp.
            </span>{" "}
            <span className="font-bold text-foreground">
              Prova tu stesso cliccando sul tasto qui sotto.
            </span>
          </p>

          <button
            type="button"
            data-testid="button-pianifica-demo-page"
            onClick={openSheet}
            className="flex h-[168px] w-[168px] shrink-0 touch-manipulation flex-col items-center justify-center gap-1.5 rounded-full bg-primary text-primary-foreground shadow-md outline-none ring-offset-background transition-transform duration-200 hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.97] motion-reduce:transform-none"
            aria-label="Apri pianificazione nuovo evento (prova)"
          >
            <CalendarPlus size={46} strokeWidth={2} className="text-primary-foreground" aria-hidden />
            <span className="text-base font-bold tracking-wide">Pianifica</span>
          </button>

          <div className="w-full max-w-[320px] rounded-xl border-2 border-black bg-white px-4 py-3.5 shadow-sm">
            <div className="flex items-start gap-3">
              <AiVenuesSoonIcon className="mt-0.5" />
              <p className="text-left text-sm font-medium leading-snug text-gray-900">
                La ricerca AI dei luoghi a Torino è attiva: nei risultati vedrai soprattutto quartiere e zona, non
                indirizzi precisi inventati.
              </p>
            </div>
          </div>
        </div>
      )}

      {sheetOpen && gateDone && introDone && (
        <div
          className="fixed inset-0 z-[100] flex flex-col overscroll-contain bg-black/40 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          role="dialog"
          aria-modal="true"
          aria-label="Nuovo evento demo"
          onClick={closeSheet}
        >
          <div
            className={cn(
              "relative mx-auto flex h-full w-full max-w-[360px] min-h-0 flex-col rounded-[20px] bg-primary",
              modalPhase === "wizard" && "overflow-hidden",
            )}
            style={{ animation: "expandFromPianifica 420ms cubic-bezier(0.2,0,0,1) forwards" }}
            onClick={(e) => e.stopPropagation()}
          >
          <div className="absolute inset-[3px] flex min-h-0 flex-col rounded-[17px] bg-white">
            <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 pb-3 pt-4 sm:px-6 sm:pb-4 sm:pt-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Nuovo evento</h2>
                <p className="mt-0.5 text-xs font-medium text-amber-700">Modalità prova</p>
              </div>
              {!completionThanksLocked && (
                <button
                  type="button"
                  data-testid="button-close-create-demo"
                  onClick={closeSheet}
                  className="flex h-11 w-11 touch-manipulation items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
                  aria-label="Chiudi"
                >
                  <X size={18} className="text-gray-600" />
                </button>
              )}
              {completionThanksLocked && <span className="h-11 w-11 shrink-0" aria-hidden />}
            </div>
            <div
              className={cn(
                "flex min-h-0 flex-1 flex-col",
                modalPhase === "wizard" && "overflow-hidden rounded-b-[17px]",
              )}
            >
              {modalPhase === "complete" ? (
                <div
                  className="flex min-h-0 flex-1 flex-col"
                  data-testid="preview-completion-root"
                >
                  <main
                    ref={completionScrollRef}
                    data-testid={DEMO_COMPLETION_SCROLL_TEST_ID}
                    className={cn(
                      "min-h-0 flex-1 basis-0 grow overflow-x-hidden overflow-y-scroll overscroll-y-auto bg-white touch-pan-y [-webkit-overflow-scrolling:touch] [touch-action:pan-y]",
                      completionCanScrollMore && "pb-[5.75rem]",
                    )}
                    style={{ WebkitOverflowScrolling: "touch" }}
                  >
                    {demoProfile && (
                    <PianificaPreviewCompletion
                      profile={demoProfile}
                      onClose={closeSheet}
                      onFeedbackSent={() => setCompletionThanksLocked(true)}
                      scrollRootRef={completionScrollRef}
                    />
                    )}
                  </main>
                  {completionCanScrollMore && (
                    <footer className="z-10 shrink-0 border-t border-gray-200 bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-6px_16px_rgba(0,0,0,0.08)]">
                      <button
                        type="button"
                        data-testid="button-scroll-completion-hint"
                        onClick={() => scrollCompletionRoot(completionScrollRef.current)}
                        className="flex min-h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground active:opacity-90"
                      >
                        <ChevronDown size={20} className="shrink-0 animate-bounce" aria-hidden />
                        Scorri verso il basso
                      </button>
                    </footer>
                  )}
                </div>
              ) : (
                <AppCreateEvent
                  key={`pianifica-demo:${email}`}
                  previewMode
                  previewProfile={demoProfile ?? undefined}
                  onPreviewComplete={() => setModalPhase("complete")}
                  onClose={closeSheet}
                />
              )}
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
