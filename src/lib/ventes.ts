import { parseISO, toISODate, todayISO } from './format';

/* ------------------------------------------------------------------ */
/*  Périodes de la page Ventes (jour / mois / année)                   */
/* ------------------------------------------------------------------ */

export type Periode =
  | { kind: 'jour'; date: string }
  | { kind: 'mois'; year: number; month: number }
  | { kind: 'annee'; year: number };

/**
 * Interprète le segment d'URL de /ventes/[...] :
 * `YYYY-MM-DD` → jour, `YYYY-MM` → mois, `YYYY` → année, rien → aujourd'hui.
 */
export function resolvePeriode(segments?: string[]): Periode | null {
  const raw = segments?.[0];
  if (!raw) return { kind: 'jour', date: todayISO() };

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const parsed = parseISO(raw);
    if (Number.isNaN(parsed.getTime()) || toISODate(parsed) !== raw) return null;
    return { kind: 'jour', date: raw };
  }

  const m = /^(\d{4})-(\d{2})$/.exec(raw);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    if (year < 2000 || year > 2100 || month < 1 || month > 12) return null;
    return { kind: 'mois', year, month };
  }

  if (/^\d{4}$/.test(raw)) {
    const year = Number(raw);
    return year >= 2000 && year <= 2100 ? { kind: 'annee', year } : null;
  }

  return null;
}
