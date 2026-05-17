import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Lock, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type FeedbackRow = {
  id: string;
  name: string;
  email: string;
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
          <p className="text-xs text-muted-foreground">{feedbacks.length} invii</p>
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

      <div className="mx-auto max-w-lg p-4 space-y-3">
        {feedbacks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">Nessun feedback ancora.</p>
        ) : (
          feedbacks.map((fb) => (
            <Card key={fb.id}>
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-sm">{fb.name}</p>
                  <div className="flex items-center gap-0.5 text-amber-500" aria-label={`${fb.rating} stelle`}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={14} fill={i < fb.rating ? "currentColor" : "none"} strokeWidth={2} />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground break-all">{fb.email}</p>
                <p className="text-xs text-muted-foreground">{formatDate(fb.createdAt)}</p>
                {fb.comment?.trim() ? (
                  <p className="text-sm whitespace-pre-wrap rounded-lg bg-muted/50 p-3">{fb.comment}</p>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Nessun commento</p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
