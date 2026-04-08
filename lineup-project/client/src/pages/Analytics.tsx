import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Eye, Calendar, ArrowLeft, Globe, Monitor, Smartphone } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import type { PageView } from "@shared/schema";

export default function Analytics() {
  const [password, setPassword] = useState("");
  const [views, setViews] = useState<PageView[]>([]);
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await apiRequest("POST", "/api/admin/pageviews", { password });
      const data = await res.json();
      setViews(data);
      setAuthenticated(true);
    } catch {
      setError("Password non valida");
    } finally {
      setLoading(false);
    }
  };

  const getDeviceType = (ua: string | null) => {
    if (!ua) return "Sconosciuto";
    if (/mobile|android|iphone|ipad/i.test(ua)) return "Mobile";
    return "Desktop";
  };

  const getBrowserName = (ua: string | null) => {
    if (!ua) return "Sconosciuto";
    if (ua.includes("Chrome") && !ua.includes("Edg")) return "Chrome";
    if (ua.includes("Firefox")) return "Firefox";
    if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
    if (ua.includes("Edg")) return "Edge";
    return "Altro";
  };

  const todayViews = views.filter(v => {
    if (!v.createdAt) return false;
    const d = new Date(v.createdAt);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  });

  const uniqueIps = new Set(views.map(v => v.ip)).size;

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6 text-muted-foreground" />
            </div>
            <CardTitle className="text-xl">Statistiche Visite</CardTitle>
            <p className="text-sm text-muted-foreground">Inserisci la password per accedere</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="input-analytics-password"
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading || !password} data-testid="button-analytics-login">
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
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-8">
          <div>
            <h1 className="text-2xl font-bold font-display">Statistiche Visite</h1>
            <p className="text-muted-foreground text-sm">
              {views.length} visualizzazioni totali
            </p>
          </div>
          <Link href="/">
            <Button variant="outline" size="sm" data-testid="button-back-home-analytics">
              <ArrowLeft className="w-4 h-4 mr-1" /> Home
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Eye className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-total-views">{views.length}</p>
                <p className="text-xs text-muted-foreground">Visite totali</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Globe className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-today-views">{todayViews.length}</p>
                <p className="text-xs text-muted-foreground">Visite oggi</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Monitor className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-unique-visitors">{uniqueIps}</p>
                <p className="text-xs text-muted-foreground">Visitatori unici</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {views.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Eye className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nessuna visita registrata</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ultime visite</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {views.slice(0, 100).map((view, index) => (
                  <div key={view.id} className="flex items-center gap-4 p-4" data-testid={`row-pageview-${view.id}`}>
                    <span className="text-sm font-mono text-muted-foreground w-6 text-right">{index + 1}</span>
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {getDeviceType(view.userAgent) === "Mobile" ? (
                        <Smartphone className="w-4 h-4 text-muted-foreground shrink-0" />
                      ) : (
                        <Monitor className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      <div className="min-w-0">
                        <span className="text-sm font-medium block truncate">{view.ip || "—"}</span>
                        <span className="text-xs text-muted-foreground">{getBrowserName(view.userAgent)} · {getDeviceType(view.userAgent)}</span>
                      </div>
                    </div>
                    {view.referrer && (
                      <span className="text-xs text-muted-foreground truncate max-w-[120px] hidden sm:block">{view.referrer}</span>
                    )}
                    <div className="flex items-center gap-1 text-muted-foreground shrink-0">
                      <Calendar className="w-3 h-3" />
                      <span className="text-xs">
                        {view.createdAt ? new Date(view.createdAt).toLocaleString("it-IT", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit"
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
