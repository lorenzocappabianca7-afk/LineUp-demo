import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft, ChevronRight, X, Crown, Check, ArrowRight, Star,
  BarChart3, Receipt, Megaphone, Shield, Palette, Users2, CalendarClock,
  Building2, GraduationCap, Briefcase, MapPin
} from "lucide-react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

const proFeatures = [
  {
    icon: BarChart3,
    color: "from-[#4A9BD9] to-[#2E86DE]",
    title: "Analytics & Insights",
    headline: "Scopri come il tuo gruppo si organizza",
    description: "Dashboard completa con statistiche di partecipazione, frequenza degli eventi, orari preferiti del gruppo e trend mensili. Scopri chi partecipa di più, quali attività piacciono e ottimizza la pianificazione con dati reali.",
    highlights: ["Grafici partecipazione mensile", "Classifica membri più attivi", "Attività più popolari del gruppo"],
  },
  {
    icon: Receipt,
    color: "from-emerald-500 to-teal-500",
    title: "Gestione Spese Condivise",
    headline: "Dividi i costi senza pensieri",
    description: "Registra le spese di ogni evento, dividi automaticamente tra i partecipanti e tieni traccia di chi deve cosa a chi. Integrazione con i principali metodi di pagamento per saldare i debiti con un tap.",
    highlights: ["Divisione automatica equa o personalizzata", "Storico spese per evento", "Promemoria automatici per i debiti"],
  },
  {
    icon: Megaphone,
    color: "from-orange-500 to-amber-500",
    title: "Canale Annunci",
    headline: "Comunica con tutti, in un colpo solo",
    description: "Crea un canale broadcast per inviare comunicazioni importanti a tutti i membri. Ideale per avvisi, cambi di programma, aggiornamenti dell'ultimo minuto. I destinatari ricevono notifica immediata senza dover aprire ogni singola chat.",
    highlights: ["Notifiche push prioritarie", "Conferma di lettura", "Programmazione invio posticipato"],
  },
  {
    icon: CalendarClock,
    color: "from-violet-500 to-indigo-500",
    title: "Ricorrenze Automatiche",
    headline: "Gli eventi che si ripetono, si organizzano da soli",
    description: "Imposta eventi ricorrenti che si creano automaticamente ogni settimana o mese. Il calcetto del sabato, la cena del venerdì, la riunione del lunedì: Plan li crea, invita i partecipanti e gestisce le conferme senza che tu debba fare nulla.",
    highlights: ["Frequenza giornaliera, settimanale o mensile", "Conferma automatica dei partecipanti abituali", "Modifica singola occorrenza senza toccare le altre"],
  },
  {
    icon: Palette,
    color: "from-rose-500 to-pink-500",
    title: "Personalizzazione Completa",
    headline: "Il tuo Plan, il tuo stile",
    description: "Personalizza l'aspetto dei tuoi gruppi con temi, colori e icone. Scegli sfondi per le chat, aggiungi un logo al gruppo e crea un'identità visiva unica. Badge Pro esclusivo visibile sul profilo con effetti animati.",
    highlights: ["Temi e colori personalizzati per ogni gruppo", "Badge Pro animato sul profilo", "Icone e sfondi esclusivi"],
  },
  {
    icon: Shield,
    color: "from-gray-700 to-black",
    title: "Controllo & Moderazione",
    headline: "Tu decidi le regole del gruppo",
    description: "Ruoli personalizzati (admin, moderatore, membro), approvazione nuovi membri, limiti di invio messaggi e moderazione automatica. Perfetto per gruppi grandi dove serve ordine: classi scolastiche, team aziendali, associazioni sportive.",
    highlights: ["Ruoli gerarchici con permessi granulari", "Approvazione richieste di ingresso", "Log attività e moderazione automatica"],
  },
];

interface ProModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProModal({ open, onOpenChange }: ProModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1);
  const totalSlides = proFeatures.length + 2;

  useEffect(() => {
    if (open) {
      setCurrentSlide(0);
      setDirection(1);
    }
  }, [open]);

  const goNext = useCallback(() => {
    if (currentSlide < totalSlides - 1) {
      setDirection(1);
      setCurrentSlide(prev => prev + 1);
    }
  }, [currentSlide, totalSlides]);

  const goPrev = useCallback(() => {
    if (currentSlide > 0) {
      setDirection(-1);
      setCurrentSlide(prev => prev - 1);
    }
  }, [currentSlide]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, goNext, goPrev]);

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 200 : -200, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -200 : 200, opacity: 0 })
  };

  const scrollToWaitlist = () => {
    onOpenChange(false);
    setTimeout(() => {
      document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' });
    }, 300);
  };

  const isIntro = currentSlide === 0;
  const isPricing = currentSlide === totalSlides - 1;
  const featureIndex = !isIntro && !isPricing ? currentSlide - 1 : -1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-0 rounded-2xl gap-0" data-testid="pro-modal">
        <VisuallyHidden>
          <DialogTitle>Plan Pro</DialogTitle>
        </VisuallyHidden>

        <Button
          size="icon"
          variant="ghost"
          className="absolute right-3 top-3 z-20 rounded-full bg-white/80 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
          data-testid="button-close-pro"
        >
          <X className="w-4 h-4" />
        </Button>

        <div className="relative">
          <div className="flex justify-center pt-5 pb-3 px-6">
            <div className="flex gap-1.5">
              {Array.from({ length: totalSlides }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setDirection(i > currentSlide ? 1 : -1); setCurrentSlide(i); }}
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === currentSlide ? 'w-6 bg-gradient-to-r from-amber-500 to-orange-500' : 'w-1.5 bg-gray-300'}`}
                  data-testid={`button-pro-slide-${i}`}
                />
              ))}
            </div>
          </div>

          <div className="overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentSlide}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="px-6 pb-4"
              >
                {isIntro && (
                  <div className="text-center py-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-200">
                      <Crown className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-extrabold font-display mb-1">Passa a Plan Pro</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-5 max-w-xs mx-auto">
                      Funzionalità esclusive che trasformano il modo in cui organizzi la tua vita sociale e lavorativa.
                    </p>

                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 mb-4">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Consigliato per</p>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { icon: Building2, label: "Aziende", color: "bg-[#4A9BD9]" },
                          { icon: GraduationCap, label: "Scuole", color: "bg-emerald-500" },
                          { icon: Users2, label: "Associazioni", color: "bg-violet-500" },
                          { icon: Briefcase, label: "Imprese", color: "bg-orange-500" },
                        ].map((item) => {
                          const Icon = item.icon;
                          return (
                            <div key={item.label} className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-gray-100 shadow-sm">
                              <div className={`w-7 h-7 rounded-lg ${item.color} flex items-center justify-center shrink-0`}>
                                <Icon className="w-3.5 h-3.5 text-white" />
                              </div>
                              <span className="text-xs font-bold">{item.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <Star className="w-4 h-4 text-amber-500" />
                      <span>6 funzionalità esclusive da scoprire</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                )}

                {featureIndex >= 0 && featureIndex < proFeatures.length && (() => {
                  const feat = proFeatures[featureIndex];
                  const FeatIcon = feat.icon;
                  return (
                    <div className="py-3">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${feat.color} flex items-center justify-center shadow-lg shrink-0`}>
                          <FeatIcon className="w-5 h-5 text-white" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider">Pro</span>
                          <h3 className="text-base font-extrabold font-display leading-tight">{feat.title}</h3>
                        </div>
                      </div>

                      <p className="text-sm font-bold text-foreground mb-2">{feat.headline}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-4">{feat.description}</p>

                      <div className="space-y-2">
                        {feat.highlights.map((h, i) => (
                          <div key={i} className="flex items-start gap-2.5">
                            <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${feat.color} flex items-center justify-center shrink-0 mt-0.5`}>
                              <Check className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-xs font-semibold text-foreground">{h}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {isPricing && (
                  <div className="py-3 text-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-orange-200/50">
                      <Star className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-extrabold font-display mb-1">Plan Pro</h3>
                    <div className="flex items-baseline justify-center gap-1 mb-1">
                      <span className="text-3xl font-extrabold text-[#4A9BD9]">€4,99</span>
                      <span className="text-sm text-muted-foreground font-medium">/mese</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mb-4">Annulla quando vuoi · Senza vincoli · Prova gratuita 14 giorni</p>

                    <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100 text-left space-y-2 mb-4">
                      {[
                        "Analytics & insights completi",
                        "Gestione spese condivise",
                        "Canale annunci broadcast",
                        "Eventi ricorrenti automatici",
                        "Personalizzazione temi e colori",
                        "Controllo ruoli e moderazione",
                        "Badge Pro animato sul profilo",
                        "Supporto prioritario 24/7",
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-[#4A9BD9] flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                          <span className="text-[11px] font-semibold">{item}</span>
                        </div>
                      ))}
                    </div>

                    <Button
                      className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-bold shadow-lg shadow-orange-200/50 h-11"
                      onClick={scrollToWaitlist}
                      data-testid="button-pro-waitlist"
                    >
                      Iscriviti alla Waitlist <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                    <p className="text-[10px] text-muted-foreground mt-2">Sarai tra i primi a provare Plan Pro</p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="px-6 pb-5 flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goPrev}
              disabled={currentSlide === 0}
              className="rounded-lg"
              data-testid="button-pro-prev"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Indietro
            </Button>

            <span className="text-xs text-muted-foreground">
              {currentSlide + 1} / {totalSlides}
            </span>

            {currentSlide < totalSlides - 1 ? (
              <Button
                size="sm"
                onClick={goNext}
                className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                data-testid="button-pro-next"
              >
                Avanti <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => onOpenChange(false)}
                className="rounded-lg"
                data-testid="button-pro-close-final"
              >
                Chiudi
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}