import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar, MessageCircle, ThumbsUp, Camera, X } from "lucide-react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

const slides = [
  {
    id: 1,
    icon: Calendar,
    title: "Il Tuo Calendario Social",
    description: "Ogni giorno del calendario mostra le storie dei tuoi amici. I pallini viola indicano i giorni con attività condivise.",
    color: "from-[#7CB9E8]/20 to-blue-400/20",
    iconColor: "text-[#4A9BD9]",
    iconBg: "bg-[#7CB9E8]/10",
    mockup: (
      <div className="bg-white rounded-2xl p-4 shadow-lg w-56 mx-auto">
        <div className="flex justify-between items-center mb-3">
          <span className="font-bold text-sm">Ottobre</span>
          <Calendar className="w-4 h-4 text-[#4A9BD9]" />
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[9px]">
          {['L','M','M','G','V','S','D'].map((d, i) => (
            <span key={i} className="text-gray-400 font-bold mb-1">{d}</span>
          ))}
          {Array.from({length: 14}).map((_, i) => {
            const storyDays = [2, 3, 5, 6, 7, 9, 12, 13];
            const isStory = storyDays.includes(i + 1);
            return (
              <div key={i} className="flex flex-col items-center py-1">
                {isStory && <div className="w-1 h-1 bg-[#4A9BD9] rounded-full mb-0.5" />}
                <span className={`text-[10px] ${isStory ? 'font-bold' : 'text-gray-400'}`}>{i+1}</span>
              </div>
            );
          })}
        </div>
      </div>
    )
  },
  {
    id: 2,
    icon: Camera,
    title: "Storie sul Calendario",
    description: "Condividi foto e momenti della tua giornata. I tuoi amici vedranno le tue storie direttamente nel loro calendario.",
    color: "from-[#7CB9E8]/20 to-[#4A9BD9]/20",
    iconColor: "text-[#4A9BD9]",
    iconBg: "bg-[#7CB9E8]/10",
    mockup: (
      <div className="w-56 mx-auto space-y-3">
        {[
          { name: "Tu", days: [true, true, true, false, true], imgs: [
            "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=60&q=80",
            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=60&q=80",
            "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=60&q=80",
            "",
            "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=60&q=80"
          ]},
          { name: "Giovanni", days: [true, false, true, false, false], imgs: [
            "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=60&q=80",
            "",
            "https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&w=60&q=80",
            "",
            ""
          ]}
        ].map((user) => (
          <div key={user.name} className="bg-white rounded-xl p-3 shadow-sm">
            <span className="text-[10px] font-bold mb-2 block">{user.name}</span>
            <div className="flex gap-2 justify-center">
              {['L','M','M','G','V'].map((day, i) => (
                <div key={i} className="flex flex-col items-center gap-0.5">
                  <span className="text-[7px] text-gray-400 font-bold">{day}</span>
                  <div className={`w-8 h-8 rounded-full border-[3px] overflow-hidden ${user.days[i] ? 'border-[#4A9BD9]' : 'border-gray-200 opacity-30'}`}>
                    {user.days[i] && user.imgs[i] && (
                      <img src={user.imgs[i]} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  },
  {
    id: 3,
    icon: MessageCircle,
    title: "Chat per Ogni Giornata",
    description: "Ogni data ha la sua chat dedicata. Organizza uscite, condividi idee e coordinati con gli amici senza confusione.",
    color: "from-[#4A9BD9]/20 to-[#7CB9E8]/20",
    iconColor: "text-[#4A9BD9]",
    iconBg: "bg-[#7CB9E8]/10",
    mockup: (
      <div className="w-56 mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 border-b">
          <span className="text-[10px] font-bold text-gray-500">CHAT</span>
        </div>
        {[
          { name: "Giovanni", msg: "Ci vediamo alle 19:30?", time: "14:32", dot: true },
          { name: "Elena", msg: "Ho prenotato il ristorante!", time: "13:15", dot: false },
          { name: "Gruppo Classe", msg: "Chi viene sabato?", time: "12:01", dot: true },
        ].map((chat, i) => (
          <div key={i} className="flex items-center gap-2 px-3 py-2.5 border-b last:border-0">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-[10px] font-bold text-gray-600">
                {chat.name[0]}
              </div>
              {chat.dot && <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#4A9BD9] rounded-full border-2 border-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center gap-1">
                <span className="text-[10px] font-bold truncate">{chat.name}</span>
                <span className="text-[8px] text-gray-400 shrink-0">{chat.time}</span>
              </div>
              <span className="text-[9px] text-gray-500 truncate block">{chat.msg}</span>
            </div>
          </div>
        ))}
      </div>
    )
  },
  {
    id: 4,
    icon: ThumbsUp,
    title: "Proposte & Votazioni",
    description: "Proponi attività e lascia che i tuoi amici votino. Orari alternativi, conferme rapide e organizzazione senza stress.",
    color: "from-green-500/20 to-emerald-500/20",
    iconColor: "text-green-500",
    iconBg: "bg-green-500/10",
    mockup: (
      <div className="w-56 mx-auto bg-white rounded-2xl shadow-lg p-4">
        <div className="text-center mb-3">
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Proposta Evento</span>
        </div>
        <div className="bg-gradient-to-br from-[#7CB9E8]/10 to-gray-50 rounded-xl p-3 mb-3">
          <span className="text-xs font-bold block mb-1">Aperitivo in Terrazza</span>
          <span className="text-[9px] text-gray-500 block">Venerdì ore 19:30</span>
          <span className="text-[9px] text-gray-500">con Giovanni</span>
        </div>
        <div className="flex gap-2 mb-2">
          <div className="flex-1 bg-green-50 rounded-lg py-2 flex items-center justify-center gap-1">
            <ThumbsUp className="w-3 h-3 text-green-600" />
            <span className="text-[10px] font-bold text-green-600">3</span>
          </div>
          <div className="flex-1 bg-red-50 rounded-lg py-2 flex items-center justify-center gap-1">
            <ThumbsUp className="w-3 h-3 text-red-400 rotate-180" />
            <span className="text-[10px] font-bold text-red-400">1</span>
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg py-1.5 text-center">
          <span className="text-[9px] font-bold text-gray-500">ORARI ALTERNATIVI</span>
        </div>
      </div>
    )
  }
];

interface DemoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DemoModal({ open, onOpenChange }: DemoModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    if (open) {
      setCurrentSlide(0);
      setDirection(1);
    }
  }, [open]);

  const goNext = useCallback(() => {
    if (currentSlide < slides.length - 1) {
      setDirection(1);
      setCurrentSlide(prev => prev + 1);
    }
  }, [currentSlide]);

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

  const slide = slides[currentSlide];
  const Icon = slide.icon;

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 200 : -200, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -200 : 200, opacity: 0 })
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-0 rounded-2xl gap-0" data-testid="demo-modal">
        <VisuallyHidden>
          <DialogTitle>Demo LineUp</DialogTitle>
        </VisuallyHidden>

        <Button
          size="icon"
          variant="ghost"
          className="absolute right-3 top-3 z-20 rounded-full bg-white/80 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
          data-testid="button-close-demo"
        >
          <X className="w-4 h-4" />
        </Button>

        <div className="relative">
          <div className={`bg-gradient-to-br ${slide.color} pt-8 pb-6 px-6`}>
            <div className="flex justify-center mb-4">
              <div className="flex gap-1.5">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setDirection(i > currentSlide ? 1 : -1); setCurrentSlide(i); }}
                    className={`h-1.5 rounded-full transition-all duration-300 ${i === currentSlide ? 'w-8 bg-foreground' : 'w-1.5 bg-foreground/20'}`}
                    data-testid={`button-slide-${i}`}
                  />
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentSlide}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <div className="flex justify-center mb-5">
                  {slide.mockup}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl ${slide.iconBg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${slide.iconColor}`} />
              </div>
              <h3 className="font-bold font-display text-lg">{slide.title}</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">{slide.description}</p>

            <div className="flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goPrev}
                disabled={currentSlide === 0}
                data-testid="button-prev-slide"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Indietro
              </Button>

              <span className="text-xs text-muted-foreground">
                {currentSlide + 1} / {slides.length}
              </span>

              {currentSlide < slides.length - 1 ? (
                <Button
                  size="sm"
                  onClick={goNext}
                  data-testid="button-next-slide"
                >
                  Avanti <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  data-testid="button-close-demo-final"
                >
                  Chiudi
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
