export const GATE_STORAGE_KEY = "lineup_pianifica_demo_gate_v2";

export type PreviewProfile = {
  name: string;
  email: string;
  birthYear: number;
};

export function isValidEmail(value: string): boolean {
  const t = value.trim();
  return t.length >= 3 && t.includes("@") && !/\s/.test(t);
}

export function parseBirthYear(value: string): number | null {
  const t = value.trim();
  if (!/^\d{4}$/.test(t)) return null;
  const y = Number(t);
  const max = new Date().getFullYear();
  if (!Number.isInteger(y) || y < 1900 || y > max) return null;
  return y;
}

export function isValidBirthYearInput(value: string): boolean {
  return parseBirthYear(value) !== null;
}

export function readStoredDemoProfile(): PreviewProfile | null {
  try {
    const raw = sessionStorage.getItem(GATE_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<PreviewProfile>;
    if (!data?.name?.trim() || !data?.email?.trim()) return null;
    const birthYear =
      typeof data.birthYear === "number"
        ? data.birthYear
        : parseBirthYear(String(data.birthYear ?? ""));
    if (birthYear === null) return null;
    return {
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      birthYear,
    };
  } catch {
    return null;
  }
}

export function storeDemoProfile(profile: PreviewProfile): void {
  sessionStorage.setItem(GATE_STORAGE_KEY, JSON.stringify(profile));
}
