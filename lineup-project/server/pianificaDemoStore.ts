import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export type PianificaDemoFeedbackEntry = {
  id: string;
  name: string;
  email: string;
  rating: number;
  comment?: string;
  createdAt: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "pianifica-demo-feedback.json");

let cache: PianificaDemoFeedbackEntry[] | null = null;

function adminPassword(): string {
  return process.env.PIANIFICA_DEMO_ADMIN_PASSWORD?.trim() || "1234!";
}

export function verifyPianificaDemoAdminPassword(password: string): boolean {
  return password === adminPassword();
}

async function ensureLoaded(): Promise<PianificaDemoFeedbackEntry[]> {
  if (cache) return cache;
  try {
    const raw = await readFile(STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as PianificaDemoFeedbackEntry[];
    cache = Array.isArray(parsed) ? parsed : [];
  } catch {
    cache = [];
  }
  return cache;
}

async function persist(entries: PianificaDemoFeedbackEntry[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(entries, null, 2), "utf-8");
  cache = entries;
}

export async function addPianificaDemoFeedback(entry: Omit<PianificaDemoFeedbackEntry, "id" | "createdAt">): Promise<PianificaDemoFeedbackEntry> {
  const rows = await ensureLoaded();
  const created: PianificaDemoFeedbackEntry = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...entry,
  };
  rows.unshift(created);
  await persist(rows);
  return created;
}

export async function listPianificaDemoFeedbacks(): Promise<PianificaDemoFeedbackEntry[]> {
  const rows = await ensureLoaded();
  return [...rows].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}
