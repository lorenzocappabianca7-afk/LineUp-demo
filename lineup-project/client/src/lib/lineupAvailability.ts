/** Verifica se il backend risponde (non in manutenzione). */
export async function checkLineUpServerAvailable(timeoutMs = 8000): Promise<boolean> {
  try {
    const ac = new AbortController();
    const timer = window.setTimeout(() => ac.abort(), timeoutMs);
    const res = await fetch("/api/health", {
      signal: ac.signal,
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    window.clearTimeout(timer);
    if (!res.ok) return false;
    const data = (await res.json()) as { ok?: boolean; maintenance?: boolean };
    return data.ok === true && data.maintenance !== true;
  } catch {
    return false;
  }
}
