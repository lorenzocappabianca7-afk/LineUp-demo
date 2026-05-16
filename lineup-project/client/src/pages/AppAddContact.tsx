import { useSearch, useLocation } from "wouter";
import { UserPlus, Download } from "lucide-react";
import { getAvatarColor, getInitials } from "@/lib/appUtils";

export default function AppAddContact() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const firstName = params.get("name") || "";
  const lastName = params.get("surname") || "";
  const email = params.get("email") || "";
  const user = params.get("user") || `${firstName} ${lastName}`.trim() || "Utente";
  const [, navigate] = useLocation();
  const avatarColor = getAvatarColor(user);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-primary to-primary/75" />

        <div className="px-8 pt-8 pb-10 flex flex-col items-center text-center">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-lg mb-4"
            style={{ backgroundColor: avatarColor }}
          >
            {getInitials(user)}
          </div>

          <p className="text-xl font-bold text-gray-900 mb-1">{user}</p>
          {email && <p className="text-xs text-gray-400 mb-1">{email}</p>}
          <p className="text-sm text-gray-400 mb-8">vuole connettersi con te su LineUp</p>

          <div className="mb-6 w-full rounded-2xl bg-gradient-to-br from-primary to-primary/75 px-5 py-5">
            <div className="mb-2 flex items-center justify-center gap-2.5">
              <UserPlus size={20} className="text-primary-foreground" strokeWidth={2.5} />
              <p className="text-lg font-bold text-primary-foreground">Aggiungi come amico</p>
            </div>
            <p className="text-sm text-primary-foreground/80">
              Apri LineUp sul tuo dispositivo per aggiungere <strong className="text-primary-foreground">{user}</strong> ai tuoi contatti.
            </p>
          </div>

          <button
            onClick={() => navigate("/")}
            className="w-full py-3.5 rounded-xl font-bold text-white mb-3"
            style={{ background: "linear-gradient(135deg, #1a1a1a, #333)" }}
          >
            Apri LineUp
          </button>

          <p className="text-[11px] text-gray-300 font-medium tracking-wide">LineUp · Social Calendar</p>
        </div>
      </div>
    </div>
  );
}
