import 'server-only';
import fs from 'node:fs';

import type { Client, InStatement } from '@libsql/client';

import {
  databaseLabel,
  dbPath,
  entryStatement,
  getDb,
  isRemoteDatabase,
  readSettings,
  rowToEntry,
} from './db';
import { DEMO_OPENING_STOCK, demoStartISO, generateDemoDays } from './seed';
import {
  addStock,
  aggregate,
  emptyStock,
  isDayEmpty,
  mouvements,
  zeroDay,
} from './calc';
import type {
  DayComputed,
  DayEntry,
  MonthData,
  Settings,
  Stock,
  YearData,
} from './types';
import {
  daysInMonth,
  isoFromParts,
  monthEndISO,
  monthStartISO,
  todayISO,
} from './format';

/* ------------------------------------------------------------------ */
/*  Initialisation paresseuse                                          */
/* ------------------------------------------------------------------ */

/** Conservé pour compatibilité : la préparation est faite par getDb(). */
export async function ensureReady(): Promise<void> {
  await getDb();
}

type Row = Record<string, unknown>;

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/* ------------------------------------------------------------------ */
/*  Réglages                                                           */
/* ------------------------------------------------------------------ */

export async function getSettings(): Promise<Settings> {
  return readSettings(await getDb());
}

export type SettingsInput = {
  farmName?: string;
  tagline?: string;
  openingDate?: string;
  openingStock?: Partial<Stock>;
};

export async function saveSettings(input: SettingsInput): Promise<Settings> {
  const db = await getDb();
  const current = await readSettings(db);
  const openingDate = DATE_RE.test(input.openingDate ?? '')
    ? (input.openingDate as string)
    : current.openingDate;
  const stock: Stock = {
    brousses: clampQty(input.openingStock?.brousses ?? current.openingStock.brousses),
    fromages: clampQty(input.openingStock?.fromages ?? current.openingStock.fromages),
    faisselles: clampQty(input.openingStock?.faisselles ?? current.openingStock.faisselles),
    tomes: clampQty(input.openingStock?.tomes ?? current.openingStock.tomes),
  };

  const statements: InStatement[] = [];
  if (typeof input.farmName === 'string' && input.farmName.trim()) {
    statements.push(setting('farm_name', input.farmName.trim().slice(0, 80)));
  }
  if (typeof input.tagline === 'string') {
    statements.push(setting('tagline', input.tagline.trim().slice(0, 120)));
  }
  statements.push(...openingStatements(openingDate, stock));
  await db.batch(statements, 'write');
  return readSettings(db);
}

function setting(key: string, value: string): InStatement {
  return {
    sql: 'INSERT INTO reglages (cle, valeur) VALUES (?, ?) ON CONFLICT(cle) DO UPDATE SET valeur = excluded.valeur',
    args: [key, value],
  };
}

function openingStatements(date: string, stock: Stock): InStatement[] {
  return [
    setting('opening_date', date),
    setting('opening_brousses', String(stock.brousses)),
    setting('opening_fromages', String(stock.fromages)),
    setting('opening_faisselles', String(stock.faisselles)),
    setting('opening_tomes', String(stock.tomes)),
  ];
}

/* ------------------------------------------------------------------ */
/*  Journées                                                           */
/* ------------------------------------------------------------------ */

export async function getDay(date: string): Promise<DayEntry | null> {
  const db = await getDb();
  const res = await db.execute({ sql: 'SELECT * FROM jours WHERE date = ?', args: [date] });
  const row = res.rows[0] as Row | undefined;
  return row ? rowToEntry(row) : null;
}

export async function getDaysInRange(from: string, to: string): Promise<DayEntry[]> {
  const db = await getDb();
  const res = await db.execute({
    sql: 'SELECT * FROM jours WHERE date >= ? AND date <= ? ORDER BY date',
    args: [from, to],
  });
  return (res.rows as Row[]).map(rowToEntry);
}

/** Stock à la fin de la veille de `date` (ou stock initial si `date` <= date d'ouverture). */
export async function getStockBefore(date: string): Promise<Stock> {
  const db = await getDb();
  const s = await readSettings(db);
  if (date <= s.openingDate) return { ...s.openingStock };

  const res = await db.execute({
    sql: `SELECT
       COALESCE(SUM(nb_brousses  - vente_brousses  - conso_brousses  - CASE WHEN deduire_pertes <> 0 THEN perte_brousses  ELSE 0 END), 0) AS brousses,
       COALESCE(SUM(nb_fromages  - vente_fromages  - conso_fromages  - CASE WHEN deduire_pertes <> 0 THEN perte_fromages  ELSE 0 END), 0) AS fromages,
       COALESCE(SUM(nb_faisselles - vente_faisselles - conso_faisselles), 0) AS faisselles,
       COALESCE(SUM(nb_tomes     - vente_tomes     - conso_tomes     - CASE WHEN deduire_pertes <> 0 THEN perte_tomes     ELSE 0 END), 0) AS tomes
     FROM jours
     WHERE date >= ? AND date < ?`,
    args: [s.openingDate, date],
  });
  const row = (res.rows[0] ?? {}) as Row;
  return addStock(s.openingStock, {
    brousses: num(row.brousses),
    fromages: num(row.fromages),
    faisselles: num(row.faisselles),
    tomes: num(row.tomes),
  });
}

export async function getDayComputed(date: string): Promise<DayComputed> {
  const [entry, stockBefore] = await Promise.all([getDay(date), getStockBefore(date)]);
  const stockAfter = entry ? addStock(stockBefore, mouvements(entry)) : { ...stockBefore };
  return buildComputed(date, entry, stockBefore, stockAfter);
}

export function buildComputed(
  date: string,
  entry: DayEntry | null,
  stockBefore: Stock,
  stockAfter: Stock,
): DayComputed {
  const e = entry ?? zeroDay(date);
  return {
    date,
    entry,
    stockBefore,
    stockAfter,
    laitTotal: e.laitBrousses + e.laitFromages + e.laitTomes,
    productionPieces: e.nbBrousses + e.nbFromages + e.nbFaisselles + e.nbTomes,
    ventePieces: e.venteBrousses + e.venteFromages + e.venteFaisselles + e.venteTomes,
    consoPieces: e.consoBrousses + e.consoFromages + e.consoFaisselles + e.consoTomes,
    pertePieces: e.perteBrousses + e.perteFromages + e.perteTomes,
    rendementBrousses: e.laitBrousses > 0 ? e.nbBrousses / e.laitBrousses : null,
    rendementFromages: e.laitFromages > 0 ? e.nbFromages / e.laitFromages : null,
    negative:
      stockAfter.brousses < -0.001 ||
      stockAfter.fromages < -0.001 ||
      stockAfter.faisselles < -0.001 ||
      stockAfter.tomes < -0.001,
  };
}

function clampQty(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(Math.min(n, 1_000_000) * 100) / 100;
}

export function sanitizeEntry(date: string, input: Partial<DayEntry>): DayEntry {
  const base = zeroDay(date);
  const out: DayEntry = { ...base };
  for (const key of Object.keys(base) as Array<keyof DayEntry>) {
    if (key === 'date' || key === 'updatedAt' || key === 'deduirePertes' || key === 'note') continue;
    out[key] = clampQty(input[key] ?? 0) as never;
  }
  out.deduirePertes = input.deduirePertes !== false;
  out.note = typeof input.note === 'string' ? input.note.trim().slice(0, 500) : '';
  return out;
}

export async function saveDay(date: string, input: Partial<DayEntry>): Promise<DayEntry> {
  const db = await getDb();
  const entry = sanitizeEntry(date, input);
  await db.execute(entryStatement(entry));
  return entry;
}

export async function deleteDay(date: string): Promise<void> {
  const db = await getDb();
  await db.execute({ sql: 'DELETE FROM jours WHERE date = ?', args: [date] });
}

export async function isSaved(date: string): Promise<boolean> {
  const e = await getDay(date);
  return !!e && !isDayEmpty(e);
}

/* ------------------------------------------------------------------ */
/*  Agrégats mensuels / annuels                                        */
/* ------------------------------------------------------------------ */

function monthFrom(
  year: number,
  month: number,
  byDate: Map<string, DayEntry>,
  stockDebut: Stock,
): MonthData {
  const dim = daysInMonth(year, month);
  const days: DayComputed[] = [];
  const negativeDays: string[] = [];
  let stock: Stock = { ...stockDebut };

  for (let d = 1; d <= dim; d += 1) {
    const iso = isoFromParts(year, month, d);
    const entry = byDate.get(iso) ?? null;
    const before: Stock = { ...stock };
    if (entry) stock = addStock(stock, mouvements(entry));
    const computed = buildComputed(iso, entry, before, { ...stock });
    if (computed.negative) negativeDays.push(iso);
    days.push(computed);
  }

  return {
    year,
    month,
    days,
    totals: aggregate(days.map((d) => d.entry)),
    stockDebut,
    stockFin: stock,
    negativeDays,
  };
}

export async function getMonthData(year: number, month: number): Promise<MonthData> {
  const start = monthStartISO(year, month);
  const end = monthEndISO(year, month);
  const [entries, stockDebut] = await Promise.all([
    getDaysInRange(start, end),
    getStockBefore(start),
  ]);
  const byDate = new Map(entries.map((e) => [e.date, e]));
  return monthFrom(year, month, byDate, stockDebut);
}

export async function getYearData(year: number): Promise<YearData> {
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;
  const [entries, stockDebut] = await Promise.all([
    getDaysInRange(start, end),
    getStockBefore(start),
  ]);
  const byDate = new Map(entries.map((e) => [e.date, e]));
  let stock = { ...stockDebut };
  const months: MonthData[] = [];
  for (let m = 1; m <= 12; m += 1) {
    const md = monthFrom(year, m, byDate, stock);
    stock = md.stockFin;
    months.push(md);
  }
  return { year, months, totals: aggregate(entries), stockDebut, stockFin: stock };
}

export async function getAvailableYears(): Promise<number[]> {
  const db = await getDb();
  const res = await db.execute(
    'SELECT DISTINCT substr(date, 1, 4) AS y FROM jours ORDER BY y',
  );
  const years = new Set<number>(
    (res.rows as Row[]).map((r) => Number(r.y)).filter((y) => Number.isFinite(y)),
  );
  const s = await readSettings(db);
  years.add(Number(s.openingDate.slice(0, 4)));
  years.add(Number(todayISO().slice(0, 4)));
  return [...years].sort((a, b) => a - b);
}

export async function getYearEntries(year: number): Promise<DayEntry[]> {
  return getDaysInRange(`${year}-01-01`, `${year}-12-31`);
}

/* ------------------------------------------------------------------ */
/*  Sauvegarde / restauration                                          */
/*                                                                     */
/*  Format JSON portable : fonctionne aussi bien avec Turso qu'avec    */
/*  une base locale, et reste lisible par un humain.                   */
/* ------------------------------------------------------------------ */

export type BackupPayload = {
  application: 'fromagerie-caprine';
  version: number;
  exportedAt: string;
  database: 'turso' | 'local';
  settings: Settings;
  days: DayEntry[];
};

export function backupFilename(): string {
  return `fromagerie-sauvegarde-${todayISO()}.json`;
}

export async function backupPayload(): Promise<BackupPayload> {
  const db = await getDb();
  const [settings, res] = await Promise.all([
    readSettings(db),
    db.execute('SELECT * FROM jours ORDER BY date'),
  ]);
  return {
    application: 'fromagerie-caprine',
    version: 2,
    exportedAt: new Date().toISOString(),
    database: isRemoteDatabase ? 'turso' : 'local',
    settings,
    days: (res.rows as Row[]).map(rowToEntry),
  };
}

export async function backupJson(): Promise<string> {
  return JSON.stringify(await backupPayload(), null, 2);
}

/** Ancien export JSON : même contenu que la sauvegarde. */
export async function exportJson(): Promise<string> {
  return backupJson();
}

export type RestoreResult = { days: number; settings: Settings };

/**
 * Remplace l'intégralité des données par le contenu d'une sauvegarde JSON.
 * Accepte le format de sauvegarde de l'application (version 1 ou 2).
 */
export async function restorePayload(input: unknown): Promise<RestoreResult> {
  if (!input || typeof input !== 'object') {
    throw new Error('Sauvegarde illisible : objet JSON attendu.');
  }
  const data = input as {
    application?: string;
    days?: unknown;
    settings?: Partial<Settings>;
  };
  if (data.application && data.application !== 'fromagerie-caprine') {
    throw new Error('Ce fichier ne provient pas de cette application.');
  }
  if (!Array.isArray(data.days)) {
    throw new Error('Sauvegarde invalide : la liste « days » est absente.');
  }

  const entries = new Map<string, DayEntry>();
  for (const raw of data.days) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Partial<DayEntry>;
    const date = String(item.date ?? '');
    if (!DATE_RE.test(date)) continue;
    entries.set(date, sanitizeEntry(date, item));
  }
  if (entries.size === 0) {
    throw new Error('Sauvegarde vide : aucune journée valide.');
  }

  const db = await getDb();
  const current = await readSettings(db);
  const inputSettings = data.settings ?? {};
  const openingDate = DATE_RE.test(String(inputSettings.openingDate ?? ''))
    ? String(inputSettings.openingDate)
    : current.openingDate;
  const stock: Stock = {
    brousses: clampQty(inputSettings.openingStock?.brousses ?? current.openingStock.brousses),
    fromages: clampQty(inputSettings.openingStock?.fromages ?? current.openingStock.fromages),
    faisselles: clampQty(inputSettings.openingStock?.faisselles ?? current.openingStock.faisselles),
    tomes: clampQty(inputSettings.openingStock?.tomes ?? current.openingStock.tomes),
  };
  const farmName =
    typeof inputSettings.farmName === 'string' && inputSettings.farmName.trim()
      ? inputSettings.farmName.trim().slice(0, 80)
      : current.farmName;
  const tagline =
    typeof inputSettings.tagline === 'string'
      ? inputSettings.tagline.trim().slice(0, 120)
      : current.tagline;

  const statements: InStatement[] = [
    { sql: 'DELETE FROM jours' },
    { sql: 'DELETE FROM reglages' },
    setting('farm_name', farmName),
    setting('tagline', tagline),
    ...openingStatements(openingDate, stock),
  ];
  for (const entry of entries.values()) statements.push(entryStatement(entry));

  // Transaction unique : soit tout est restauré, soit rien ne change.
  const tx = await db.transaction('write');
  try {
    await tx.batch(statements);
    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }

  return { days: entries.size, settings: { farmName, tagline, openingDate, openingStock: stock } };
}

export async function resetDemoData(): Promise<void> {
  const db = await getDb();
  const today = todayISO();
  const openingDate = demoStartISO(today);
  const statements: InStatement[] = [
    { sql: 'DELETE FROM jours' },
    { sql: 'DELETE FROM reglages' },
    setting('farm_name', 'Fromagerie Caprine'),
    setting('tagline', 'Élevage & transformation fromagère'),
    ...openingStatements(openingDate, DEMO_OPENING_STOCK),
  ];
  for (const day of generateDemoDays(today)) statements.push(entryStatement(day));
  await db.batch(statements, 'write');
}

export async function clearAllData(): Promise<void> {
  const db = await getDb();
  const statements: InStatement[] = [
    { sql: 'DELETE FROM jours' },
    ...openingStatements(todayISO(), emptyStock()),
  ];
  await db.batch(statements, 'write');
}

/* ------------------------------------------------------------------ */
/*  Divers                                                             */
/* ------------------------------------------------------------------ */

export type Stats = {
  days: number;
  firstDate: string | null;
  lastDate: string | null;
  sizeBytes: number;
  storage: 'turso' | 'local';
  databaseLabel: string;
};

export async function getStats(): Promise<Stats> {
  const db = await getDb();
  const res = await db.execute(
    'SELECT COUNT(*) AS n, MIN(date) AS first, MAX(date) AS last FROM jours',
  );
  const row = (res.rows[0] ?? {}) as Row;
  let sizeBytes = 0;
  if (dbPath) {
    try {
      sizeBytes = fs.statSync(dbPath).size;
    } catch {
      /* fichier absent */
    }
  }
  return {
    days: num(row.n),
    firstDate: typeof row.first === 'string' ? row.first : null,
    lastDate: typeof row.last === 'string' ? row.last : null,
    sizeBytes,
    storage: isRemoteDatabase ? 'turso' : 'local',
    databaseLabel: databaseLabel(),
  };
}

export async function getMonthDailyTotals(year: number, month: number) {
  return (await getMonthData(year, month)).days.filter((d) => d.entry && !isDayEmpty(d.entry));
}

export async function getDaysWithLosses(year: number): Promise<DayEntry[]> {
  const db = await getDb();
  const res = await db.execute({
    sql: `SELECT * FROM jours
       WHERE date >= ? AND date <= ?
         AND (perte_brousses > 0 OR perte_fromages > 0 OR perte_tomes > 0 OR perte_lait > 0)
       ORDER BY date`,
    args: [`${year}-01-01`, `${year}-12-31`],
  });
  return (res.rows as Row[]).map(rowToEntry);
}

export type { Client };
