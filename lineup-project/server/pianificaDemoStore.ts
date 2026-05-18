import { readFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "./db";
import { pianificaDemoFeedbacks } from "@shared/schema";

export type PianificaDemoFeedbackEntry = {
  id: string;
  name: string;
  email: string;
  rating: number;
  comment?: string;
  createdAt: string;
};

const LEGACY_STORE_PATH = path.join(process.cwd(), "data", "pianifica-demo-feedback.json");

let legacyImportDone = false;

function adminPassword(): string {
  return process.env.PIANIFICA_DEMO_ADMIN_PASSWORD?.trim() || "1234!";
}

export function verifyPianificaDemoAdminPassword(password: string): boolean {
  return password === adminPassword();
}

function rowToEntry(row: {
  id: string;
  name: string;
  email: string;
  rating: number;
  comment: string | null;
  createdAt: Date | null;
}): PianificaDemoFeedbackEntry {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    rating: row.rating,
    comment: row.comment ?? undefined,
    createdAt: (row.createdAt ?? new Date()).toISOString(),
  };
}

/** Importa una tantum da `data/pianifica-demo-feedback.json` se il DB è vuoto. */
async function importLegacyFileOnce(): Promise<void> {
  if (legacyImportDone) return;
  legacyImportDone = true;

  try {
    const existing = await db.select({ id: pianificaDemoFeedbacks.id }).from(pianificaDemoFeedbacks).limit(1);
    if (existing.length > 0) return;

    const raw = await readFile(LEGACY_STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as PianificaDemoFeedbackEntry[];
    if (!Array.isArray(parsed) || parsed.length === 0) return;

    for (const item of parsed) {
      if (!item?.id || !item.name || !item.email || typeof item.rating !== "number") continue;
      await db
        .insert(pianificaDemoFeedbacks)
        .values({
          id: item.id,
          name: item.name.trim(),
          email: item.email.trim().toLowerCase(),
          rating: item.rating,
          comment: item.comment?.trim() || null,
          createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
        })
        .onConflictDoNothing();
    }
    console.log(`[pianifica-demo] importati ${parsed.length} feedback da file legacy`);
  } catch {
    /* nessun file legacy o DB non pronto */
  }
}

export async function addPianificaDemoFeedback(
  entry: Omit<PianificaDemoFeedbackEntry, "id" | "createdAt">,
): Promise<PianificaDemoFeedbackEntry> {
  await importLegacyFileOnce();

  const id = randomUUID();
  const createdAt = new Date();
  await db.insert(pianificaDemoFeedbacks).values({
    id,
    name: entry.name.trim(),
    email: entry.email.trim().toLowerCase(),
    rating: entry.rating,
    comment: entry.comment?.trim() || null,
    createdAt,
  });

  console.log(`[pianifica-demo] feedback salvato id=${id} email=${entry.email.trim().toLowerCase()}`);

  return {
    id,
    createdAt: createdAt.toISOString(),
    name: entry.name.trim(),
    email: entry.email.trim().toLowerCase(),
    rating: entry.rating,
    comment: entry.comment?.trim() || undefined,
  };
}

export async function listPianificaDemoFeedbacks(): Promise<PianificaDemoFeedbackEntry[]> {
  await importLegacyFileOnce();

  const rows = await db
    .select()
    .from(pianificaDemoFeedbacks)
    .orderBy(desc(pianificaDemoFeedbacks.createdAt));

  return rows.map(rowToEntry);
}

export async function deletePianificaDemoFeedback(id: string): Promise<boolean> {
  await importLegacyFileOnce();
  const removed = await db
    .delete(pianificaDemoFeedbacks)
    .where(eq(pianificaDemoFeedbacks.id, id))
    .returning({ id: pianificaDemoFeedbacks.id });
  if (removed.length > 0) {
    console.log(`[pianifica-demo] feedback eliminato id=${id}`);
  }
  return removed.length > 0;
}
