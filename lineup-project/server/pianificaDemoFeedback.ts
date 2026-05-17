import nodemailer from "nodemailer";
import { logAiPipelineSummary } from "./aiLog";
import { addPianificaDemoFeedback } from "./pianificaDemoStore";

export const PIANIFICA_DEMO_FEEDBACK_RECIPIENTS = [
  "lorenzo.cappabianca7@gmail.com",
  "federico.bossotti@gmail.com",
] as const;

export type PianificaDemoFeedbackPayload = {
  name: string;
  email: string;
  rating: number;
  comment?: string;
};

function getFeedbackRecipients(): string[] {
  const fromEnv = process.env.PIANIFICA_DEMO_FEEDBACK_TO?.trim();
  if (fromEnv) {
    return fromEnv
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [...PIANIFICA_DEMO_FEEDBACK_RECIPIENTS];
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
    `Voto: ${payload.rating}/5 ${stars}`,
    "",
    "Suggerimenti / consigli:",
    commentBlock,
    "",
    `Inviato il: ${new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome" })}`,
  ].join("\n");
  const html = `
    <div style="font-family:system-ui,sans-serif;color:#111;max-width:520px">
      <h2 style="color:#4a8fc4;margin:0 0 12px">Feedback demo Pianifica</h2>
      <p><strong>Nome:</strong> ${escapeHtml(payload.name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(payload.email)}</p>
      <p><strong>Voto:</strong> ${payload.rating}/5 <span style="color:#f59e0b">${stars}</span></p>
      <p><strong>Suggerimenti / consigli:</strong></p>
      <p style="white-space:pre-wrap;background:#f4faff;border:1px solid #8abfe8;border-radius:12px;padding:12px">${escapeHtml(commentBlock)}</p>
      <p style="font-size:12px;color:#666">${escapeHtml(new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome" }))}</p>
    </div>
  `;
  return { subject, text, html };
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendPianificaDemoFeedback(
  payload: PianificaDemoFeedbackPayload,
): Promise<{ delivered: boolean; channel: "smtp" | "log" | "store" }> {
  await addPianificaDemoFeedback({
    name: payload.name,
    email: payload.email,
    rating: payload.rating,
    comment: payload.comment?.trim() || undefined,
  });

  const { subject, text, html } = buildMailContent(payload);
  const recipients = getFeedbackRecipients();

  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.SMTP_FROM?.trim() || user;

  if (host && user && pass && from) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      await transporter.sendMail({
        from,
        to: recipients.join(", "),
        replyTo: payload.email,
        subject,
        text,
        html,
      });
      return { delivered: true, channel: "smtp" };
    } catch (e) {
      console.warn("pianifica-demo feedback SMTP failed:", e);
    }
  }

  await logAiPipelineSummary({
    route: "POST /api/app/pianifica-demo/feedback [no-smtp]",
    lines: [
      `to: ${recipients.join(", ")}`,
      `name: ${payload.name}`,
      `email: ${payload.email}`,
      `rating: ${payload.rating}/5`,
      `comment: ${payload.comment?.trim() || "(vuoto)"}`,
      "— Configura SMTP_HOST, SMTP_USER, SMTP_PASS (e opz. SMTP_FROM) per invio email reale.",
    ],
  });
  return { delivered: true, channel: "store" };
}
