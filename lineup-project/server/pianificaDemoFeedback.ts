import nodemailer from "nodemailer";
import { LINEUP_OFFICIAL_EMAIL } from "@shared/lineupContact";
import { logAiPipelineSummary } from "./aiLog";

const SMTP_TIMEOUT_MS = 8_000;

type FeedbackMailTransporter = ReturnType<typeof nodemailer.createTransport>;

let cachedFeedbackTransporter: FeedbackMailTransporter | null = null;
let cachedFeedbackTransportKey = "";

/** Gmail app password: spazi/newline dalla copia vanno rimossi. */
export function normalizeSmtpPass(raw: string): string {
  return raw.replace(/\s+/g, "").trim();
}

function getSmtpConfig(): { host: string; port: number; user: string; pass: string } | null {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const passRaw = process.env.SMTP_PASS?.trim();
  if (!host || !user || !passRaw) return null;
  const pass = normalizeSmtpPass(passRaw);
  if (!pass) return null;
  const port = Number(process.env.SMTP_PORT ?? "587");
  return { host, port, user, pass };
}

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
    requireTLS: port === 587,
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

function lineupMailFrom(smtpUser: string): string {
  const raw = process.env.SMTP_FROM?.trim();
  if (raw?.includes("<")) return raw;
  const address = raw || smtpUser || LINEUP_OFFICIAL_EMAIL;
  return `LineUp <${address}>`;
}

function resendMailFrom(): string {
  return process.env.RESEND_FROM?.trim() || `LineUp <${LINEUP_OFFICIAL_EMAIL}>`;
}

function getResendApiKey(): string | null {
  const key = process.env.RESEND_API_KEY?.trim();
  return key || null;
}

const RENDER_SMTP_BLOCKED_HINT =
  "Su Render piano gratuito le porte SMTP (587/465) sono bloccate → Connection timeout. Usa RESEND_API_KEY (HTTPS) oppure passa al piano Render a pagamento per Gmail SMTP.";

async function sendViaResend(options: {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = getResendApiKey();
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY non impostata" };

  const toList = options.to
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (toList.length === 0) return { ok: false, error: "Destinatario mancante" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: resendMailFrom(),
        to: toList,
        subject: options.subject,
        html: options.html,
        text: options.text,
        ...(options.replyTo ? { reply_to: options.replyTo } : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const msg = `Resend ${res.status}${body ? `: ${body.slice(0, 280)}` : ""}`;
      console.error(`[pianifica-demo] ${msg}`);
      return { ok: false, error: msg };
    }
    return { ok: true };
  } catch (e) {
    const msg = smtpErrorMessage(e);
    console.error(`[pianifica-demo] Resend send failed (to=${options.to}):`, msg);
    return { ok: false, error: msg };
  }
}

function smtpErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

async function sendViaSmtp(
  cfg: { host: string; port: number; user: string; pass: string },
  options: {
    to: string;
    subject: string;
    text: string;
    html: string;
    replyTo?: string;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const transporter = getFeedbackMailTransporter(cfg.host, cfg.port, cfg.user, cfg.pass);
    await transporter.sendMail({ from: lineupMailFrom(cfg.user), ...options });
    return { ok: true };
  } catch (e) {
    const msg = smtpErrorMessage(e);
    console.error(`[pianifica-demo] SMTP send failed (to=${options.to}):`, msg);
    return { ok: false, error: msg };
  }
}

/** Diagnostica email demo (admin): Resend (consigliato su Render free) o SMTP. */
export async function testPianificaDemoSmtp(sendProbeTo?: string): Promise<{
  configured: boolean;
  channel?: "resend" | "smtp";
  verifyOk: boolean;
  probeSent: boolean;
  error?: string;
  hint?: string;
}> {
  const resendKey = getResendApiKey();
  if (resendKey) {
    if (!sendProbeTo?.trim()) {
      return { configured: true, channel: "resend", verifyOk: true, probeSent: false };
    }
    const probe = await sendViaResend({
      to: sendProbeTo.trim(),
      subject: "[LineUp] Test email demo (Resend)",
      text: "Se leggi questa mail, Resend su Render funziona.",
      html: "<p>Se leggi questa mail, <strong>Resend</strong> su Render funziona.</p>",
    });
    if (!probe.ok) {
      return {
        configured: true,
        channel: "resend",
        verifyOk: false,
        probeSent: false,
        error: probe.error,
        hint:
          "Su Resend verifica il dominio o il mittente in RESEND_FROM. Per test rapido: RESEND_FROM=LineUp <onboarding@resend.dev>",
      };
    }
    return { configured: true, channel: "resend", verifyOk: true, probeSent: true };
  }

  const cfg = getSmtpConfig();
  if (!cfg) {
    return {
      configured: false,
      verifyOk: false,
      probeSent: false,
      hint:
        "Render free blocca SMTP. Aggiungi RESEND_API_KEY (resend.com) oppure SMTP_* solo su piano Render a pagamento.",
    };
  }
  try {
    const transporter = getFeedbackMailTransporter(cfg.host, cfg.port, cfg.user, cfg.pass);
    await transporter.verify();
    if (!sendProbeTo?.trim()) {
      return { configured: true, channel: "smtp", verifyOk: true, probeSent: false };
    }
    const probe = await sendViaSmtp(cfg, {
      to: sendProbeTo.trim(),
      subject: "[LineUp] Test SMTP demo",
      text: "Se leggi questa mail, SMTP su Render funziona.",
      html: "<p>Se leggi questa mail, <strong>SMTP su Render</strong> funziona.</p>",
    });
    if (!probe.ok) {
      const hint = probe.error.includes("timeout")
        ? RENDER_SMTP_BLOCKED_HINT
        : "Controlla SMTP_FROM e che SMTP_USER sia lineuplf@gmail.com.";
      return {
        configured: true,
        channel: "smtp",
        verifyOk: true,
        probeSent: false,
        error: probe.error,
        hint,
      };
    }
    return { configured: true, channel: "smtp", verifyOk: true, probeSent: true };
  } catch (e) {
    const msg = smtpErrorMessage(e);
    console.error("[pianifica-demo] SMTP verify failed:", msg);
    const hint = /timeout/i.test(msg)
      ? RENDER_SMTP_BLOCKED_HINT
      : "Password per le app errata o SMTP_USER diverso dall'account Google della password.";
    return {
      configured: true,
      channel: "smtp",
      verifyOk: false,
      probeSent: false,
      error: msg,
      hint,
    };
  }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type DemoEmailChannel = "resend" | "smtp" | "log";

async function sendDemoMailPair(
  send: (options: {
    to: string;
    subject: string;
    text: string;
    html: string;
    replyTo?: string;
  }) => Promise<{ ok: true } | { ok: false; error: string }>,
  payload: PianificaDemoFeedbackPayload,
  recipients: string[],
): Promise<{
  adminDelivered: boolean;
  thankYouDelivered: boolean;
  error?: string;
}> {
  const adminMail = buildMailContent(payload);
  const thankYouMail = buildThankYouMailContent(payload);
  const [adminResult, thankYouResult] = await Promise.all([
    send({
      to: recipients.join(", "),
      replyTo: payload.email,
      subject: adminMail.subject,
      text: adminMail.text,
      html: adminMail.html,
    }),
    send({
      to: payload.email,
      replyTo: LINEUP_OFFICIAL_EMAIL,
      subject: thankYouMail.subject,
      text: thankYouMail.text,
      html: thankYouMail.html,
    }),
  ]);
  const error = !adminResult.ok
    ? adminResult.error
    : !thankYouResult.ok
      ? thankYouResult.error
      : undefined;
  return {
    adminDelivered: adminResult.ok,
    thankYouDelivered: thankYouResult.ok,
    error,
  };
}

/** Notifica admin + ringraziamento utente. Su Render free: usa Resend (HTTPS), non Gmail SMTP. */
export async function notifyPianificaDemoFeedbackByEmail(
  payload: PianificaDemoFeedbackPayload,
): Promise<{
  delivered: boolean;
  channel: DemoEmailChannel;
  adminDelivered: boolean;
  thankYouDelivered: boolean;
  smtpError?: string;
}> {
  const recipients = getFeedbackRecipients();
  const resendKey = getResendApiKey();
  const cfg = getSmtpConfig();

  let channel: DemoEmailChannel = "log";
  let adminDelivered = false;
  let thankYouDelivered = false;
  let smtpError: string | undefined;

  if (resendKey) {
    channel = "resend";
    const result = await sendDemoMailPair(sendViaResend, payload, recipients);
    adminDelivered = result.adminDelivered;
    thankYouDelivered = result.thankYouDelivered;
    smtpError = result.error;
  } else if (cfg) {
    channel = "smtp";
    const result = await sendDemoMailPair(
      (opts) => sendViaSmtp(cfg, opts),
      payload,
      recipients,
    );
    adminDelivered = result.adminDelivered;
    thankYouDelivered = result.thankYouDelivered;
    smtpError = result.error;
    if (smtpError?.includes("timeout")) {
      console.warn(`[pianifica-demo] ${RENDER_SMTP_BLOCKED_HINT}`);
    }
  } else {
    console.warn("[pianifica-demo] Email non configurata: imposta RESEND_API_KEY o SMTP_*");
  }

  if (adminDelivered || thankYouDelivered) {
    console.log(
      `[pianifica-demo] email channel=${channel} admin=${adminDelivered} thankYou=${thankYouDelivered} → ${payload.email}`,
    );
    return {
      delivered: adminDelivered && thankYouDelivered,
      channel,
      adminDelivered,
      thankYouDelivered,
      smtpError,
    };
  }

  try {
    await logAiPipelineSummary({
      route: `POST /api/app/pianifica-demo/feedback [no-email:${channel}]`,
      lines: [
        `admin to: ${recipients.join(", ")}`,
        `thank-you to: ${payload.email}`,
        `name: ${payload.name}`,
        `rating: ${payload.rating}/5`,
        `comment: ${payload.comment?.trim() || "(vuoto)"}`,
        smtpError ? `error: ${smtpError}` : "",
        "— Render free: RESEND_API_KEY. Oppure piano Render a pagamento + Gmail SMTP.",
      ],
    });
  } catch (e) {
    console.warn("pianifica-demo feedback log failed:", e);
  }
  return {
    delivered: false,
    channel: "log",
    adminDelivered: false,
    thankYouDelivered: false,
    smtpError,
  };
}
