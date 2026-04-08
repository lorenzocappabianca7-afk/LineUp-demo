import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  X, ChevronLeft, MapPin, Star, Percent, Check, 
  Users, UserPlus, Send, UtensilsCrossed, Wine, 
  Footprints, Dumbbell, Clock, CalendarCheck, Search,
  Music, Pizza, Trophy, KeyRound, CircleDot, Sparkles
} from "lucide-react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

const activities = [
  { id: "aperitivo", label: "Aperitivo", icon: Wine, color: "bg-[#7CB9E8]/15 text-[#4A9BD9]" },
  { id: "calcietto", label: "Calcietto", icon: Trophy, color: "bg-emerald-100 text-emerald-600" },
  { id: "cena", label: "Cena", icon: UtensilsCrossed, color: "bg-orange-100 text-orange-600" },
  { id: "escape-room", label: "Escape Room", icon: KeyRound, color: "bg-red-100 text-red-600" },
  { id: "giro", label: "Giro in Centro", icon: Footprints, color: "bg-blue-100 text-blue-600" },
  { id: "golf", label: "Golf", icon: CircleDot, color: "bg-teal-100 text-teal-600" },
  { id: "padel", label: "Padel", icon: Dumbbell, color: "bg-green-100 text-green-600" },
  { id: "pizzata", label: "Pizzata", icon: Pizza, color: "bg-yellow-100 text-yellow-600" },
  { id: "pranzo", label: "Pranzo", icon: UtensilsCrossed, color: "bg-amber-100 text-amber-600" },
  { id: "serata-disco", label: "Serata in Discoteca", icon: Music, color: "bg-gray-200 text-gray-700" },
  { id: "tennis", label: "Tennis", icon: Trophy, color: "bg-lime-100 text-lime-600" },
];

interface Venue {
  name: string;
  rating: number;
  distance: string;
  discount?: string;
  promoted?: boolean;
  aiRecommended?: boolean;
  aiReason?: string;
}

const venuesByActivity: Record<string, Venue[]> = {
  aperitivo: [
    { name: "Bar del Corso", rating: 4.6, distance: "0.3 km", discount: "Tagliere gratis", promoted: true, aiRecommended: true, aiReason: "Ci sei andato 4 volte con questo gruppo" },
    { name: "Terrazza Skyline", rating: 4.8, distance: "1.0 km", discount: "2x1 Spritz", promoted: true },
    { name: "Lounge Cafè", rating: 4.5, distance: "1.8 km" },
    { name: "Wine Bar Centrale", rating: 4.2, distance: "2.2 km" },
  ],
  calcietto: [
    { name: "Centro Sportivo Flaminio", rating: 4.7, distance: "1.5 km", discount: "Campo gratis dopo 5 partite", promoted: true, aiRecommended: true, aiReason: "La tua squadra preferita gioca qui" },
    { name: "Calcetto Village", rating: 4.5, distance: "2.0 km", discount: "10% gruppo 8+", promoted: true },
    { name: "Sporting Club Roma", rating: 4.4, distance: "3.2 km" },
    { name: "Arena Calcetto EUR", rating: 4.2, distance: "4.5 km" },
  ],
  cena: [
    { name: "Trattoria Da Mario", rating: 4.9, distance: "0.8 km", discount: "10% sul conto", promoted: true, aiRecommended: true, aiReason: "Il tuo gruppo lo ha scelto 3 volte" },
    { name: "Ristorante La Pergola", rating: 4.7, distance: "1.5 km", discount: "Antipasto gratis", promoted: true },
    { name: "Pizzeria Napoli", rating: 4.6, distance: "0.5 km" },
    { name: "Sushi Zen", rating: 4.4, distance: "2.0 km" },
  ],
  "escape-room": [
    { name: "Enigma Room Roma", rating: 4.9, distance: "0.9 km", discount: "15% gruppo 4+", promoted: true, aiRecommended: true, aiReason: "Preferito dai tuoi amici nelle uscite passate" },
    { name: "The Escape Factory", rating: 4.7, distance: "1.3 km", discount: "1 giocatore gratis su 6", promoted: true },
    { name: "Mystery Rooms", rating: 4.5, distance: "2.1 km" },
    { name: "Fugacemente", rating: 4.4, distance: "3.0 km" },
  ],
  giro: [
    { name: "Walking Tour Trastevere", rating: 4.7, distance: "Centro", discount: "Guida gratis", promoted: true, aiRecommended: true, aiReason: "Zona che visiti più spesso il weekend" },
    { name: "Tour Colosseo & Fori", rating: 4.9, distance: "Centro", discount: "20% gruppo 4+", promoted: true },
    { name: "Giro Panoramico", rating: 4.5, distance: "Centro" },
    { name: "Tour Street Food", rating: 4.6, distance: "Centro" },
  ],
  golf: [
    { name: "Golf Club Parco de' Medici", rating: 4.8, distance: "8.0 km", discount: "20% green fee", promoted: true, aiRecommended: true, aiReason: "Ci sei andato 2 settimane fa con Marco" },
    { name: "Olgiata Golf Club", rating: 4.7, distance: "15 km", discount: "Lezione prova gratis", promoted: true },
    { name: "Circolo Golf Roma", rating: 4.5, distance: "12 km" },
    { name: "Golf Nazionale", rating: 4.6, distance: "20 km" },
  ],
  padel: [
    { name: "Padel Club Roma", rating: 4.8, distance: "1.2 km", discount: "15% di sconto", promoted: true, aiRecommended: true, aiReason: "Hai giocato qui 5 volte nell'ultimo mese" },
    { name: "Sport Village Padel", rating: 4.5, distance: "2.5 km", discount: "10% di sconto", promoted: true },
    { name: "Centro Padel Trastevere", rating: 4.3, distance: "3.1 km" },
    { name: "Padel Arena EUR", rating: 4.1, distance: "5.0 km" },
  ],
  pizzata: [
    { name: "Pizzeria Da Michele", rating: 4.9, distance: "0.6 km", discount: "Pizza + bibita 8€", promoted: true, aiRecommended: true, aiReason: "La preferita di Giovanni e Elena" },
    { name: "L'Antica Pizzeria", rating: 4.7, distance: "1.0 km", discount: "15% sul totale", promoted: true },
    { name: "Pizza Art", rating: 4.5, distance: "1.5 km" },
    { name: "Pizzeria Il Forno", rating: 4.3, distance: "2.0 km" },
  ],
  pranzo: [
    { name: "Osteria del Mercato", rating: 4.8, distance: "0.5 km", discount: "Menu fisso 12€", promoted: true, aiRecommended: true, aiReason: "Scelta più frequente il sabato a pranzo" },
    { name: "Trattoria Moderna", rating: 4.6, distance: "1.2 km", discount: "Dolce gratis", promoted: true },
    { name: "Ristorante Al Sole", rating: 4.5, distance: "0.8 km" },
    { name: "Bistrot Centrale", rating: 4.3, distance: "1.8 km" },
  ],
  "serata-disco": [
    { name: "Club Noir", rating: 4.7, distance: "2.0 km", discount: "Ingresso gratis entro le 23", promoted: true, aiRecommended: true, aiReason: "Il tuo gruppo lo ha votato 3 volte su 3" },
    { name: "Disco Palace", rating: 4.5, distance: "3.5 km", discount: "Tavolo VIP -20%", promoted: true },
    { name: "Superclub Roma", rating: 4.4, distance: "4.0 km" },
    { name: "La Terrazza", rating: 4.6, distance: "1.5 km" },
  ],
  tennis: [
    { name: "Tennis Club Parioli", rating: 4.8, distance: "1.8 km", discount: "Prima ora gratis", promoted: true, aiRecommended: true, aiReason: "Ci giochi ogni domenica mattina" },
    { name: "Circolo Tennis Roma", rating: 4.6, distance: "2.5 km", discount: "10% prenotazione doppio", promoted: true },
    { name: "Sport Center Tennis", rating: 4.4, distance: "3.0 km" },
    { name: "Tennis Academy EUR", rating: 4.3, distance: "5.0 km" },
  ],
};

const timeSlots = ["18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00"];

const contacts = [
  { id: "giovanni", name: "Giovanni", avatar: "G", color: "bg-[#4A9BD9]" },
  { id: "elena", name: "Elena", avatar: "E", color: "bg-orange-400" },
  { id: "marco", name: "Marco", avatar: "M", color: "bg-emerald-500" },
  { id: "luca", name: "Luca", avatar: "L", color: "bg-violet-500" },
  { id: "mary", name: "Mary", avatar: "M", color: "bg-rose-400" },
];

const groups = [
  { id: "calcetto", name: "Calcetto Sabato", members: 6, color: "from-emerald-400 to-teal-500" },
  { id: "classe", name: "Gruppo Classe", members: 12, color: "from-violet-400 to-indigo-500" },
];

const TOTAL_STEPS = 4;

interface PlanDemoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlanDemoModal({ open, onOpenChange }: PlanDemoModalProps) {
  const [step, setStep] = useState(0);
  const [activitySearch, setActivitySearch] = useState("");
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [selectedVenues, setSelectedVenues] = useState<Venue[]>([]);
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (open) {
      setStep(0);
      setActivitySearch("");
      setSelectedActivity(null);
      setSelectedVenues([]);
      setSelectedTimes([]);
      setSelectedDates([]);
      setSelectedContacts([]);
      setSelectedGroup(null);
      setSent(false);
    }
  }, [open]);

  const handleActivitySelect = (activityId: string) => {
    setSelectedActivity(activityId);
  };

  const toggleVenue = (venue: Venue) => {
    setSelectedVenues(prev => {
      const exists = prev.some(v => v.name === venue.name);
      return exists ? prev.filter(v => v.name !== venue.name) : [...prev, venue];
    });
  };

  const toggleContact = (contactId: string) => {
    setSelectedGroup(null);
    setSelectedContacts(prev =>
      prev.includes(contactId) ? prev.filter(c => c !== contactId) : [...prev, contactId]
    );
  };

  const selectGroup = (groupId: string) => {
    setSelectedContacts([]);
    setSelectedGroup(groupId === selectedGroup ? null : groupId);
  };

  const handleSend = () => {
    setSent(true);
    setTimeout(() => {
      onOpenChange(false);
    }, 2500);
  };

  const toggleTime = (time: string) => {
    setSelectedTimes(prev =>
      prev.includes(time) ? prev.filter(t => t !== time) : [...prev, time]
    );
  };

  const toggleDate = (date: string) => {
    setSelectedDates(prev =>
      prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]
    );
  };

  const canWhen = selectedDates.length > 0 && selectedTimes.length > 0;
  const canSend = selectedContacts.length > 0 || selectedGroup !== null;
  const activityLabel = activities.find(a => a.id === selectedActivity)?.label || "";
  const bestDiscount = selectedVenues.find(v => v.discount)?.discount;

  const groupLabel = selectedGroup
    ? groups.find(g => g.id === selectedGroup)?.name ?? ""
    : selectedContacts.map(c => contacts.find(ct => ct.id === c)?.name).filter(Boolean).join(", ");

  const upcomingDates = [
    { label: "Oggi", day: "Ven 21", value: "oggi" },
    { label: "Domani", day: "Sab 22", value: "domani" },
    { label: "", day: "Dom 23", value: "dom23" },
    { label: "", day: "Lun 24", value: "lun24" },
    { label: "", day: "Mar 25", value: "mar25" },
  ];

  const slideVariants = {
    enter: { x: 80, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -80, opacity: 0 },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 overflow-hidden border-0 rounded-2xl gap-0 max-h-[90vh]" data-testid="plan-demo-modal">
        <VisuallyHidden>
          <DialogTitle>Demo Pianifica</DialogTitle>
          <DialogDescription>Dimostra il flusso di pianificazione di un evento</DialogDescription>
        </VisuallyHidden>

        <Button
          size="icon"
          variant="ghost"
          className="absolute right-3 top-3 z-20 rounded-full bg-white/80 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
          aria-label="Chiudi"
          data-testid="button-close-plan-demo"
        >
          <X className="w-4 h-4" />
        </Button>

        {step > 0 && !sent && (
          <button
            onClick={() => setStep(s => s - 1)}
            className="absolute left-3 top-3 z-20 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors"
            aria-label="Torna indietro"
            data-testid="button-plan-back"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        <div className="bg-gradient-to-br from-[#7CB9E8]/10 to-gray-50 px-5 pt-10 pb-4 h-[420px] flex flex-col overflow-hidden">
          <div className="flex justify-center gap-1.5 mb-4">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-[#4A9BD9]' : i < step ? 'w-4 bg-[#4A9BD9]/40' : 'w-1.5 bg-gray-300'}`}
              />
            ))}
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {sent ? (
              <motion.div
                key="sent"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="text-center py-8 flex-1 flex flex-col items-center justify-center"
              >
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="font-bold text-lg mb-1" data-testid="text-proposal-sent">Proposta Inviata!</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedGroup
                    ? `Il gruppo "${groups.find(g => g.id === selectedGroup)?.name}" riceverà la tua proposta`
                    : `${selectedContacts.map(c => contacts.find(ct => ct.id === c)?.name).join(", ")} ${selectedContacts.length === 1 ? 'riceverà' : 'riceveranno'} la tua proposta`
                  }
                </p>
                <div className="mt-3 bg-white/60 rounded-xl p-3 mx-auto max-w-[240px]">
                  <p className="text-xs font-bold text-foreground">
                    {activityLabel}{selectedVenues.length === 1 ? ` @ ${selectedVenues[0]?.name}` : selectedVenues.length > 1 ? ` — ${selectedVenues.length} luoghi` : ""}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {selectedDates.map(d => upcomingDates.find(u => u.value === d)?.day).join(", ")} alle {selectedTimes.join(", ")}
                  </p>
                </div>
              </motion.div>

            ) : step === 0 ? (
              /* ── STEP 0: Chi invitare ── */
              <motion.div
                key="step0"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25 }}
                className="flex flex-col h-full overflow-hidden"
              >
                <h3 className="font-bold text-base text-center mb-1 shrink-0">A chi proporre?</h3>
                <p className="text-xs text-muted-foreground text-center mb-3 shrink-0">Seleziona amici o un gruppo esistente</p>

                <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 min-h-0">
                  <div className="bg-white rounded-xl border border-gray-200 p-3">
                    <div className="flex items-center gap-2 mb-2.5">
                      <Users className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Gruppi</span>
                    </div>
                    <div className="space-y-1.5">
                      {groups.map(group => (
                        <button
                          key={group.id}
                          onClick={() => selectGroup(group.id)}
                          className={`w-full flex items-center gap-2.5 p-2 rounded-lg transition-all ${
                            selectedGroup === group.id ? 'bg-[#4A9BD9]/10 border border-[#4A9BD9]/30' : 'hover:bg-gray-50 border border-transparent'
                          }`}
                          data-testid={`button-group-${group.id}`}
                        >
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${group.color} flex items-center justify-center`}>
                            <Users className="w-3.5 h-3.5 text-white" />
                          </div>
                          <div className="text-left flex-1">
                            <span className="text-xs font-bold block">{group.name}</span>
                            <span className="text-[9px] text-gray-400">{group.members} membri</span>
                          </div>
                          {selectedGroup === group.id && <Check className="w-4 h-4 text-[#4A9BD9]" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 p-3">
                    <div className="flex items-center gap-2 mb-2.5">
                      <UserPlus className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Amici</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {contacts.map(contact => {
                        const isSel = selectedContacts.includes(contact.id);
                        return (
                          <button
                            key={contact.id}
                            onClick={() => toggleContact(contact.id)}
                            className={`flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full transition-all ${
                              isSel ? 'bg-[#4A9BD9]/10 border border-[#4A9BD9]/30' : 'bg-gray-50 border border-gray-200 hover:border-[#4A9BD9]/30'
                            }`}
                            data-testid={`button-contact-${contact.id}`}
                          >
                            <div className={`w-6 h-6 rounded-full ${contact.color} flex items-center justify-center`}>
                              <span className="text-[9px] font-bold text-white">{contact.avatar}</span>
                            </div>
                            <span className={`text-[10px] font-semibold ${isSel ? 'text-[#4A9BD9]' : 'text-gray-600'}`}>{contact.name}</span>
                            {isSel && <Check className="w-3 h-3 text-[#4A9BD9] ml-0.5" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => setStep(1)}
                  disabled={!canSend}
                  className="w-full mt-3 shrink-0 bg-[#4A9BD9] hover:bg-[#3A8BC8] text-white rounded-xl font-bold"
                  data-testid="button-contacts-continue"
                >
                  Continua {canSend && `(${selectedGroup ? groups.find(g=>g.id===selectedGroup)?.name : `${selectedContacts.length} amici`})`}
                </Button>
              </motion.div>

            ) : step === 1 ? (
              /* ── STEP 1: Cosa fare ── */
              <motion.div
                key="step1"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25 }}
                className="flex flex-col h-full overflow-hidden"
              >
                <h3 className="font-bold text-base text-center mb-1 shrink-0">Cosa vuoi fare?</h3>
                <p className="text-xs text-muted-foreground text-center mb-3 shrink-0">Scegli il tipo di attività da proporre</p>
                <div className="relative mb-3 shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={activitySearch}
                    onChange={e => setActivitySearch(e.target.value)}
                    placeholder="Cerca attività..."
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-[#4A9BD9]/50 focus:ring-1 focus:ring-[#4A9BD9]/20 transition-colors"
                    data-testid="input-activity-search"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 overflow-y-auto pr-1 flex-1 min-h-0 content-start">
                  {activities
                    .filter(a => a.label.toLowerCase().includes(activitySearch.toLowerCase()))
                    .map(activity => {
                      const Icon = activity.icon;
                      const isSelected = selectedActivity === activity.id;
                      return (
                        <button
                          key={activity.id}
                          onClick={() => handleActivitySelect(activity.id)}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 ${
                            isSelected ? 'border-[#4A9BD9] bg-[#4A9BD9]/5' : 'border-gray-200 bg-white hover:border-[#4A9BD9]/40 hover:shadow-md'
                          }`}
                          data-testid={`button-activity-${activity.id}`}
                        >
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${activity.color.split(' ').slice(0,2).join(' ')}`}>
                            <Icon className={`w-4 h-4 ${activity.color.split(' ')[1]}`} />
                          </div>
                          <span className="text-[10px] font-bold leading-tight text-center">{activity.label}</span>
                        </button>
                      );
                    })}
                  {activities.filter(a => a.label.toLowerCase().includes(activitySearch.toLowerCase())).length === 0 && (
                    <div className="col-span-2 text-center py-4 text-xs text-muted-foreground">Nessuna attività trovata</div>
                  )}
                </div>
                <Button
                  onClick={() => setStep(2)}
                  disabled={!selectedActivity}
                  className="w-full mt-3 shrink-0 bg-[#4A9BD9] hover:bg-[#3A8BC8] text-white rounded-xl font-bold"
                  data-testid="button-activity-continue"
                >
                  Continua {selectedActivity && `— ${activityLabel}`}
                </Button>
              </motion.div>

            ) : step === 2 ? (
              /* ── STEP 2: Quando ── */
              <motion.div
                key="step2"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25 }}
                className="flex flex-col h-full overflow-hidden"
              >
                <h3 className="font-bold text-base text-center mb-1 shrink-0">Quando vi vedete?</h3>
                <p className="text-xs text-muted-foreground text-center mb-3 shrink-0">{activityLabel}</p>

                <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 min-h-0">
                  <div className="bg-white rounded-xl border border-gray-200 p-3">
                    <div className="flex items-center gap-2 mb-2.5">
                      <CalendarCheck className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Giorno</span>
                      <span className="text-[8px] text-muted-foreground ml-1">(selezionabili più di uno)</span>
                    </div>
                    <div className="flex gap-1.5">
                      {upcomingDates.map(date => (
                        <button
                          key={date.value}
                          onClick={() => toggleDate(date.value)}
                          className={`flex-1 flex flex-col items-center py-2 rounded-lg border transition-all ${
                            selectedDates.includes(date.value) ? 'border-[#4A9BD9] bg-[#4A9BD9]/5' : 'border-gray-200 hover:border-[#4A9BD9]/30'
                          }`}
                          data-testid={`button-date-${date.value}`}
                        >
                          {date.label && <span className="text-[7px] font-bold text-[#4A9BD9] uppercase">{date.label}</span>}
                          <span className={`text-[10px] font-bold ${selectedDates.includes(date.value) ? 'text-[#4A9BD9]' : 'text-gray-600'}`}>{date.day}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 p-3">
                    <div className="flex items-center gap-2 mb-2.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Orario</span>
                      <span className="text-[8px] text-muted-foreground ml-1">(selezionabili più di uno)</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {timeSlots.map(time => (
                        <button
                          key={time}
                          onClick={() => toggleTime(time)}
                          className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                            selectedTimes.includes(time) ? 'border-[#4A9BD9] bg-[#4A9BD9]/5 text-[#4A9BD9]' : 'border-gray-200 text-gray-600 hover:border-[#4A9BD9]/30'
                          }`}
                          data-testid={`button-time-${time.replace(':', '')}`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => setStep(3)}
                  disabled={!canWhen}
                  className="w-full mt-3 shrink-0 bg-[#4A9BD9] hover:bg-[#3A8BC8] text-white rounded-xl font-bold"
                  data-testid="button-confirm-when"
                >
                  <CalendarCheck className="w-4 h-4 mr-2" />
                  Continua
                </Button>
              </motion.div>

            ) : (
              /* ── STEP 3: Dove (venue) ── */
              <motion.div
                key="step3"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25 }}
                className="flex flex-col h-full overflow-hidden"
              >
                <h3 className="font-bold text-base text-center mb-1 shrink-0">Dove andate?</h3>
                <p className="text-xs text-muted-foreground text-center mb-2 shrink-0">
                  {activityLabel} — seleziona uno o più luoghi da votare
                </p>

                <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl px-2.5 py-1.5 mb-2.5 shrink-0">
                  <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                  <span className="text-[9px] text-amber-700 font-medium leading-tight">
                    Suggerimenti scelti in base alle preferenze di <span className="font-bold">{groupLabel}</span>
                  </span>
                </div>

                <div className="space-y-2 overflow-y-auto pr-1 flex-1 min-h-0">
                  {(venuesByActivity[selectedActivity || ""] || []).slice(0, 3).map((venue, i) => {
                    const isSelected = selectedVenues.some(v => v.name === venue.name);
                    return (
                      <button
                        key={i}
                        onClick={() => toggleVenue(venue)}
                        className={`w-full text-left p-3 rounded-xl border transition-all duration-200 ${
                          venue.aiRecommended && !isSelected
                            ? 'border-amber-300 bg-amber-50/60 hover:border-amber-400 hover:shadow-sm'
                            : isSelected
                            ? 'border-[#4A9BD9] bg-[#4A9BD9]/5'
                            : 'border-gray-200 bg-white hover:border-[#4A9BD9]/40 hover:shadow-sm'
                        }`}
                        data-testid={`button-venue-${i}`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                            isSelected ? 'border-[#4A9BD9] bg-[#4A9BD9]' : venue.aiRecommended ? 'border-amber-400' : 'border-gray-300'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold truncate">{venue.name}</span>
                              {venue.aiRecommended && (
                                <span className="flex items-center gap-0.5 text-[7px] font-bold uppercase bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full shrink-0 border border-amber-200">
                                  <Sparkles className="w-2 h-2" />
                                  Consigliato per te
                                </span>
                              )}
                              {venue.promoted && !venue.aiRecommended && (
                                <span className="text-[7px] font-bold uppercase bg-[#4A9BD9]/10 text-[#4A9BD9] px-1.5 py-0.5 rounded-full shrink-0">Partner</span>
                              )}
                            </div>
                            {venue.aiRecommended && venue.aiReason && (
                              <p className="text-[8px] text-amber-600 mt-0.5 font-medium">{venue.aiReason}</p>
                            )}
                            <div className="flex items-center gap-2 mt-0.5">
                              <div className="flex items-center gap-0.5">
                                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                <span className="text-[10px] text-gray-500">{venue.rating}</span>
                              </div>
                              <span className="text-[10px] text-gray-400">{venue.distance}</span>
                            </div>
                            {venue.discount && (
                              <div className="flex items-center gap-1 mt-1">
                                <Percent className="w-3 h-3 text-green-600" />
                                <span className="text-[10px] font-semibold text-green-600">{venue.discount}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <Button
                  onClick={handleSend}
                  disabled={selectedVenues.length === 0}
                  className="w-full mt-3 shrink-0 bg-[#4A9BD9] hover:bg-[#3A8BC8] text-white rounded-xl font-bold"
                  data-testid="button-send-proposal"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Invia Proposta {selectedVenues.length > 0 && `(${selectedVenues.length} ${selectedVenues.length === 1 ? 'luogo' : 'luoghi'})`}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
