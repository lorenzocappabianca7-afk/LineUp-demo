import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Lock, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SwipeableFeedbackRow } from "@/components/SwipeableFeedbackRow";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type FeedbackRow = {
  id: string;
  name: string;
  email: string;
  birthYear?: number;
  rating: number;
  comment?: string;
  createdAt: string;
};

export default function PianificaDemoFeedbackAdmin() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [feedbacks, setFeedbacks] = useState<FeedbackRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<FeedbackRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadFeedbacks = async (pw: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/app/pianifica-demo/admin/feedbacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (res.status === 401) {
        setError("Password non valida");
        setAuthenticated(false);
        return;
      }
      if (!res.ok) throw new Error("Errore caricamento");
      const data = (await res.json()) as { feedbacks: FeedbackRow[] };
      setFeedbacks(data.feedbacks ?? []);
      setAuthenticated(true);
    } catch {
      setError("Impossibile caricare i feedback");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    void loadFeedbacks(password);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch("/api/app/pianifica-demo/admin/feedbacks/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, id: pendingDelete.id }),
      });
      if (res.status === 401) {
        setError("Sessione scaduta: password non valida");
        setAuthenticated(false);
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(data.message || "Eliminazione non riuscita");
      }
      setFeedbacks((list) => list.filter((f) => f.id !== pendingDelete.id));
      setOpenSwipeId(null);
      setPendingDelete(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossibile eliminare il feedback");
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("it-IT", { timeZone: "Europe/Rome" });
    } catch {
      return iso;
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6 text-muted-foreground" />
            </div>
            <CardTitle className="text-xl">Feedback demo</CardTitle>
            <p className="text-sm text-muted-foreground">Area riservata</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading || !password}>
                {loading ? "Accesso…" : "Entra"}
              </Button>
            </form>
            <Link href="/prova-pianifica" className="mt-4 block text-center text-xs text-muted-foreground hover:text-foreground">
              ← Torna alla demo
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card px-4 py-4 flex items-center gap-3">
        <Link href="/prova-pianifica" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-lg font-bold">Feedback Pianifica</h1>
          <p className="text-xs text-muted-foreground">
            {feedbacks.length} invii · scorri a sinistra per eliminare
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={() => void loadFeedbacks(password)}
          disabled={loading}
        >
          Aggiorna
        </Button>
      </div>

      {error && (
        <p className="mx-auto max-w-lg px-4 pt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div
        className="mx-auto max-w-lg p-4 space-y-3"
        onClick={() => setOpenSwipeId(null)}
        onKeyDown={() => {}}
        role="presentation"
      >
        {feedbacks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">Nessun feedback ancora.</p>
        ) : (
          feedbacks.map((fb) => (
            <SwipeableFeedbackRow
              key={fb.id}
              rowId={fb.id}
              open={openSwipeId === fb.id}
              onOpenChange={(open) => setOpenSwipeId(open ? fb.id : null)}
              onDeleteClick={() => setPendingDelete(fb)}
            >
              <div className="p-4 space-y-2" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-sm">{fb.name}</p>
                  <div className="flex items-center gap-0.5 text-amber-500" aria-label={`${fb.rating} stelle`}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={14} fill={i < fb.rating ? "currentColor" : "none"} strokeWidth={2} />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground break-all">{fb.email}</p>
                {fb.birthYear != null && (
                  <p className="text-xs text-muted-foreground">Anno di nascita: {fb.birthYear}</p>
                )}
                <p className="text-xs text-muted-foreground">{formatDate(fb.createdAt)}</p>
                {fb.comment?.trim() ? (
                  <p className="text-sm whitespace-pre-wrap rounded-lg bg-muted/50 p-3">{fb.comment}</p>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Nessun commento</p>
                )}
              </div>
            </SwipeableFeedbackRow>
          ))
        )}
      </div>

      <AlertDialog
        open={pendingDelete != null}
        onOpenChange={(open) => {
          if (!open && !deleting) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo feedback?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete ? (
                <>
                  Stai per eliminare definitivamente il feedback di <strong>{pendingDelete.name}</strong> (
                  {pendingDelete.email}). L&apos;operazione non si può annullare.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
            >
              {deleting ? "Eliminazione…" : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
