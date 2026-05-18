import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const DELETE_WIDTH = 76;
const SNAP_OPEN = 52;

type Props = {
  rowId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleteClick: () => void;
  children: ReactNode;
  className?: string;
};

/** Riga feedback con swipe a sinistra (stile iOS) per mostrare Elimina. */
export function SwipeableFeedbackRow({
  rowId,
  open,
  onOpenChange,
  onDeleteClick,
  children,
  className,
}: Props) {
  const [offset, setOffset] = useState(open ? -DELETE_WIDTH : 0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const startOffset = useRef(0);
  const horizontalDrag = useRef(false);
  const offsetRef = useRef(offset);

  offsetRef.current = offset;

  const clampOffset = (x: number) => Math.max(-DELETE_WIDTH, Math.min(0, x));

  const snapOpen = useCallback(() => {
    setOffset(-DELETE_WIDTH);
    onOpenChange(true);
  }, [onOpenChange]);

  const snapClosed = useCallback(() => {
    setOffset(0);
    onOpenChange(false);
  }, [onOpenChange]);

  useEffect(() => {
    if (!dragging) setOffset(open ? -DELETE_WIDTH : 0);
  }, [open, dragging]);

  const beginDrag = (clientX: number, clientY: number) => {
    startX.current = clientX;
    startY.current = clientY;
    startOffset.current = offsetRef.current;
    horizontalDrag.current = false;
    setDragging(true);
  };

  const moveDrag = (clientX: number, clientY: number) => {
    const dx = clientX - startX.current;
    const dy = clientY - startY.current;
    if (!horizontalDrag.current && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
      horizontalDrag.current = true;
    }
    if (!horizontalDrag.current) return;
    setOffset(clampOffset(startOffset.current + dx));
  };

  const endDrag = () => {
    if (!horizontalDrag.current) {
      setDragging(false);
      return;
    }
    setDragging(false);
    if (offsetRef.current <= -SNAP_OPEN) snapOpen();
    else snapClosed();
  };

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-border bg-card"
      data-testid={`feedback-swipe-row-${rowId}`}
    >
      <div
        className="absolute inset-y-0 right-0 flex w-[76px] items-center justify-center bg-destructive"
        aria-hidden={offset > -20}
      >
        <button
          type="button"
          data-testid={`button-delete-feedback-${rowId}`}
          onClick={(e) => {
            e.stopPropagation();
            onDeleteClick();
          }}
          className="flex h-full w-full touch-manipulation flex-col items-center justify-center gap-1 text-destructive-foreground active:opacity-90"
          aria-label="Elimina feedback"
        >
          <Trash2 size={22} strokeWidth={2} />
          <span className="text-[10px] font-bold">Elimina</span>
        </button>
      </div>

      <div
        role="group"
        className={cn(
          "relative bg-card touch-pan-y select-none",
          !dragging && "transition-transform duration-200 ease-out",
          className,
        )}
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={(e) => beginDrag(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => {
          if (horizontalDrag.current) e.preventDefault();
          moveDrag(e.touches[0].clientX, e.touches[0].clientY);
        }}
        onTouchEnd={endDrag}
        onTouchCancel={endDrag}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" && e.button === 0) {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            beginDrag(e.clientX, e.clientY);
          }
        }}
        onPointerMove={(e) => {
          if (dragging && e.pointerType === "mouse") moveDrag(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          if (e.pointerType === "mouse" && dragging) endDrag();
        }}
        onPointerCancel={(e) => {
          if (e.pointerType === "mouse" && dragging) endDrag();
        }}
      >
        {children}
      </div>
    </div>
  );
}
