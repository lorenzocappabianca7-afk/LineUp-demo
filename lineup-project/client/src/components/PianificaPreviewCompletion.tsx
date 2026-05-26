import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { CheckCircle2, ChevronDown, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { PianificaPreviewTeasers } from "@/components/PianificaPreviewTeasers";
import { readStoredDemoProfile, type PreviewProfile } from "@/lib/pianificaDemoProfile";
import { DEMO_CARD_CLASS, DEMO_CTA_CLASS, DEMO_MODAL_CONTENT } from "@/lib/pianificaDemoLayout";

export type { PreviewProfile };

const IDLE_MS = 3000;

export type PianificaPreviewCompletionProps = {
  profile: PreviewProfile;
  /** Dopo l’invio del feedback: il modale resta sulla schermata di ringraziamento. */
  onFeedbackSent?: () => void;
  /** Contenitore scroll gestito dal modale (AppPianificaDemo) — un solo layer, iOS-safe. */
  scrollRootRef: RefObject<HTMLElement | null>;
  onScrollActivity?: () => void;
};

/** Solo contenuto: nessun overflow/scroll qui (evita blocchi Safari). */
export function PianificaPreviewCompletion({
  profile,
  onFeedbackSent,
  scrollRootRef,
  onScrollActivity,
}: PianificaPreviewCompletionProps) {
  const { toast } = useToast();
  const feedbackRef = useRef<HTMLDivElement>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showScrollHint, setShowScrollHint] = useState(true);
  const [hasScrolledToFeedback, setHasScrolledToFeedback] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  const effectiveProfile =
    profile.name && profile.email && profile.birthYear ? profile : readStoredDemoProfile();

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const registerActivity = useCallback(() => {
    onScrollActivity?.();
    if (!hasScrolledToFeedback) setShowScrollHint(true);
    clearIdleTimer();
    idleTimerRef.current = setTimeout(() => {
      if (!hasScrolledToFeedback && !feedbackSent) setShowScrollHint(true);
    }, IDLE_MS);
  }, [onScrollActivity, hasScrolledToFeedback, feedbackSent, clearIdleTimer]);

  useEffect(() => {
    registerActivity();
    return clearIdleTimer;
  }, [registerActivity, clearIdleTimer]);

  useEffect(() => {
    const scrollParent = scrollRootRef.current;
    const target = feedbackRef.current;
    if (!scrollParent || !target || feedbackSent) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasScrolledToFeedback(true);
          setShowScrollHint(false);
          clearIdleTimer();
        }
      },
      { root: scrollParent, rootMargin: "0px 0px -8px 0px", threshold: 0.1 },
    );
    observer.observe(target);

    const onScroll = () => registerActivity();
    scrollParent.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      scrollParent.removeEventListener("scroll", onScroll);
    };
  }, [scrollRootRef, registerActivity, clearIdleTimer, feedbackSent]);

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
          birthYear: effectiveProfile.birthYear,
          rating,
          comment: comment.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string; saved?: boolean };
      if (!res.ok || data.saved === false || data.ok === false) {
        throw new Error(data.message || "Impossibile salvare il feedback");
      }
      setFeedbackSent(true);
      setShowScrollHint(false);
      onFeedbackSent?.();
    } catch (e) {
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
      <div
        className={cn(DEMO_MODAL_CONTENT, "flex flex-col items-center px-4 py-8 pb-10 text-center")}
        data-testid="preview-completion-thanks"
      >
        <div className={cn("w-full px-6 py-8", DEMO_CARD_CLASS)}>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 size={36} className="text-emerald-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Grazie di cuore!</h3>
          <p className="mt-3 text-sm leading-relaxed text-gray-900">
            Il tuo contributo ci aiuta a costruire LineUp insieme a chi lo userà.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(DEMO_MODAL_CONTENT, "flex w-full flex-col items-stretch px-4 pb-6 pt-4 text-center")}
        data-testid="preview-completion-content"
      >
        <div className="mx-auto mb-4 flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 size={40} className="text-emerald-500" />
        </div>
        <h3 className="text-2xl font-black tracking-tight text-amber-400">Il futuro di LineUp</h3>
        <p className="mt-2 px-1 text-sm text-gray-600">
          Scorri per scoprire le funzionalità in arrivo, poi vota l&apos;esperienza e lascia i tuoi consigli.
        </p>

        <PianificaPreviewTeasers />

        <div
          ref={feedbackRef}
          className="mt-8 w-full scroll-mt-4 rounded-2xl border border-gray-100 bg-white px-4 py-5 text-left shadow-sm"
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
                className="flex h-11 w-11 touch-manipulation items-center justify-center rounded-lg active:scale-95 disabled:opacity-50"
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
            className="mt-2 w-full resize-none rounded-xl border border-gray-200 bg-[#F0FBFC] px-3 py-3 text-base text-gray-900 outline-none placeholder:text-gray-400 focus:border-primary disabled:opacity-60"
          />

          <button
            type="button"
            data-testid="button-submit-demo-feedback"
            disabled={rating == null || submitting || !effectiveProfile}
            onClick={() => void submitFeedback()}
            className={cn("mt-5 disabled:opacity-40", DEMO_CTA_CLASS)}
          >
            {submitting ? "Invio in corso…" : "Invia feedback"}
          </button>
        </div>
      </div>

      {showScrollHint && !hasScrolledToFeedback && (
        <div
          className="sr-only"
          data-testid="preview-completion-hint-active"
          aria-hidden
        />
      )}
    </>
  );
}

/** Scorre il contenitore del modale (esposto per la barra fissa sotto). */
export function scrollCompletionRoot(root: HTMLElement | null, smooth = true) {
  if (!root) return;
  const max = root.scrollHeight - root.clientHeight;
  const next = Math.min(root.scrollTop + Math.max(320, root.clientHeight * 0.55), max);
  if (smooth && "scrollTo" in root) {
    root.scrollTo({ top: next, behavior: "smooth" });
  } else {
    root.scrollTop = next;
  }
}
