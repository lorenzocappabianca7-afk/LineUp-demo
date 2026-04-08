import { useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { FeatureSection } from "@/components/FeatureSection";
import { DemoPreview } from "@/components/DemoPreview";
import { WaitlistForm } from "@/components/WaitlistForm";
import { Footer } from "@/components/Footer";

export default function Home() {
  useEffect(() => {
    fetch("/api/pageviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: window.location.pathname, referrer: document.referrer }),
    }).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main>
        <Hero />
        <div className="py-12 bg-white dark:bg-zinc-900/50 border-y border-border/50">
          <div className="container max-w-5xl mx-auto px-4 text-center">
            <p className="text-sm font-medium text-muted-foreground mb-6 uppercase tracking-wider">Già scelta da studenti e professionisti in tutta Italia</p>
            <div className="flex items-center justify-center gap-x-12 gap-y-4 text-muted-foreground/40 flex-wrap">
              {["Milano","Roma","Napoli","Torino","Bologna","Firenze"].map((city) => (
                <span key={city} className="text-lg font-bold font-display tracking-tight">{city}</span>
              ))}
            </div>
          </div>
        </div>
        <DemoPreview />
        <WaitlistForm />
        <FeatureSection />
      </main>
      <Footer />
    </div>
  );
}
