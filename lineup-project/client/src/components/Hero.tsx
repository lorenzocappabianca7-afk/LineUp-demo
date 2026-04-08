import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star, Users, Calendar, ListTodo, Bell, Sparkles, UtensilsCrossed, MapPin, Music } from "lucide-react";

import { DemoModal } from "@/components/DemoModal";
import { PlanDemoModal } from "@/components/PlanDemoModal";

function LineUpLogo({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="9" fill="black"/>
      <circle cx="9" cy="20" r="3.5" fill="#4A9BD9"/>
      <path d="M 5 28 Q 9 24 13 28" stroke="#4A9BD9" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <circle cx="20" cy="16" r="4.5" fill="white"/>
      <path d="M 15 28 Q 20 22 25 28" stroke="white" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
      <circle cx="31" cy="20" r="3.5" fill="#7CB9E8"/>
      <path d="M 27 28 Q 31 24 35 28" stroke="#7CB9E8" strokeWidth="2" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

export function Hero() {
  const [demoOpen, setDemoOpen] = useState(false);
  const [planDemoOpen, setPlanDemoOpen] = useState(false);

  const scrollToWaitlist = () => {
    document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative pt-28 pb-16 md:pt-48 md:pb-32 overflow-hidden bg-white">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">

          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 md:px-4 md:py-1.5 rounded-full bg-[#7CB9E8]/10 border border-[#7CB9E8]/20 text-[#4A9BD9] text-xs md:text-sm font-semibold mb-4 md:mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4A9BD9] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4A9BD9]"></span>
              </span>
              🔥 Oltre 20.000 iscritti solo in Italia
            </div>

            <div className="flex items-center justify-center lg:justify-start gap-4 md:gap-5 mb-2 md:mb-3">
              <LineUpLogo size={60} />
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold font-display leading-[1] tracking-tight text-black dark:text-white">LineUp</h1>
            </div>
            <p className="text-base md:text-xl font-semibold text-[#4A9BD9] mb-4 md:mb-6">La rivoluzione della pianificazione social</p>
            <p className="text-base md:text-xl text-muted-foreground mb-6 md:mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">Semplifica il modo di organizzarti con i tuoi amici, crea proposte di eventi, sfrutta i suggerimenti intelligenti e gli sconti tramite la funzione social.</p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 md:gap-4">
              <Button size="lg" className="rounded-full bg-black hover:bg-black/80 text-white transition-opacity duration-200 w-full sm:w-auto" onClick={scrollToWaitlist} data-testid="button-early-access">
                Get Early Access <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button size="lg" variant="outline" className="rounded-full border-black/20 hover:border-black/40 text-black transition-colors duration-200 w-full sm:w-auto" onClick={() => setDemoOpen(true)} data-testid="button-view-demo">
                View Demo
              </Button>
            </div>

            <div className="mt-6 md:mt-8 space-y-3 md:space-y-4 text-sm md:text-base text-foreground max-w-md mx-auto lg:mx-0">
              {[
                { icon: <Calendar className="w-4 h-4 text-[#4A9BD9]" />, bg: "bg-[#7CB9E8]/10", text: "Calendario intelligente con suggerimenti e attività pianificate" },
                { icon: <Users className="w-4 h-4 text-black" />, bg: "bg-black/5", text: "Chat integrate con sondaggi e suddivisione spese intelligente" },
                { icon: <Star className="w-4 h-4 text-[#7CB9E8]" />, bg: "bg-[#7CB9E8]/10", text: "Storie giornaliere per restare aggiornato sulla vita dei tuoi amici" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-7 h-7 md:w-8 md:h-8 rounded-lg ${item.bg} flex items-center justify-center shrink-0 mt-0.5`}>{item.icon}</div>
                  <span className="font-medium">{item.text}</span>
                </div>
              ))}
            </div>

            {/* AI onboarding callout */}
            <div className="mt-6 md:mt-8 relative overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 p-5 md:p-7">
              <div className="absolute top-0 right-0 w-40 h-40 bg-amber-200/30 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-yellow-200/20 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-start gap-4 relative z-10">
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0 shadow-sm">
                  <Sparkles className="w-6 h-6 md:w-7 md:h-7 text-amber-500" />
                </div>
                <div>
                  <p className="text-base md:text-lg font-bold text-amber-800 mb-1.5">Al momento del download, LineUp ti chiederà le tue preferenze</p>
                  <p className="text-sm text-amber-700 leading-relaxed mb-3">
                    Indica i tuoi posti preferiti dove mangiare, bere, fare sport e divertirti — così l'intelligenza artificiale di LineUp potrà suggerirti sempre il posto giusto per ogni occasione.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { icon: <UtensilsCrossed className="w-3.5 h-3.5" />, label: "Ristoranti" },
                      { icon: <MapPin className="w-3.5 h-3.5" />, label: "Bar & Locali" },
                      { icon: <Music className="w-3.5 h-3.5" />, label: "Sport & Svago" },
                    ].map((tag, i) => (
                      <span key={i} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-200 text-xs font-semibold text-amber-700">
                        {tag.icon}{tag.label}
                      </span>
                    ))}
                    <span className="px-3 py-1 rounded-full bg-amber-100 border border-amber-200 text-xs font-semibold text-amber-700">+ altro</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 md:mt-12 flex flex-wrap items-center justify-center lg:justify-start gap-4 md:gap-6 text-xs md:text-sm font-medium text-muted-foreground">
              <div className="flex items-center gap-2"><Users className="w-4 h-4 md:w-5 md:h-5 text-[#4A9BD9]" /><span>20.000+ iscritti</span></div>
              <div className="flex items-center gap-2"><Star className="w-4 h-4 md:w-5 md:h-5 text-[#7CB9E8]" /><span>4.9/5 valutazione</span></div>
              <div className="flex -space-x-2">
                {["bg-[#4A9BD9]","bg-orange-400","bg-emerald-500","bg-violet-500","bg-rose-400"].map((color, i) => (
                  <div key={i} className={`w-6 h-6 md:w-7 md:h-7 rounded-full ${color} border-2 border-white flex items-center justify-center text-white text-[8px] md:text-[9px] font-bold`}>{["A","M","G","L","S"][i]}</div>
                ))}
                <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-gray-500 text-[7px] md:text-[8px] font-bold">+99</div>
              </div>
            </div>
          </div>

          <div className="flex-1 relative w-full max-w-sm md:max-w-none mx-auto">
            <div className="absolute -top-10 -right-10 w-48 md:w-72 h-48 md:h-72 bg-[#7CB9E8]/8 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-48 md:w-72 h-48 md:h-72 bg-black/5 rounded-full blur-3xl pointer-events-none" />

            <div className="text-center mb-6 md:mb-10">
              <h2 className="text-3xl md:text-5xl font-extrabold font-display leading-tight mb-2 md:mb-3">Tocca i tasti nei telefoni<br /><span className="text-[#4A9BD9]">e prova tu stesso</span></h2>
              <span className="inline-block px-3 md:px-4 py-1 md:py-1.5 rounded-full bg-[#7CB9E8]/10 text-[#4A9BD9] text-xs md:text-sm font-bold uppercase tracking-wider">Demo interattiva</span>
            </div>

            <div className="relative flex flex-col items-center md:flex-row md:items-start justify-center gap-4 md:gap-0">
              <div className="relative border-black bg-black border-[10px] md:border-[14px] rounded-[2rem] md:rounded-[2.5rem] h-[420px] w-[210px] md:h-[600px] md:w-[300px] shadow-2xl rotate-[-6deg] hover:rotate-0 transition-transform duration-700 ease-out z-10">
                <div className="h-[24px] md:h-[32px] w-[3px] bg-black absolute -start-[13px] md:-start-[17px] top-[50px] md:top-[72px] rounded-s-lg"></div>
                <div className="h-[34px] md:h-[46px] w-[3px] bg-black absolute -start-[13px] md:-start-[17px] top-[86px] md:top-[124px] rounded-s-lg"></div>
                <div className="h-[34px] md:h-[46px] w-[3px] bg-black absolute -start-[13px] md:-start-[17px] top-[126px] md:top-[178px] rounded-s-lg"></div>
                <div className="h-[46px] md:h-[64px] w-[3px] bg-black absolute -end-[13px] md:-end-[17px] top-[100px] md:top-[142px] rounded-e-lg"></div>
                <div className="rounded-[1.5rem] md:rounded-[2rem] overflow-hidden w-[190px] md:w-[272px] h-[400px] md:h-[572px] bg-white relative">
                  <div className="bg-gradient-to-br from-[#7CB9E8]/5 to-white h-full w-full p-3 md:p-4 flex flex-col">
                    <div className="flex justify-between items-center mb-3 md:mb-4 pt-1 md:pt-2">
                      <h3 className="font-bold text-sm md:text-lg">Il mio Calendario</h3>
                      <div className="w-7 h-7 md:w-10 md:h-10 rounded-full bg-[#7CB9E8]/20 flex items-center justify-center text-[#4A9BD9]"><ListTodo className="w-3.5 h-3.5 md:w-5 md:h-5" /></div>
                    </div>
                    <div className="bg-white p-2 md:p-4 rounded-xl shadow-sm flex-1 mb-3 md:mb-4 flex flex-col border border-gray-100">
                      <div className="flex justify-between mb-2 md:mb-4">
                        <span className="font-bold text-xs md:text-base">Ottobre</span>
                        <Calendar className="w-3.5 h-3.5 md:w-5 md:h-5 text-[#4A9BD9]" />
                      </div>
                      <div className="grid grid-cols-7 gap-0.5 md:gap-1 text-center text-[7px] md:text-[10px] flex-1">
                        {['L','M','M','G','V','S','D'].map((d, i) => (<span key={i} className="text-gray-400 font-bold mb-1 md:mb-2">{d}</span>))}
                        {Array.from({length: 31}).map((_, i) => {
                          const storyDays = [2,3,5,6,7,9,12,13,15,16,18,21,24,25,26,28,30,31];
                          const isStoryDay = storyDays.includes(i + 1);
                          return (
                            <div key={i} className="relative flex flex-col items-center justify-center py-1 md:py-2 h-full">
                              {isStoryDay && <div className="w-1 h-1 md:w-1.5 md:h-1.5 bg-[#2E86DE] rounded-full mb-0.5" />}
                              <span className={`z-10 text-[8px] md:text-xs ${isStoryDay ? 'font-bold' : ''}`}>{i+1}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <Button className="w-full bg-black text-white rounded-xl font-bold shadow-lg hover:bg-black/80 cursor-pointer text-xs md:text-sm h-8 md:h-10" onClick={() => setPlanDemoOpen(true)} data-testid="button-pianifica-demo">+ Pianifica</Button>
                  </div>
                </div>
                {/* Arrow pointing to the Pianifica button */}
                <div className="absolute right-[-90px] md:right-[-115px] bottom-[30px] md:bottom-[40px] pointer-events-none z-20">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 80 90"
                    className="w-20 h-24 md:w-28 md:h-32"
                  >
                    <path d="M70 5 Q70 58 20 80 M20 80 L40 77 M20 80 L34 64" stroke="#4A9BD9" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  </svg>
                </div>
              </div>


              <div className="hidden md:flex flex-col w-[220px] mt-12 ml-4 z-0">
                <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl border border-gray-100 dark:border-zinc-700 p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-[#7CB9E8]/15 flex items-center justify-center"><Bell className="w-3.5 h-3.5 text-[#4A9BD9]" /></div>
                    <span className="text-[11px] font-bold text-foreground leading-tight">Visualizza gli impegni che si stanno avvicinando</span>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-gradient-to-r from-orange-100 to-gray-50 dark:from-orange-100/20 dark:to-zinc-800 rounded-xl p-3 border border-orange-200 dark:border-orange-200/20">
                      <div className="flex items-center gap-1.5 mb-1.5"><div className="w-1.5 h-1.5 rounded-full bg-orange-500" /><span className="text-[11px] font-bold text-foreground">Aperitivo al Tramonto</span></div>
                      <div className="flex items-center gap-1 mb-1"><Users className="w-3 h-3 text-muted-foreground" /><span className="text-[9px] text-muted-foreground">Giovanni, Elena, Marco</span></div>
                      <div className="flex items-center gap-1"><Calendar className="w-3 h-3 text-muted-foreground" /><span className="text-[9px] text-muted-foreground">Ven 18 Ott - 19:30</span></div>
                    </div>
                    <div className="bg-gradient-to-r from-emerald-100 to-gray-50 dark:from-emerald-100/20 dark:to-zinc-800 rounded-xl p-3 border border-emerald-200 dark:border-emerald-200/20">
                      <div className="flex items-center gap-1.5 mb-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /><span className="text-[11px] font-bold text-foreground">Calcetto del Sabato</span></div>
                      <div className="flex items-center gap-1 mb-1"><Users className="w-3 h-3 text-muted-foreground" /><span className="text-[9px] text-muted-foreground">Luca, Andrea, Leo, Mary</span></div>
                      <div className="flex items-center gap-1"><Calendar className="w-3 h-3 text-muted-foreground" /><span className="text-[9px] text-muted-foreground">Sab 19 Ott - 10:00</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-20 md:mt-24 text-center mb-8 md:mb-10">
          <span className="inline-block px-3 md:px-4 py-1 md:py-1.5 rounded-full bg-[#7CB9E8]/10 border border-[#7CB9E8]/15 text-[#4A9BD9] text-xs md:text-sm font-bold uppercase tracking-wider mb-3 md:mb-4">Come funziona</span>
          <h2 className="text-2xl md:text-4xl font-bold font-display text-black dark:text-white">Organizza in <span className="text-[#4A9BD9]">3 semplici passi</span></h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 max-w-5xl mx-auto">
          {[
            { num: "1)", icon: <Calendar className="w-5 h-5 md:w-6 md:h-6" />, iconBg: "bg-[#4A9BD9]/10", iconColor: "text-[#4A9BD9]", title: "Proponi un Evento", desc: "Clicca il tasto \"Pianifica\" per creare una nuova proposta e iniziare a organizzare la tua giornata." },
            { num: "2)", icon: <Users className="w-5 h-5 md:w-6 md:h-6" />, iconBg: "bg-orange-100", iconColor: "text-orange-500", title: "Scegli i Partecipanti", desc: "Seleziona con chi vuoi condividere la tua idea e crea istantaneamente il gruppo per l'evento." },
            { num: "3)", icon: <Bell className="w-5 h-5 md:w-6 md:h-6" />, iconBg: "bg-emerald-100", iconColor: "text-emerald-500", title: "Notifica Inviata", desc: "I tuoi amici riceveranno subito una notifica e potranno vedere la proposta." },
          ].map((step, idx) => (
            <div key={idx} className="bg-white p-5 md:p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center gap-3 mb-3 md:mb-4">
                <span className="text-lg md:text-xl font-bold text-black dark:text-white">{step.num}</span>
                <div className={`w-10 h-10 md:w-12 md:h-12 ${step.iconBg} rounded-xl flex items-center justify-center ${step.iconColor}`}>{step.icon}</div>
              </div>
              <h4 className="font-bold text-base md:text-lg mb-2 text-foreground">{step.title}</h4>
              <p className="text-xs md:text-sm text-muted-foreground">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <DemoModal open={demoOpen} onOpenChange={setDemoOpen} />
      <PlanDemoModal open={planDemoOpen} onOpenChange={setPlanDemoOpen} />
    </section>
  );
}
