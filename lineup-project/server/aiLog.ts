import { appendFile } from "fs/promises";
import path from "path";

// Radice progetto (funziona anche con build CJS `npm start`).
const projectRoot = path.resolve(process.cwd());
const LOG_PATH = path.join(projectRoot, "ai_log.txt");

export async function logAiExchange(opts: {
  route: string;
  prompt: string;
  response: string;
}): Promise<void> {
  const ts = new Date().toISOString();
  const block = [
    "\n",
    "=".repeat(80),
    `[${ts}] ${opts.route}`,
    "--- PROMPT ---",
    opts.prompt,
    "--- RESPONSE ---",
    opts.response,
    "",
  ].join("\n");
  try {
    await appendFile(LOG_PATH, block, "utf-8");
  } catch (e) {
    console.error("ai_log.txt append failed:", e);
  }
}

/** Riepilogo post-pipeline (conteggi, chiavi API, ramo web) — append su ai_log.txt. */
export async function logAiPipelineSummary(opts: {
  route: string;
  lines: string[];
}): Promise<void> {
  const ts = new Date().toISOString();
  const block = ["\n", "-".repeat(80), `[${ts}] ${opts.route} [pipeline]`, ...opts.lines.map((l) => `  ${l}`), ""].join("\n");
  try {
    await appendFile(LOG_PATH, block, "utf-8");
  } catch (e) {
    console.error("ai_log.txt pipeline append failed:", e);
  }
}
