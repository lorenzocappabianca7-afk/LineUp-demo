import { useMemo, useState } from "react";
import { Copy, Check, QrCode } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Path assoluto in-app (es. `/prova-pianifica`). */
  demoPath?: string;
};

/** QR che punta alla pagina demo Pianifica (stesso origin del browser). */
export function PianificaQrDialog({ open, onOpenChange, demoPath = "/prova-pianifica" }: Props) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const demoUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}${demoPath.startsWith("/") ? demoPath : `/${demoPath}`}`;
  }, [demoPath]);

  const qrImgSrc = useMemo(() => {
    if (!demoUrl) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(demoUrl)}`;
  }, [demoUrl]);

  const copyUrl = async () => {
    if (!demoUrl) return;
    try {
      await navigator.clipboard.writeText(demoUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Impossibile copiare",
        description: "Seleziona il link e copialo manualmente.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[340px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <QrCode className="h-5 w-5 text-primary" aria-hidden />
            Prova Pianifica
          </DialogTitle>
          <DialogDescription>
            Inquadra il codice per aprire la pagina di prova: solo il tasto Pianifica, senza accesso alle chat.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-2">
          {qrImgSrc ? (
            <img
              src={qrImgSrc}
              alt="QR code per la prova Pianifica"
              width={220}
              height={220}
              className="rounded-xl border border-border bg-white p-2"
            />
          ) : null}
          <p className="w-full break-all text-center text-[11px] font-mono text-muted-foreground">{demoUrl}</p>
          <button
            type="button"
            onClick={copyUrl}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground active:scale-[0.98]"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "Link copiato" : "Copia link"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
