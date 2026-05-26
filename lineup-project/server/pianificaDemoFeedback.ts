import nodemailer from "nodemailer";
import { LINEUP_OFFICIAL_EMAIL } from "@shared/lineupContact";
import { logAiPipelineSummary } from "./aiLog";

const SMTP_TIMEOUT_MS = 8_000;

type FeedbackMailTransporter = ReturnType<typeof nodemailer.createTransport>;

let cachedFeedbackTransporter: FeedbackMailTransporter | null = null;
let cachedFeedbackTransportKey = "";

function getFeedbackMailTransporter(
  host: string,
  port: number,
  user: string,
  pass: string,
): FeedbackMailTransporter {
  const key = `${host}:${port}:${user}`;
  if (cachedFeedbackTransporter && cachedFeedbackTransportKey === key) {
    return cachedFeedbackTransporter;
  }
  cachedFeedbackTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: SMTP_TIMEOUT_MS,
    greetingTimeout: SMTP_TIMEOUT_MS,
    socketTimeout: SMTP_TIMEOUT_MS,
  });
  cachedFeedbackTransportKey = key;
  return cachedFeedbackTransporter;
}

export const PIANIFICA_DEMO_FEEDBACK_RECIPIENTS = [LINEUP_OFFICIAL_EMAIL] as const;

export type PianificaDemoFeedbackPayload = {
  name: string;
  email: string;
  birthYear: number;
  rating: number;
  comment?: string;
};

function getFeedbackRecipients(): string[] {
  const fromEnv = process.env.PIANIFICA_DEMO_FEEDBACK_TO?.trim();
  const extra = fromEnv
    ? fromEnv
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const merged = new Set<string>([...PIANIFICA_DEMO_FEEDBACK_RECIPIENTS, ...extra]);
  return [...merged];
}

function buildMailContent(payload: PianificaDemoFeedbackPayload) {
  const stars = "★".repeat(payload.rating) + "☆".repeat(5 - payload.rating);
  const commentBlock = payload.comment?.trim()
    ? payload.comment.trim()
    : "(nessun commento)";
  const subject = `[LineUp Demo] Feedback ${payload.rating}/5 — ${payload.name}`;
  const text = [
    "Nuovo feedback dalla prova Pianifica (QR demo)",
    "",
    `Nome: ${payload.name}`,
    `Email: ${payload.email}`,
    `Anno di nascita: ${payload.birthYear}`,
    `Voto: ${payload.rating}/5 ${stars}`,
    "",
    "Suggerimenti / consigli:",
    commentBlock,
    "",
    `Inviato il: ${new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome" })}`,
  ].join("\n");
  const html = `
    <div style="font-family:system-ui,sans-serif;color:#111;max-width:520px">
      <h2 style="color:#37b6bd;margin:0 0 12px">Feedback demo Pianifica</h2>
      <p><strong>Nome:</strong> ${escapeHtml(payload.name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(payload.email)}</p>
      <p><strong>Anno di nascita:</strong> ${payload.birthYear}</p>
      <p><strong>Voto:</strong> ${payload.rating}/5 <span style="color:#f59e0b">${stars}</span></p>
      <p><strong>Suggerimenti / consigli:</strong></p>
      <p style="white-space:pre-wrap;background:#f0fbfc;border:1px solid #37b6bd;border-radius:12px;padding:12px">${escapeHtml(commentBlock)}</p>
      <p style="font-size:12px;color:#666">${escapeHtml(new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome" }))}</p>
    </div>
  `;
  return { subject, text, html };
}

function buildThankYouMailContent(payload: PianificaDemoFeedbackPayload) {
  const firstName = payload.name.trim().split(/\s+/)[0] || payload.name.trim() || "ciao";
  const subject = "Grazie per aver provato LineUp";
  const text = [
    `Ciao ${firstName},`,
    "",
    "Grazie di cuore per aver provato la demo di LineUp e per aver condiviso il tuo feedback con noi.",
    "",
    `Il tuo voto (${payload.rating}/5) e i tuoi suggerimenti ci aiutano a capire cosa funziona già bene e cosa possiamo migliorare, passo dopo passo, per rendere più semplice organizzare uscite ed eventi con gli amici.`,
    "",
    "Come hai autorizzato inviando il feedback, ti terremo aggiornato via email sulle novità più importanti di LineUp — sempre da questo indirizzo ufficiale:",
    LINEUP_OFFICIAL_EMAIL,
    "",
    "Nel frattempo, grazie ancora per il tempo che ci hai dedicato: costruiamo LineUp insieme a chi la userà.",
    "",
    "A presto,",
    "Il team LineUp",
  ].join("\n");
  const html = `
    <div style="font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:#1f2937;max-width:520px;line-height:1.55">
      <div style="background:linear-gradient(135deg,#37b6bd 0%,#2a9aa1 100%);border-radius:16px 16px 0 0;padding:28px 24px;color:#fff">
        <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;opacity:0.9">LineUp</p>
        <h1 style="margin:10px 0 0;font-size:22px;font-weight:800;line-height:1.3">Grazie, ${escapeHtml(firstName)}!</h1>
      </div>
      <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px;padding:24px">
        <p style="margin:0 0 14px">Grazie di cuore per aver provato la <strong>demo di LineUp</strong> e per aver condiviso il tuo feedback con noi.</p>
        <p style="margin:0 0 14px">Il tuo voto <strong>${payload.rating}/5</strong> e i tuoi suggerimenti ci aiutano a capire cosa funziona già bene e cosa possiamo migliorare, passo dopo passo, per rendere più semplice organizzare uscite ed eventi con gli amici.</p>
        <p style="margin:0 0 14px">Come hai autorizzato inviando il feedback, ti terremo aggiornato via email sulle novità più importanti di LineUp — sempre da <a href="mailto:${LINEUP_OFFICIAL_EMAIL}" style="color:#2a9aa1;font-weight:600">${LINEUP_OFFICIAL_EMAIL}</a>.</p>
        <p style="margin:0 0 14px">Grazie ancora per il tempo che ci hai dedicato: costruiamo LineUp insieme a chi la userà.</p>
        <p style="margin:24px 0 0;font-size:14px;color:#6b7280">A presto,<br><strong style="color:#111827">Il team LineUp</strong></p>
      </div>
    </div>
  `;
  return { subject, text, html };
}

function lineupMailFrom(): string {
  const raw = process.env.SMTP_FROM?.trim() || LINEUP_OFFICIAL_EMAIL;
  if (raw.includes("<")) return raw;
  return `LineUp <${raw}>`;
}

async function sendViaSmtp(options: {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
}): Promise<boolean> {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!host || !user || !pass) return false;
  try {
    const transporter = getFeedbackMailTransporter(host, port, user, pass);
    await transporter.sendMail({ from: lineupMailFrom(), ...options });
    return true;
  } catch (e) {
    console.warn("pianifica-demo SMTP send failed:", e);
    return false;
  }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Notifica admin + ringraziamento utente (opzionale SMTP). Il feedback è già su Postgres. */
export async function notifyPianificaDemoFeedbackByEmail(
  payload: PianificaDemoFeedbackPayload,
): Promise<{
  delivered: boolean;
  channel: "smtp" | "log";
  adminDelivered: boolean;
  thankYouDelivered: boolean;
}> {
  const adminMail = buildMailContent(payload);
  const thankYouMail = buildThankYouMailContent(payload);
  const recipients = getFeedbackRecipients();
  const adminDelivered = await sendViaSmtp({
    to: recipients.join(", "),
    replyTo: payload.email,
    subject: adminMail.subject,
    text: adminMail.text,
    html: adminMail.html,
  });

  const thankYouDelivered = await sendViaSmtp({
    to: payload.email,
    replyTo: LINEUP_OFFICIAL_EMAIL,
    subject: thankYouMail.subject,
    text: thankYouMail.text,
    html: thankYouMail.html,
  });

  if (adminDelivered || thankYouDelivered) {
    return {
      delivered: adminDelivered && thankYouDelivered,
      channel: "smtp",
      adminDelivered,
      thankYouDelivered,
    };
  }

  try {
    await logAiPipelineSummary({
      route: "POST /api/app/pianifica-demo/feedback [no-smtp]",
      lines: [
        `admin to: ${recipients.join(", ")}`,
        `thank-you to: ${payload.email}`,
        `name: ${payload.name}`,
        `rating: ${payload.rating}/5`,
        `comment: ${payload.comment?.trim() || "(vuoto)"}`,
        "— Configura SMTP_* con account lineuplf@gmail.com per invio reale.",
      ],
    });
  } catch (e) {
    console.warn("pianifica-demo feedback log failed:", e);
  }
  return { delivered: false, channel: "log", adminDelivered: false, thankYouDelivered: false };
}
