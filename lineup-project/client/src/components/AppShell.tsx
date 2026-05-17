import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";
import { MessageCircle, CalendarDays, User, Settings } from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [location] = useLocation();
  const hideBottomNav = location.startsWith("/prova-pianifica");

  const tabs = [
    { path: "/impostazioni", icon: Settings,       label: "Impostazioni" },
    { path: "/",             icon: CalendarDays,    label: "Home"         },
    { path: "/chat",         icon: MessageCircle,   label: "Chat"         },
    { path: "/profile",      icon: User,            label: "Profilo"      },
  ];

  const isActive = (path: string) => {
    if (path === "/") return location === "/";
    if (path === "/chat") return location.startsWith("/chat") || location.endsWith("/chat");
    return location.startsWith(path);
  };

  return (
    <div className="flex justify-center items-stretch h-screen bg-background">
      <div className="relative flex flex-col w-full max-w-sm h-screen bg-background overflow-hidden shadow-2xl">

        {/* Content */}
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col",
            hideBottomNav
              ? "overflow-hidden"
              : "overflow-y-auto overscroll-y-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-webkit-overflow-scrolling:touch] pb-14",
          )}
        >
          {children}
        </div>

        {/* Bottom Navigation */}
        {!hideBottomNav && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm z-50">
          <div className="bg-card border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
            <div className="flex items-center justify-around px-2 pt-1.5 pb-2">
              {tabs.map((tab) => {
                const active = isActive(tab.path);
                return (
                  <Link
                    key={tab.path}
                    href={tab.path}
                    data-testid={`nav-${tab.label.toLowerCase()}`}
                    className="flex items-center justify-center rounded-xl p-2 transition-transform duration-200 ease-out active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100"
                  >
                    <tab.icon
                      size={21}
                      className={`transition-[color,stroke-width] duration-200 ease-out motion-reduce:transition-none ${
                        active ? "text-primary" : "text-muted-foreground"
                      }`}
                      strokeWidth={active ? 2.5 : 1.8}
                    />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
