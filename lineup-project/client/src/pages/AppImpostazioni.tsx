import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Bell, Type, HelpCircle, QrCode, ChevronRight, X,
  Palette, Moon, Globe, Shield, Info, ChevronDown, ChevronUp, Check,
  Megaphone, Trash2, Plus, Eye, Download,
  BookUser, UserPlus, Users, Phone, CheckCircle2
} from "lucide-react";
import {
  getCurrentUser, getAvatarColor, getInitials, CONTACTS,
  getMyContacts, addMyContact, removeMyContact, type MyContact,
} from "@/lib/appUtils";

const LS_FONT  = "lineup-font-size";
const LS_NOTIF = "lineup-notifications";
const LS_THEME = "lineup-chat-bg";
const LS_DARK  = "lineup-dark-mode";

const FONT_SIZES = [
  { key: "small",  label: "Piccolo",  px: "14px" },
  { key: "medium", label: "Normale",  px: "16px" },
  { key: "large",  label: "Grande",   px: "18px" },
];

const CHAT_BACKGROUNDS = [
  { key: "white",   label: "Bianco",     color: "#FFFFFF" },
  { key: "gray",    label: "Grigio chiaro", color: "#F3F4F6" },
  { key: "blue",    label: "Blu tenue",  color: "#EBF5FB" },
  { key: "sand",    label: "Sabbia",     color: "#FAF7F0" },
  { key: "dark",    label: "Scuro",      color: "#1A1A1A" },
];

function applyFontSize(px: string) {
  document.documentElement.style.setProperty("--app-font-size", px);
}

function QrSheet({ onClose, title, subtitle, qrData, footer }: {
  onClose: () => void;
  title: string;
  subtitle: string;
  qrData: string;
  footer?: React.ReactNode;
}) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrData)}&qzone=2&color=1a1a1a`;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-t-3xl px-6 pt-6 pb-20">
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
          <X size={16} className="text-gray-500" />
        </button>
        <h2 className="text-lg font-bold text-gray-900 mb-1">{title}</h2>
        <p className="text-sm text-gray-400 mb-5">{subtitle}</p>
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-white border-2 border-gray-100 rounded-2xl shadow-sm">
            <img src={qrUrl} alt="QR Code" width={190} height={190} className="rounded-xl" />
          </div>
        </div>
        {footer}
      </div>
    </div>
  );
}

function QrModal({ name, onClose }: { name: string; onClose: () => void }) {
  const [firstName, ...rest] = name.trim().split(" ");
  const surname = rest.join(" ");
  const emailGuess = `${name.trim().toLowerCase().replace(/\s+/g, ".")}@lineup.app`;
  const url = `${window.location.origin}/add-contact?user=${encodeURIComponent(name)}&name=${encodeURIComponent(firstName || name)}&surname=${encodeURIComponent(surname)}&email=${encodeURIComponent(emailGuess)}`;
  return (
    <QrSheet
      onClose={onClose}
      title="Il tuo codice amico"
      subtitle="Fai scansionare questo codice per aggiungerti su LineUp"
      qrData={url}
      footer={
        <div className="flex items-center justify-center gap-2 bg-gray-50 rounded-xl px-4 py-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ backgroundColor: getAvatarColor(name) }}>
            {getInitials(name)}
          </div>
          <p className="text-sm font-semibold text-gray-700">{name} su LineUp</p>
        </div>
      }
    />
  );
}

function PwaQrModal({ onClose }: { onClose: () => void }) {
  const url = window.location.origin;
  return (
    <QrSheet
      onClose={onClose}
      title="Scarica LineUp"
      subtitle="Inquadra il codice per aprire l'app e aggiungerla alla schermata home"
      qrData={url}
      footer={
        <div className="flex items-center justify-center gap-2 bg-gray-50 rounded-xl px-4 py-2.5">
          <p className="text-xs text-gray-500 font-medium">{url}</p>
        </div>
      }
    />
  );
}

function SettingsRow({
  icon, iconBg, iconColor, label, right, onClick, testId
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor?: string;
  label: string;
  right?: React.ReactNode;
  onClick?: () => void;
  testId?: string;
}) {
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 transition-colors text-left"
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <span className="flex-1 text-sm font-medium text-gray-900">{label}</span>
      {right ?? <ChevronRight size={15} className="text-gray-300" />}
    </button>
  );
}

/* ─── Preset palette per i banner ─── */
const BANNER_COLORS = [
  { label: "Blu",     value: "#8ABFE8" },
  { label: "Verde",   value: "#22C55E" },
  { label: "Arancio", value: "#F97316" },
  { label: "Rosso",   value: "#EF4444" },
  { label: "Viola",   value: "#8B5CF6" },
  { label: "Rosa",    value: "#EC4899" },
  { label: "Nero",    value: "#1A1A1A" },
  { label: "Ardesia", value: "#64748B" },
];

/* ─── PIN Pad numerico ─── */
const PIN_LENGTH = 8;

function PinModal({ onSuccess, onClose }: { onSuccess: (pin: string) => void; onClose: () => void }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const addDigit = (d: string) => {
    if (pin.length >= PIN_LENGTH || loading) return;
    const next = pin + d;
    setPin(next);
    setErr("");
    if (next.length === PIN_LENGTH) submit(next);
  };

  const delDigit = () => {
    if (loading) return;
    setPin(p => p.slice(0, -1));
    setErr("");
  };

  const submit = async (value: string) => {
    setLoading(true);
    try {
      await apiRequest("POST", "/api/banner/verify", {}, { "x-banner-pin": value });
      onSuccess(value);
    } catch {
      setErr("PIN errato");
      setShake(true);
      setTimeout(() => { setShake(false); setPin(""); }, 600);
    } finally {
      setLoading(false);
    }
  };

  const KEYS = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Sheet — contenuto nel rettangolo max-w-sm, sopra le tab */}
      <div className="relative w-full max-w-sm bg-white rounded-t-3xl pt-5 pb-20 px-6">
        {/* Handle + close */}
        <div className="flex items-center justify-between mb-4">
          <div className="w-8" />
          <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto" />
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X size={15} className="text-gray-500" />
          </button>
        </div>

        <p className="text-center text-base font-bold text-gray-900 mb-1">Accesso riservato</p>
        <p className="text-center text-xs text-gray-400 mb-5">Inserisci il PIN a 8 cifre</p>

        {/* Dot indicator */}
        <div className={`flex justify-center gap-3 mb-2 transition-transform ${shake ? "animate-[wiggle_0.4s_ease]" : ""}`}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full border-2 transition-colors ${
                i < pin.length
                  ? "bg-gray-900 border-gray-900"
                  : "bg-transparent border-gray-300"
              }`}
            />
          ))}
        </div>
        {err && <p className="text-center text-xs text-red-500 mb-2">{err}</p>}
        {!err && <div className="mb-2 h-4" />}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-2 max-w-[280px] mx-auto">
          {KEYS.map((k, i) => {
            if (!k) return <div key={i} />;
            const isBack = k === "⌫";
            return (
              <button
                key={k + i}
                onClick={() => isBack ? delDigit() : addDigit(k)}
                disabled={loading}
                className={`h-14 rounded-2xl text-xl font-semibold transition-colors active:scale-95 ${
                  isBack
                    ? "bg-gray-100 text-gray-500 text-base"
                    : "bg-gray-100 text-gray-900 active:bg-gray-200"
                } disabled:opacity-40`}
              >
                {isBack ? <span className="flex items-center justify-center w-full h-full text-lg">⌫</span> : k}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Banner Admin Panel ─── */
function BannerAdminPanel({ adminPw, onClose }: { adminPw: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [bgColor, setBgColor] = useState("#8ABFE8");
  const [preview, setPreview] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const { data: banners = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/app/banners"] });

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/app/banners", { title, subtitle, bgColor }, { "x-banner-pin": adminPw }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/app/banners"] });
      setTitle("");
      setSubtitle("");
      setBgColor("#8ABFE8");
      setPreview(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/app/banners/${id}`, undefined, { "x-banner-pin": adminPw }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/app/banners"] }),
  });

  return (
    <div className="fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-sm z-[60] bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-12 pb-4 border-b border-gray-100">
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
          <X size={16} className="text-gray-500" />
        </button>
        <h2 className="text-lg font-bold text-gray-900 flex-1">Gestione banner</h2>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/75">
          <Megaphone size={15} className="text-primary-foreground" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-5 space-y-6">

        {/* ── Crea nuovo banner ── */}
        <section>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Nuovo banner</p>
          <div className="bg-gray-50 rounded-2xl p-4 space-y-3 border border-gray-100">

            {/* Colore sfondo */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">Colore sfondo</p>
              <div className="flex flex-wrap gap-2 items-center">
                {BANNER_COLORS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setBgColor(c.value)}
                    className="w-8 h-8 rounded-full border-2 transition-transform active:scale-90"
                    style={{
                      backgroundColor: c.value,
                      borderColor: bgColor === c.value ? "#1a1a1a" : "transparent",
                      boxShadow: bgColor === c.value ? "0 0 0 2px white, 0 0 0 4px #1a1a1a" : "none",
                    }}
                    title={c.label}
                  />
                ))}
                <label className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer" title="Colore personalizzato">
                  <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="opacity-0 absolute w-0 h-0" />
                  <Plus size={14} className="text-gray-400" />
                </label>
              </div>
            </div>

            {/* Titolo */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1.5">Titolo</p>
              <textarea
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Es. Novità in arrivo su LineUp..."
                rows={2}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary resize-none bg-white"
              />
            </div>

            {/* Sottotitolo */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1.5">Sottotitolo</p>
              <input
                type="text"
                value={subtitle}
                onChange={e => setSubtitle(e.target.value)}
                placeholder="Es. Presto potrai invitare amici con un link..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary bg-white"
              />
            </div>

            {/* Preview toggle */}
            {title && (
              <button
                onClick={() => setPreview(v => !v)}
                className="flex items-center gap-1.5 text-xs text-primary font-semibold"
              >
                <Eye size={13} /> {preview ? "Nascondi" : "Anteprima"}
              </button>
            )}

            {/* Preview */}
            {preview && title && (
              <div className="rounded-2xl p-4" style={{ backgroundColor: bgColor }}>
                <p className="text-white font-bold text-sm leading-snug">{title}</p>
                {subtitle && <p className="text-white/80 text-xs mt-1">{subtitle}</p>}
              </div>
            )}

            {/* Pubblica */}
            <button
              onClick={() => createMutation.mutate()}
              disabled={!title || createMutation.isPending}
              className="w-full rounded-xl bg-gradient-to-br from-primary to-primary/75 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-40"
            >
              {createMutation.isPending ? "Pubblicazione..." : "Pubblica banner"}
            </button>
          </div>
        </section>

        {/* ── Banner attivi ── */}
        <section>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Banner attivi</p>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : banners.length === 0 ? (
            <div className="bg-gray-50 rounded-2xl px-4 py-8 text-center border border-gray-100">
              <p className="text-sm text-gray-400">Nessun banner pubblicato</p>
            </div>
          ) : (
            <div className="space-y-3">
              {banners.map((b: any) => (
                <div key={b.id} className="relative rounded-2xl p-4" style={{ backgroundColor: b.bgColor }}>
                  <p className="text-white font-bold text-sm leading-snug pr-8">{b.title}</p>
                  {b.subtitle && <p className="text-white/80 text-xs mt-1">{b.subtitle}</p>}

                  {confirmDelete === b.id ? (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => { deleteMutation.mutate(b.id); setConfirmDelete(null); }}
                        className="flex-1 py-1.5 rounded-lg bg-white/20 text-white text-xs font-bold"
                      >
                        Elimina
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="flex-1 py-1.5 rounded-lg bg-white/10 text-white/70 text-xs font-semibold"
                      >
                        Annulla
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(b.id)}
                      className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/20 flex items-center justify-center active:bg-white/30"
                    >
                      <Trash2 size={13} className="text-white" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/* ─── Contacts Section ─── */
const hasContactsApi = typeof navigator !== "undefined" && "contacts" in navigator;

function ContactsSection() {
  const [contacts, setContacts] = useState<MyContact[]>(getMyContacts);
  const [showAddForm, setShowAddForm] = useState(false);
  const [importing, setImporting] = useState(false);
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [expanded, setExpanded] = useState(true);

  const refresh = () => setContacts(getMyContacts());

  const handleImportFromPhone = async () => {
    if (!hasContactsApi) { setShowAddForm(true); return; }
    setImporting(true);
    try {
      // @ts-ignore — Contact Picker API
      const picked = await navigator.contacts.select(["name", "tel"], { multiple: true });
      let added = 0;
      for (const c of picked) {
        const name = (c.name?.[0] ?? "").trim();
        const phone = (c.tel?.[0] ?? "").trim();
        if (!name) continue;
        const existing = getMyContacts();
        const dup = existing.some(e => e.phone === phone || e.name.toLowerCase() === name.toLowerCase());
        if (!dup) { addMyContact({ name, phone, source: "rubrica" }); added++; }
      }
      refresh();
    } catch {
    } finally {
      setImporting(false);
    }
  };

  const handleAddManual = () => {
    const n = formName.trim();
    const p = formPhone.trim();
    if (!n) return;
    const existing = getMyContacts();
    const dup = existing.some(e => e.phone === p && p !== "" || e.name.toLowerCase() === n.toLowerCase());
    if (!dup) addMyContact({ name: n, phone: p, source: "manuale" });
    setFormName(""); setFormPhone(""); setShowAddForm(false);
    refresh();
  };

  const handleRemove = (id: string) => {
    removeMyContact(id);
    refresh();
  };

  const isOnLineup = (c: MyContact) =>
    CONTACTS.some(d => d.toLowerCase() === c.name.toLowerCase());

  return (
    <section>
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between mb-2 px-1"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide">I tuoi contatti</h2>
          {contacts.length > 0 && (
            <span className="text-[10px] font-bold text-white bg-primary rounded-full w-4 h-4 flex items-center justify-center">
              {contacts.length}
            </span>
          )}
        </div>
        {expanded
          ? <ChevronUp size={14} className="text-gray-400" />
          : <ChevronDown size={14} className="text-gray-400" />}
      </button>

      {expanded && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex gap-2 p-3 border-b border-gray-50">
            <button
              onClick={handleImportFromPhone}
              disabled={importing}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary active:opacity-80 transition-opacity disabled:opacity-60"
            >
              <BookUser size={15} className="text-white" />
              <span className="text-sm font-semibold text-white">
                {importing ? "Importando..." : "Importa da Rubrica"}
              </span>
            </button>
            <button
              onClick={() => setShowAddForm(v => !v)}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-gray-200 bg-white active:bg-gray-50 transition-colors"
            >
              <UserPlus size={15} className="text-gray-500" />
              <span className="text-sm font-semibold text-gray-600">Aggiungi</span>
            </button>
          </div>

          {showAddForm && (
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Nuovo contatto</p>
              <input
                type="text"
                placeholder="Nome *"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-primary transition-colors"
              />
              <input
                type="tel"
                placeholder="Numero di telefono (opzionale)"
                value={formPhone}
                onChange={e => setFormPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-primary transition-colors"
              />
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleAddManual}
                  disabled={!formName.trim()}
                  className="flex-1 py-2 rounded-xl bg-black text-white text-sm font-semibold disabled:opacity-40"
                >
                  Aggiungi
                </button>
                <button
                  onClick={() => { setShowAddForm(false); setFormName(""); setFormPhone(""); }}
                  className="px-4 py-2 rounded-xl bg-gray-100 text-gray-500 text-sm font-semibold"
                >
                  Annulla
                </button>
              </div>
            </div>
          )}

          {contacts.length === 0 && !showAddForm && (
            <div className="flex flex-col items-center py-8 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <Users size={20} className="text-gray-400" />
              </div>
              <p className="text-sm font-semibold text-gray-500">Nessun contatto ancora</p>
              <p className="text-xs text-gray-400 mt-1">Importa dalla rubrica o aggiungili a mano</p>
            </div>
          )}

          {contacts.length > 0 && (
            <div className="divide-y divide-gray-50">
              {contacts.map(c => {
                const onLineup = isOnLineup(c);
                return (
                  <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ backgroundColor: getAvatarColor(c.name) }}
                    >
                      {getInitials(c.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-gray-900 truncate">{c.name}</span>
                        {onLineup && (
                          <CheckCircle2 size={12} className="text-primary shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {c.phone && (
                          <span className="flex items-center gap-0.5 text-[11px] text-gray-400">
                            <Phone size={9} />
                            {c.phone}
                          </span>
                        )}
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          c.source === "rubrica"
                            ? "bg-primary/10 text-primary"
                            : "bg-gray-100 text-gray-400"
                        }`}>
                          {c.source === "rubrica" ? "rubrica" : "manuale"}
                        </span>
                        {onLineup ? (
                          <span className="text-[10px] font-semibold text-emerald-600">su LineUp</span>
                        ) : (
                          <span className="text-[10px] text-gray-300">non ancora su LineUp</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemove(c.id)}
                      className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center active:bg-red-50 transition-colors shrink-0"
                    >
                      <X size={12} className="text-gray-400" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default function AppImpostazioni() {
  const name     = getCurrentUser();
  const [fontKey, setFontKey]     = useState(localStorage.getItem(LS_FONT) ?? "medium");
  const [notif, setNotif]         = useState(localStorage.getItem(LS_NOTIF) !== "off");
  const [chatBg, setChatBg]       = useState(localStorage.getItem(LS_THEME) ?? "white");
  const [showQr, setShowQr]             = useState(false);
  const [showHelp, setShowHelp]         = useState(false);
  const [showFonts, setShowFonts]       = useState(false);
  const [showBg, setShowBg]             = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [adminPw, setAdminPw]           = useState<string | null>(null);
  const [showPwaQr, setShowPwaQr]       = useState(false);

  const cycleFont = (key: string) => {
    const f = FONT_SIZES.find(f => f.key === key)!;
    setFontKey(key);
    localStorage.setItem(LS_FONT, key);
    applyFontSize(f.px);
    setShowFonts(false);
  };

  const toggleNotif = () => {
    const v = !notif;
    setNotif(v);
    localStorage.setItem(LS_NOTIF, v ? "on" : "off");
  };

  const selectBg = (key: string) => {
    setChatBg(key);
    localStorage.setItem(LS_THEME, key);
    setShowBg(false);
  };

  const currentFont = FONT_SIZES.find(f => f.key === fontKey) ?? FONT_SIZES[1];
  const currentBg   = CHAT_BACKGROUNDS.find(b => b.key === chatBg) ?? CHAT_BACKGROUNDS[0];

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      {showPasswordModal && (
        <PinModal
          onSuccess={pw => { setAdminPw(pw); setShowPasswordModal(false); }}
          onClose={() => setShowPasswordModal(false)}
        />
      )}
      {adminPw && <BannerAdminPanel adminPw={adminPw} onClose={() => setAdminPw(null)} />}
      {showQr && <QrModal name={name} onClose={() => setShowQr(false)} />}
      {showPwaQr && <PwaQrModal onClose={() => setShowPwaQr(false)} />}

      {/* ─── Header ─── */}
      <div className="bg-white pt-12 pb-5 px-5 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Impostazioni</h1>
        <p className="text-sm text-gray-400 mt-0.5">Personalizza la tua esperienza</p>
      </div>

      <div className="flex-1 px-4 py-5 space-y-5 pb-8">

        {/* ─── Notifiche & Accessibilità ─── */}
        <section>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 px-1">Generali</h2>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">

            <SettingsRow
              testId="button-notifications"
              icon={<Bell size={17} className="text-amber-500" />}
              iconBg="bg-amber-50"
              label="Notifiche"
              onClick={toggleNotif}
              right={
                <div className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${notif ? "bg-primary" : "bg-gray-200"}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${notif ? "translate-x-5" : "translate-x-0"}`} />
                </div>
              }
            />

            <SettingsRow
              testId="button-font-size"
              icon={<Type size={17} className="text-purple-600" />}
              iconBg="bg-purple-50"
              label="Dimensione caratteri"
              onClick={() => setShowFonts(v => !v)}
              right={
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-gray-400 font-medium">{currentFont.label}</span>
                  {showFonts ? <ChevronUp size={15} className="text-gray-300" /> : <ChevronDown size={15} className="text-gray-300" />}
                </div>
              }
            />
            {showFonts && (
              <div className="px-4 py-3 space-y-2">
                {FONT_SIZES.map(f => (
                  <button
                    key={f.key}
                    onClick={() => cycleFont(f.key)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-colors ${
                      fontKey === f.key ? "border-primary bg-primary/10" : "border-gray-100 bg-gray-50"
                    }`}
                  >
                    <span className={`text-sm font-medium ${fontKey === f.key ? "text-primary" : "text-gray-700"}`}
                      style={{ fontSize: f.px }}>
                      {f.label}
                    </span>
                    {fontKey === f.key && <Check size={15} className="text-primary" />}
                  </button>
                ))}
              </div>
            )}

            <SettingsRow
              testId="button-language"
              icon={<Globe size={17} className="text-emerald-600" />}
              iconBg="bg-emerald-50"
              label="Lingua"
              right={<span className="text-sm text-gray-400 font-medium">Italiano</span>}
            />

          </div>
        </section>

        {/* ─── Aspetto ─── */}
        <section>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 px-1">Aspetto</h2>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">

            <SettingsRow
              testId="button-chat-bg"
              icon={<Palette size={17} className="text-rose-500" />}
              iconBg="bg-rose-50"
              label="Sfondo chat"
              onClick={() => setShowBg(v => !v)}
              right={
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-5 h-5 rounded-full border border-gray-200 shrink-0"
                    style={{ backgroundColor: currentBg.color }}
                  />
                  {showBg ? <ChevronUp size={15} className="text-gray-300" /> : <ChevronDown size={15} className="text-gray-300" />}
                </div>
              }
            />
            {showBg && (
              <div className="px-4 py-3">
                <div className="grid grid-cols-5 gap-2">
                  {CHAT_BACKGROUNDS.map(bg => (
                    <button
                      key={bg.key}
                      onClick={() => selectBg(bg.key)}
                      className="flex flex-col items-center gap-1"
                    >
                      <div
                        className={`w-10 h-10 rounded-xl border-2 transition-all ${
                          chatBg === bg.key ? "border-primary scale-110" : "border-gray-200"
                        }`}
                        style={{ backgroundColor: bg.color }}
                      />
                      <span className={`text-[9px] font-medium ${chatBg === bg.key ? "text-primary" : "text-gray-400"}`}>
                        {bg.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <SettingsRow
              testId="button-dark-mode"
              icon={<Moon size={17} className="text-indigo-500" />}
              iconBg="bg-indigo-50"
              label="Modalità scura"
              right={<span className="text-xs text-gray-300 font-medium">Presto</span>}
            />

          </div>
        </section>

        {/* ─── Privacy & Sicurezza ─── */}
        <section>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 px-1">Privacy</h2>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
            <SettingsRow
              testId="button-privacy"
              icon={<Shield size={17} className="text-teal-600" />}
              iconBg="bg-teal-50"
              label="Privacy e termini"
            />
          </div>
        </section>

        {/* ─── Assistenza & Info ─── */}
        <section>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 px-1">Supporto</h2>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">

            <SettingsRow
              testId="button-help"
              icon={<HelpCircle size={17} className="text-blue-500" />}
              iconBg="bg-blue-50"
              label="Assistenza"
              onClick={() => setShowHelp(v => !v)}
              right={showHelp ? <ChevronUp size={15} className="text-gray-300" /> : <ChevronDown size={15} className="text-gray-300" />}
            />
            {showHelp && (
              <div className="px-4 py-3 bg-blue-50">
                <p className="text-xs text-blue-700 font-medium mb-1">Hai bisogno di aiuto?</p>
                <p className="text-xs text-blue-600">Scrivi a support@lineup.app oppure visita il nostro sito per le FAQ.</p>
              </div>
            )}

            <SettingsRow
              testId="button-qr-code"
              icon={<QrCode size={17} className="text-primary" />}
              iconBg="bg-primary/10"
              label="Codice amico"
              onClick={() => setShowQr(true)}
            />
            <SettingsRow
              testId="button-pwa-qr"
              icon={<Download size={17} className="text-emerald-600" />}
              iconBg="bg-emerald-50"
              label="Scarica l'app"
              onClick={() => setShowPwaQr(true)}
            />

          </div>
        </section>

        {/* ─── Contatti ─── */}
        <ContactsSection />

        {/* ─── App info ─── */}
        <section>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                <Info size={17} className="text-gray-400" />
              </div>
              <span className="flex-1 text-sm font-medium text-gray-700">Versione</span>
              <span className="text-sm text-gray-400">1.0.0</span>
            </div>
          </div>
        </section>

        {/* ─── Accesso admin nascosto ─── */}
        <div className="flex justify-center pt-2 pb-6">
          <button
            data-testid="button-admin-entry"
            onClick={() => setShowPasswordModal(true)}
            className="text-[11px] text-gray-300 font-medium tracking-wide"
          >
            LineUp · Dev
          </button>
        </div>
      </div>
    </div>
  );
}
