#!/usr/bin/env bash
# Prepara il progetto per il deploy (build + checklist).
set -euo pipefail
cd "$(dirname "$0")/.."

echo "=== LineUp — preparazione publish demo ==="
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "Errore: Node.js non trovato. Installa Node 20+ da https://nodejs.org"
  exit 1
fi

if [[ ! -f .env ]]; then
  if [[ -f env.example ]]; then
    cp env.example .env
    echo "Creato .env da env.example — APRILO e compila DATABASE_URL e OPENAI_API_KEY."
    echo ""
  else
    echo "Manca .env: crea il file con DATABASE_URL e OPENAI_API_KEY (vedi .env.example)."
    exit 1
  fi
fi

# shellcheck disable=SC1091
set -a
source .env 2>/dev/null || true
set +a

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "⚠️  DATABASE_URL non impostato in .env"
  echo "   1. Vai su https://neon.tech → New Project → copia Connection string"
  echo "   2. Incollala in .env come DATABASE_URL=..."
  echo ""
  read -r -p "Hai già incollato DATABASE_URL in .env? [s/N] " ok
  [[ "$ok" == "s" || "$ok" == "S" ]] || exit 1
  set -a; source .env; set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Errore: DATABASE_URL ancora vuoto."
  exit 1
fi

echo "→ npm ci"
npm ci

echo "→ npm run build"
npm run build

echo ""
echo "→ Migrazione schema DB (drizzle push)"
npx drizzle-kit push 2>/dev/null || npm run db:push

echo ""
echo "✓ Build OK. Prossimi passi:"
echo ""
echo "  A) TEST LOCALE"
echo "     npm start"
echo "     Apri: http://localhost:5174/prova-pianifica"
echo ""
echo "  B) PUBBLICA SU RENDER (senza Replit)"
echo "     1. git push del progetto su GitHub"
echo "     2. https://dashboard.render.com → New → Blueprint"
echo "     3. Collega il repo → Render legge render.yaml"
echo "     4. In Environment incolla DATABASE_URL, OPENAI_API_KEY, SMTP_*"
echo "     5. Dopo il deploy, link demo:"
echo "        https://TUO-SERVIZIO.onrender.com/prova-pianifica"
echo ""
