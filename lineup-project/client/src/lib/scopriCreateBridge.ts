import type { ScopriToCreatePrefill } from "./appUtils";

const STORAGE_KEY = "lineup_pending_scopri_create_v1";

/** Salvataggio quando si arriva da /scopri (full page) prima di tornare alla Home. */
export function stashPendingScopriCreate(prefill: ScopriToCreatePrefill): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(prefill));
  } catch {
    /* ignore quota / private mode */
  }
}

/** Legge e rimuove il prefill pendente (una sola volta). */
export function takePendingScopriCreate(): ScopriToCreatePrefill | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(STORAGE_KEY);
    const data = JSON.parse(raw) as ScopriToCreatePrefill;
    if (!data?.venues?.length || !data.categoryKey || !data.subcategoryLabel) return null;
    return data;
  } catch {
    return null;
  }
}
