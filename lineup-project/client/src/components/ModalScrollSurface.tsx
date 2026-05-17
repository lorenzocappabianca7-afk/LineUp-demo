import { forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export const MODAL_SCROLL_SURFACE_CLASS =
  "absolute inset-0 z-[1] min-h-0 overflow-y-scroll overflow-x-hidden overscroll-y-auto touch-pan-y [-webkit-overflow-scrolling:touch] [touch-action:pan-y]";

type ModalScrollSurfaceProps = {
  children: ReactNode;
  className?: string;
  "data-testid"?: string;
};

/**
 * Layer scroll assoluto nel modale. NON usare per la demo Pianifica / completamento QR:
 * su iOS Safari fallisce con genitori `overflow-hidden`. Usare `DEMO_MODAL_FLEX_SCROLL_CLASS`
 * da `@/lib/demoModalScroll` (flusso flex + overflow-y-scroll).
 */
export const ModalScrollSurface = forwardRef<HTMLDivElement, ModalScrollSurfaceProps>(
  function ModalScrollSurface({ children, className, "data-testid": testId }, ref) {
    return (
      <div
        ref={ref}
        data-testid={testId ?? "modal-scroll-surface"}
        className={cn(MODAL_SCROLL_SURFACE_CLASS, className)}
      >
        {children}
      </div>
    );
  },
);
