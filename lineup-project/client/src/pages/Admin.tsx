import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Mail, Calendar, ArrowLeft, Users } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import type { Subscriber } from "@shared/schema";

export default function Admin() {
  const [password, setPassword] = useState("");
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await apiRequest("POST", "/api/admin/subscribers", { password });
      const data = await res.json();
      setSubscribers(data);
      setAuthenticated(true);
    } catch {
      setError("Password non valida");
    } finally {
      setLoading(false);
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
            <CardTitle className="text-xl">Area Riservata</CardTitle>
            <p className="text-sm text-muted-foreground">Inserisci la password per accedere</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="input-admin-password"
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading || !password} data-testid="button-admin-login">
                {loading ? "Caricamento..." : "Accedi"}
              </Button>
            </form>
            <Link href="/" className="flex items-center justify-center gap-1 text-sm text-muted-foreground mt-4 hover:text-foreground transition-colors">
              <ArrowLeft className="w-3 h-3" />
              Torna alla home
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-8">
          <div>
            <h1 className="text-2xl font-bold font-display">Lista d'Attesa</h1>
            <p className="text-muted-foreground text-sm">
              {subscribers.length} {subscribers.length === 1 ? "iscritto" : "iscritti"}
            </p>
          </div>
          <Link href="/">
            <Button variant="outline" size="sm" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4 mr-1" /> Home
            </Button>
          </Link>
        </div>

        {subscribers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nessun iscritto ancora</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {subscribers.map((sub, index) => (
                  <div key={sub.id} className="flex items-center gap-4 p-4" data-testid={`row-subscriber-${sub.id}`}>
                    <span className="text-sm font-mono text-muted-foreground w-6 text-right">{index + 1}</span>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium truncate">{sub.email}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground shrink-0">
                      <Calendar className="w-3 h-3" />
                      <span className="text-xs">
                        {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString("it-IT", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        }) : "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
