/**
 * Test SMTP su Render (o server già avviato).
 *
 *   node script/smtp-demo-test.mjs https://TUO-SERVIZIO.onrender.com
 *
 * Env opzionali:
 *   PIANIFICA_DEMO_ADMIN_PASSWORD  (default 1234!)
 *   SMTP_PROBE_TO                  email dove ricevere la mail di prova
 */
const base = process.argv[2]?.trim();
if (!base?.startsWith("http")) {
  console.error("Uso: node script/smtp-demo-test.mjs https://TUO-SERVIZIO.onrender.com");
  process.exit(2);
}

const adminPw = process.env.PIANIFICA_DEMO_ADMIN_PASSWORD?.trim() || "1234!";
const probeTo = process.env.SMTP_PROBE_TO?.trim();

const url = `${base.replace(/\/$/, "")}/api/app/pianifica-demo/admin/smtp-test`;
console.log(`→ POST ${url}`);
if (probeTo) console.log(`  probeTo: ${probeTo}\n`);

const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ password: adminPw, ...(probeTo ? { probeTo } : {}) }),
});
const body = await res.json().catch(() => ({}));
console.log(res.status, JSON.stringify(body, null, 2));

if (!res.ok) process.exit(1);
if (!body.configured) {
  console.error("\n✗ SMTP non configurato su Render (SMTP_HOST, SMTP_USER, SMTP_PASS).");
  process.exit(1);
}
if (!body.verifyOk) {
  console.error("\n✗ Connessione SMTP fallita:", body.error || body.hint);
  process.exit(1);
}
if (probeTo && !body.probeSent) {
  console.error("\n✗ Verify OK ma mail di prova non inviata:", body.error || body.hint);
  process.exit(1);
}
console.log("\n✓ SMTP OK" + (body.probeSent ? " — controlla la casella probeTo." : " (aggiungi SMTP_PROBE_TO per invio prova)"));
