import { Calendar, Sparkles, Camera, MapPin } from "lucide-react";

const features = [
  { icon: <Calendar className="w-5 h-5 md:w-6 md:h-6" />, title: "Storie nel Calendario", description: "Vedi cosa fanno i tuoi amici direttamente sul calendario. Ogni giorno è una finestra sulle loro esperienze.", color: "bg-[#4A9BD9]" },
  { icon: <Sparkles className="w-5 h-5 md:w-6 md:h-6" />, title: "Chat Calendarizzate", description: "Basta messaggi persi. Ogni giorno ha la sua chat dedicata per un'organizzazione chirurgica e pulita.", color: "bg-orange-500" },
  { icon: <Camera className="w-5 h-5 md:w-6 md:h-6" />, title: "Suggerimenti intelligenti", description: "Scegli tra le attività proposte dall'app e sfrutta gli sconti esclusivi per i gruppi LineUp.", color: "bg-emerald-500" },
  { icon: <MapPin className="w-5 h-5 md:w-6 md:h-6" />, title: "Organizzazione Pulita", description: "Niente più scroll infiniti. Accedi alle info dell'attività direttamente dalla data corrispondente.", color: "bg-violet-500" },
];

export function FeatureSection() {
  return (
    <section id="features" className="py-16 md:py-24 bg-white dark:bg-zinc-900">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 md:mb-16">
          <span className="inline-block px-3 md:px-4 py-1 md:py-1.5 rounded-full bg-[#7CB9E8]/10 text-[#4A9BD9] text-xs md:text-sm font-bold uppercase tracking-wider mb-3 md:mb-4">Funzionalità</span>
          <h2 className="text-2xl md:text-4xl font-bold font-display">Tutto quello che ti serve, in <span className="text-[#4A9BD9]">un'unica app</span></h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-8">
          {features.map((feature, idx) => (
            <div key={idx} className="p-4 md:p-8 rounded-2xl md:rounded-3xl bg-gray-50 border border-gray-100 hover:shadow-md transition-shadow duration-300">
              <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl ${feature.color} flex items-center justify-center text-white shadow-lg mb-3 md:mb-6`}>{feature.icon}</div>
              <h3 className="text-sm md:text-xl font-bold font-display mb-1.5 md:mb-3">{feature.title}</h3>
              <p className="text-xs md:text-base text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
