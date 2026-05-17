/**
 * Scroll modale demo — regole iOS (Safari). Dopo modifiche: npm run test:demo
 *
 * COMPLETAMENTO ("Prova completata!"):
 * - Un solo <main> scroll in AppPianificaDemo (flex-1 basis-0 overflow-y-scroll).
 * - PianificaPreviewCompletion = solo contenuto, senza overflow proprio.
 * - Barra fissa "Scorri verso il basso" FUORI dal main (footer shrink-0).
 * - Nessun overflow-hidden tra main e contenuto.
 * - Body lock disattivato in fase completamento.
 */

export const DEMO_COMPLETION_SCROLL_TEST_ID = "preview-completion-scroll";

/** Solo per wizard / altri modali interni — NON sul completamento QR. */
export const DEMO_MODAL_FLEX_SCROLL_CLASS =
  "min-h-0 flex-1 overflow-y-scroll overflow-x-hidden overscroll-y-auto touch-pan-y [-webkit-overflow-scrolling:touch] [touch-action:pan-y]";
