/* ------------------------------------------------------------------ */
/*  Dates & formats français                                          */
/* ------------------------------------------------------------------ */

export const APP_TZ = process.env.APP_TIMEZONE || 'Europe/Paris';

export const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

export const MONTHS_UPPER = [
  'JANVIER', 'FÉVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN',
  'JUILLET', 'AOÛT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DÉCEMBRE',
];

export const MONTHS_SHORT = [
  'Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin',
  'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc',
];

/** Noms d'onglets Excel (≤ 31 caractères, sans caractères interdits). */
export const SHEET_MONTHS = [
  'JANV', 'FEV', 'MARS', 'AVR', 'MAI', 'JUIN',
  'JUIL', 'AOUT', 'SEPT', 'OCT', 'NOV', 'DEC',
];

export const WEEKDAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const pad2 = (n: number) => String(n).padStart(2, '0');

export function toISODate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** Date ISO (YYYY-MM-DD) à midi UTC — évite tout décalage de fuseau. */
export function parseISO(iso: string): Date {
  return new Date(`${iso}T12:00:00.000Z`);
}

export function isoFromParts(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function todayISO(tz: string = APP_TZ): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function addDays(iso: string, n: number): string {
  const d = parseISO(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toISODate(d);
}

/** 0 = dimanche … 6 = samedi */
export function weekday(iso: string): number {
  return parseISO(iso).getUTCDay();
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function monthStartISO(year: number, month: number): string {
  return isoFromParts(year, month, 1);
}

export function monthEndISO(year: number, month: number): string {
  return isoFromParts(year, month, daysInMonth(year, month));
}

export function monthLabel(year: number, month: number): string {
  return `${MONTHS_FR[month - 1]} ${year}`;
}

export function monthLabelShort(year: number, month: number): string {
  return `${MONTHS_SHORT[month - 1]} ${String(year).slice(2)}`;
}

export function formatDateLong(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parseISO(iso));
}

export function formatDateMedium(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'UTC',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(parseISO(iso));
}

export function formatDayMonth(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'UTC',
    day: '2-digit',
    month: '2-digit',
  }).format(parseISO(iso));
}

export function weekdayShortFR(iso: string): string {
  const wd = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'UTC',
    weekday: 'short',
  }).format(parseISO(iso));
  return wd.replace('.', '').slice(0, 3);
}

/** Numéro de semaine ISO (1..53). */
export function isoWeek(iso: string): number {
  const d = parseISO(iso);
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const diff = target.getTime() - firstThursday.getTime();
  return 1 + Math.round(diff / (7 * 24 * 3600 * 1000));
}

/* --- Nombres ------------------------------------------------------ */

const nfCache = new Map<string, Intl.NumberFormat>();

export function fmtNumber(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const key = String(decimals);
  let nf = nfCache.get(key);
  if (!nf) {
    nf = new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    nfCache.set(key, nf);
  }
  return nf.format(value);
}

/** 0 → « — » pour les tableaux (évite le bruit visuel). */
export function fmtOrDash(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || Number.isNaN(value) || value === 0) return '—';
  return fmtNumber(value, decimals);
}

export function fmtLitres(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${fmtNumber(value, value % 1 === 0 ? 0 : 1)} L`;
}

export function fmtRendement(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return fmtNumber(value, 2);
}

export function fmtPercent(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${fmtNumber(value, decimals)} %`;
}

export function todayLabel(tz?: string): string {
  return formatDateLong(todayISO(tz));
}
