import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PianificaPreviewTeasers } from "@/components/PianificaPreviewTeasers";

const IDLE_MS = 3000;
const GATE_STORAGE_KEY = "lineup_pianifica_demo_gate_v1";

export type PreviewProfile = { name: string; email: string };

type PianificaPreviewCompletionProps = {
  profile: PreviewProfile;
  onClose: () => void;
};

function readStoredProfile(): PreviewProfile | null {
  try {
    const raw = sessionStorage.getItem(GATE_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PreviewProfile;
    if (!data?.name?.trim() || !data?.email?.trim()) return null;
    return { name: data.name.trim(), email: data.email.trim() };
  } catch {
    return null;
  }
}

export function PianificaPreviewCompletion({ profile, onClose }: PianificaPreviewCompletionProps) {
  const { toast } = useToast();
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollParentRef = useRef<HTMLElement | null>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const [hasScrolledToFeedback, setHasScrolledToFeedback] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  const effectiveProfile = profile.name && profile.email ? profile : readStoredProfile();

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const scheduleIdleHint = useCallback(() => {
    clearIdleTimer();
    if (hasScrolledToFeedback || feedbackSent) return;
    idleTimerRef.current = setTimeout(() => {
      if (!hasScrolledToFeedback && !feedbackSent) {
        setShowScrollHint(true);
      }
    }, IDLE_MS);
  }, [clearIdleTimer, feedbackSent, hasScrolledToFeedback]);

  const registerActivity = useCallback(() => {
    setShowScrollHint(false);
    scheduleIdleHint();
  }, [scheduleIdleHint]);

  useEffect(() => {
    scheduleIdleHint();
    return clearIdleTimer;
  }, [scheduleIdleHint, clearIdleTimer]);

  useEffect(() => {
    const el = rootRef.current;
    const target = feedbackRef.current;
    if (!el || !target) return;

    let scrollParent: HTMLElement | null = el.parentElement;
    while (scrollParent) {
      const { overflowY } = getComputedStyle(scrollParent);
      if (overflowY === "auto" || overflowY === "scroll") break;
      scrollParent = scrollParent.parentElement;
    }
    scrollParentRef.current = scrollParent;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasScrolledToFeedback(true);
          setShowScrollHint(false);
          clearIdleTimer();
        }
      },
      {
        root: scrollParent,
        rootMargin: "0px 0px -24px 0px",
        threshold: 0.12,
      },
    );
    observer.observe(target);

    const onActivity = () => registerActivity();
    const opts: AddEventListenerOptions = { passive: true };
    if (scrollParent) scrollParent.addEventListener("scroll", onActivity, opts);
    else window.addEventListener("scroll", onActivity, opts);
    window.addEventListener("touchstart", onActivity, opts);
    window.addEventListener("mousedown", onActivity, opts);
    window.addEventListener("keydown", onActivity);

    return () => {
      observer.disconnect();
      if (scrollParent) scrollParent.removeEventListener("scroll", onActivity);
      else window.removeEventListener("scroll", onActivity);
      window.removeEventListener("touchstart", onActivity);
      window.removeEventListener("mousedown", onActivity);
      window.removeEventListener("keydown", onActivity);
    };
  }, [registerActivity, clearIdleTimer]);

  const submitFeedback = async () => {
    if (!effectiveProfile || rating == null || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/app/pianifica-demo/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: effectiveProfile.name,
          email: effectiveProfile.email,
          rating,
          comment: comment.trim() || undefined,
        }),
      });
      if (res.status === 400) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(data.message || "Dati non validi");
      }
      setFeedbackSent(true);
      setShowScrollHint(false);
    } catch (e) {
      if (e instanceof Error && e.message !== "Dati non validi") {
        setFeedbackSent(true);
        setShowScrollHint(false);
        return;
      }
      toast({
        title: "Invio non riuscito",
        description: e instanceof Error ? e.message : "Riprova tra poco.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const displayStars = hoverRating ?? rating ?? 0;

  if (feedbackSent) {
    return (
      <div className="flex min-h-[min(70vh,520px)] w-full flex-col items-center justify-center px-6 py-10 text-center">
        <div className="w-full max-w-sm rounded-2xl border-2 border-primary bg-[#F4FAFF] px-6 py-8 shadow-md animate-in zoom-in-95 fade-in duration-300">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 size={36} className="text-emerald-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Grazie di cuore!</h3>
          <p className="mt-3 text-sm leading-relaxed text-gray-900">
            Il tuo contributo ci aiuta a costruire LineUp insieme a chi lo userà. Abbiamo ricevuto
            valutazione e suggerimenti: li leggeremo con attenzione.
          </p>
        </div>
        <button
          type="button"
          data-testid="button-close-preview-completion"
          onClick={onClose}
          className="mt-8 w-full max-w-sm rounded-xl bg-gradient-to-br from-primary to-primary/75 py-3.5 text-sm font-semibold text-primary-foreground"
        >
          Chiudi
        </button>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="flex w-full flex-col items-stretch px-4 pb-8 text-center">
      <div className="mx-auto mb-4 flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-emerald-50 animate-in zoom-in duration-300">
        <CheckCircle2 size={40} className="text-emerald-500" />
      </div>
      <h3 className="text-xl font-bold text-gray-900">Prova completata!</h3>
      <p className="mt-2 px-1 text-sm text-gray-600">
        Hai vissuto tutte le fasi di Pianifica. Ecco cosa arriverà presto nell&apos;app.
      </p>

      <PianificaPreviewTeasers />

      {showScrollHint && (
        <div
          className="sticky bottom-2 z-10 mx-auto mt-4 flex max-w-[280px] items-center gap-2 rounded-full border border-primary/30 bg-white px-4 py-2.5 text-left shadow-md animate-in fade-in slide-in-from-bottom-2 duration-300"
          role="status"
          aria-live="polite"
        >
          <ChevronDown size={18} className="shrink-0 animate-bounce text-primary" />
          <p className="text-xs font-semibold leading-snug text-gray-900">
            Scorri verso il basso per valutare la prova
          </p>
        </div>
      )}

      <div
        ref={feedbackRef}
        className="mt-8 w-full scroll-mt-6 rounded-2xl border border-gray-100 bg-white px-4 py-5 text-left shadow-sm"
      >
        <p className="text-center text-xs font-bold uppercase tracking-wide text-primary">
          La tua opinione
        </p>
        <p className="mt-1 text-center text-sm text-gray-600">
          Come ti sei trovato con questa demo?
        </p>

        <div
          className="mt-4 flex justify-center gap-1"
          role="group"
          aria-label="Voto da 1 a 5 stelle"
          onMouseLeave={() => setHoverRating(null)}
        >
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              data-testid={`feedback-star-${value}`}
              disabled={feedbackSent}
              onClick={() => {
                setRating(value);
                registerActivity();
              }}
              onMouseEnter={() => setHoverRating(value)}
              className="rounded-lg p-1 transition-transform active:scale-95 disabled:opacity-50"
              aria-label={`${value} stelle`}
            >
              <Star
                size={32}
                className={
                  value <= displayStars
                    ? "fill-amber-400 text-amber-400"
                    : "fill-transparent text-gray-300"
                }
              />
            </button>
          ))}
        </div>

        <label htmlFor="demo-feedback-comment" className="mt-5 block text-xs font-semibold text-gray-800">
          Suggerimenti o consigli <span className="font-normal text-gray-500">(facoltativo)</span>
        </label>
        <textarea
          id="demo-feedback-comment"
          data-testid="input-demo-feedback-comment"
          value={comment}
          onChange={(e) => {
            setComment(e.target.value);
            registerActivity();
          }}
          disabled={feedbackSent}
          placeholder="Cosa ti è piaciuto? Cosa miglioreresti?"
          rows={4}
          className="mt-2 w-full resize-none rounded-xl border border-gray-200 bg-[#F4FAFF] px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-primary disabled:opacity-60"
        />

        {effectiveProfile && (
          <p className="mt-3 text-[11px] text-gray-500">
            Invio come <span className="font-semibold text-gray-700">{effectiveProfile.name}</span> (
            {effectiveProfile.email})
          </p>
        )}

        <button
          type="button"
          data-testid="button-submit-demo-feedback"
          disabled={rating == null || submitting || !effectiveProfile}
          onClick={() => void submitFeedback()}
          className="mt-4 flex w-full items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/75 py-3.5 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
        >
          {submitting ? "Invio in corso…" : "Invia feedback"}
        </button>
      </div>

      <button
        type="button"
        data-testid="button-close-preview-completion"
        onClick={onClose}
        className="mt-4 w-full rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-700 active:bg-gray-50"
      >
        Chiudi
      </button>
    </div>
  );
}
