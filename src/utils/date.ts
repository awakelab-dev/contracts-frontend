const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function isValidIsoDate(iso: string): boolean {
  if (!ISO_DATE_RE.test(iso)) return false;
  const d = new Date(iso + "T00:00:00.000Z");
  if (Number.isNaN(d.getTime())) return false;
  return d.toISOString().slice(0, 10) === iso;
}

/**
 * Extracts a safe ISO date (YYYY-MM-DD) from common backend formats.
 * Supports:
 * - YYYY-MM-DD
 * - YYYY-MM-DDTHH:mm:ss(.sss)Z / with offset
 * - MySQL-like "YYYY-MM-DD HH:mm:ss"
 * - DD/MM/YYYY or DD-MM-YYYY (user-facing)
 */
export function toIsoDate(value: unknown): string | null {
  if (value == null) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }

  const s = String(value).trim();
  if (!s) return null;

  // Matches ISO date at the beginning of the string (covers datetime strings too).
  const mIso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (mIso) {
    const iso = `${mIso[1]}-${mIso[2]}-${mIso[3]}`;
    return isValidIsoDate(iso) ? iso : null;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (!m) m = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(s);

  if (m) {
    const dd = Number(m[1]);
    const mm = Number(m[2]);
    const yyyy = Number(m[3]);
    if (!Number.isFinite(dd) || !Number.isFinite(mm) || !Number.isFinite(yyyy)) return null;
    const iso = `${String(yyyy).padStart(4, "0")}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
    return isValidIsoDate(iso) ? iso : null;
  }

  return null;
}

export function formatDateDMY(value: unknown, fallback = "-"): string {
  const iso = toIsoDate(value);
  if (!iso) return fallback;
  const m = ISO_DATE_RE.exec(iso);
  if (!m) return fallback;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/**
 * Parses a date value into a local-midnight Date (avoids timezone shifts for YYYY-MM-DD).
 */
export function toLocalDate(value: unknown): Date | null {
  const iso = toIsoDate(value);
  if (!iso) return null;
  const m = ISO_DATE_RE.exec(iso);
  if (!m) return null;

  const yyyy = Number(m[1]);
  const mm = Number(m[2]);
  const dd = Number(m[3]);
  const d = new Date(yyyy, mm - 1, dd);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Normalizes manual user input into ISO date (YYYY-MM-DD).
 * Returns "" for empty input.
 */
export function normalizeUserDateToIso(input: string): string | null {
  const raw = (input ?? "").toString().trim();
  if (!raw) return "";
  return toIsoDate(raw);
}
