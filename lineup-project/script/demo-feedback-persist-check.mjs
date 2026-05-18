/**
 * Verifica che i feedback demo vengano salvati su Postgres e riletti dall'admin.
 * Uso: node script/demo-feedback-persist-check.mjs [baseUrl]
 * Richiede DATABASE_URL nel server e PIANIFICA_DEMO_ADMIN_PASSWORD (default 1234!).
 */
const BASE = process.argv[2] || "http://127.0.0.1:5199";
const ADMIN_PW = process.env.PIANIFICA_DEMO_ADMIN_PASSWORD?.trim() || "1234!";
const MARKER = `persist-test-${Date.now()}@test.it`;

async function run() {
  const post = await fetch(`${BASE}/api/app/pianifica-demo/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Test Persistenza",
      email: MARKER,
      rating: 5,
      comment: "Verifica automatica salvataggio DB",
    }),
  });
  const postBody = await post.json().catch(() => ({}));
  if (!post.ok || !postBody.ok || !postBody.id || postBody.saved === false) {
    console.error("POST feedback fallito:", post.status, postBody);
    process.exit(1);
  }

  const list = await fetch(`${BASE}/api/app/pianifica-demo/admin/feedbacks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: ADMIN_PW }),
  });
  const listBody = await list.json().catch(() => ({}));
  if (!list.ok) {
    console.error("Admin list fallita:", list.status, listBody);
    process.exit(1);
  }

  const found = (listBody.feedbacks ?? []).find((f) => f.email === MARKER);
  if (!found) {
    console.error("Feedback non trovato in admin dopo POST:", { marker: MARKER, count: listBody.feedbacks?.length });
    process.exit(1);
  }
  if (found.rating !== 5) {
    console.error("Dati feedback non corrispondono:", found);
    process.exit(1);
  }

  const del = await fetch(`${BASE}/api/app/pianifica-demo/admin/feedbacks/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: ADMIN_PW, id: postBody.id }),
  });
  if (!del.ok) {
    console.error("DELETE feedback fallito:", del.status, await del.json().catch(() => ({})));
    process.exit(1);
  }

  const listAfter = await fetch(`${BASE}/api/app/pianifica-demo/admin/feedbacks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: ADMIN_PW }),
  });
  const listAfterBody = await listAfter.json().catch(() => ({}));
  const stillThere = (listAfterBody.feedbacks ?? []).some((f) => f.id === postBody.id);
  if (stillThere) {
    console.error("Feedback ancora presente dopo eliminazione:", postBody.id);
    process.exit(1);
  }

  console.log("✓ Feedback salvato, riletto ed eliminato da Postgres.", { id: postBody.id, email: MARKER });
}

run().catch((e) => {
  console.error(e);
  process.exit(2);
});
