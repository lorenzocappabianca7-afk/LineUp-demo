import { Link } from "wouter";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

function LineUpLogo({ size = 36 }: { size?: number }) {
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

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-3 py-3 md:px-6 md:py-4">
      <div className="max-w-7xl mx-auto">
        <div className={`glass-card rounded-xl md:rounded-2xl px-3 md:px-6 py-2.5 md:py-3 flex items-center justify-between transition-all duration-500 ${scrolled ? 'shadow-xl bg-white/95 dark:bg-black/60' : 'shadow-lg'}`}>
          <Link href="/" className="flex items-center gap-2 md:gap-2.5 cursor-pointer">
            <LineUpLogo size={34} />
            <span className="font-extrabold font-display text-base md:text-lg text-black dark:text-white tracking-tight">LineUp</span>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground absolute left-1/2 -translate-x-1/2">
            <a href="#demo" className="nav-link-underline hover:text-primary transition-colors duration-200">Preview</a>
            <a href="#waitlist" className="nav-link-underline hover:text-primary transition-colors duration-200">Waitlist</a>
            <a href="#features" className="nav-link-underline hover:text-primary transition-colors duration-200">Features</a>
          </div>

          <Button variant="default" size="sm" className="rounded-lg md:rounded-xl font-semibold text-xs md:text-sm h-8 md:h-9 px-3 md:px-4 bg-black hover:bg-black/80 text-white" onClick={() => document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' })} data-testid="button-login">
            Log in
          </Button>
        </div>
      </div>
    </nav>
  );
}
