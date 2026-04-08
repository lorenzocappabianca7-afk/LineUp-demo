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
        <div className="h-1.5" style={{ background: "linear-gradient(135deg, #4A9BD9, #7CB9E8)" }} />

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

          <div
            className="w-full rounded-2xl px-5 py-5 mb-6"
            style={{ background: "linear-gradient(135deg, #4A9BD9 0%, #7CB9E8 100%)" }}
          >
            <div className="flex items-center justify-center gap-2.5 mb-2">
              <UserPlus size={20} className="text-white" strokeWidth={2.5} />
              <p className="text-white font-bold text-lg">Aggiungi come amico</p>
            </div>
            <p className="text-white/75 text-sm">
              Apri LineUp sul tuo dispositivo per aggiungere <strong className="text-white">{user}</strong> ai tuoi contatti.
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
