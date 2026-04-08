import { Instagram, Twitter, Linkedin } from "lucide-react";
import { Link } from "wouter";

function LineUpLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="9" fill="white" fillOpacity="0.08"/>
      <circle cx="9" cy="20" r="3.5" fill="#4A9BD9"/>
      <path d="M 5 28 Q 9 24 13 28" stroke="#4A9BD9" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <circle cx="20" cy="16" r="4.5" fill="white"/>
      <path d="M 15 28 Q 20 22 25 28" stroke="white" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
      <circle cx="31" cy="20" r="3.5" fill="#7CB9E8"/>
      <path d="M 27 28 Q 31 24 35 28" stroke="#7CB9E8" strokeWidth="2" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="bg-black text-white py-10 md:py-16">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-6 md:gap-8">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-3 md:mb-4">
              <LineUpLogo size={30} />
              <span className="text-lg md:text-xl font-bold font-display text-white">LineUp</span>
            </div>
            <p className="text-white/60 max-w-xs text-xs md:text-sm">L'organizzazione diventa social. Vivi le giornate, pianifica con facilità.</p>
          </div>
          <div className="flex gap-6 md:gap-8 text-xs md:text-sm font-medium text-white/60">
            <a href="#" className="hover:text-[#7CB9E8] transition-colors duration-200">Chi Siamo</a>
            <a href="#" className="hover:text-[#7CB9E8] transition-colors duration-200">Privacy</a>
            <a href="#" className="hover:text-[#7CB9E8] transition-colors duration-200">Termini</a>
          </div>
          <div className="flex gap-3 md:gap-4">
            {[{ icon: <Twitter className="w-4 h-4 md:w-5 md:h-5" />, l: "Twitter" }, { icon: <Instagram className="w-4 h-4 md:w-5 md:h-5" />, l: "Instagram" }, { icon: <Linkedin className="w-4 h-4 md:w-5 md:h-5" />, l: "LinkedIn" }].map((s) => (
              <a key={s.l} href="#" className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:bg-[#7CB9E8] hover:text-white transition-colors duration-200">{s.icon}</a>
            ))}
          </div>
        </div>
        <div className="mt-8 md:mt-12 pt-6 md:pt-8 border-t border-white/10 flex flex-wrap items-center justify-center gap-3 md:gap-4 text-xs md:text-sm text-white/40">
          <span>© {new Date().getFullYear()} LineUp Inc. Tutti i diritti riservati.</span>
          <Link href="/admin" className="hover:text-white transition-colors duration-200" data-testid="link-admin">Admin</Link>
          <Link href="/analytics" className="hover:text-white transition-colors duration-200" data-testid="link-analytics">Visite</Link>
        </div>
      </div>
    </footer>
  );
}
