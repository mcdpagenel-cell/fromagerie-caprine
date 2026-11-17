import 'server-only';
import path from 'node:path';

import { createClient, type Client, type InStatement } from '@libsql/client';

import type { DayEntry, PaymentMethod, SaleEntry, Settings, Stock } from './types';
import { DEMO_OPENING_STOCK, demoStartISO, generateDemoDays } from './seed';
import { todayISO } from './format';

/* ------------------------------------------------------------------ */
/*  Connexion libSQL                                                   */
/*                                                                     */
/*  • En ligne (Vercel, Render…) : Turso                              */
/*      TURSO_DATABASE_URL=libsql://<base>-<org>.turso.io              */
/*      TURSO_AUTH_TOKEN=<jeton>                                       */
/*  • En local (développement) : fichier SQLite via libSQL             */
/*      data/fromagerie.db                                             */
/* ------------------------------------------------------------------ */

const DATA_DIR = process.env.FROMAGERIE_DATA_DIR || path.join(process.cwd(), 'data');
const LOCAL_DB = process.env.FROMAGERIE_DB || path.join(DATA_DIR, 'fromagerie.db');
const REMOTE_URL = (process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL || '').trim();
const AUTH_TOKEN = (process.env.TURSO_AUTH_TOKEN || '').trim();

export const isRemoteDatabase = REMOTE_URL.length > 0;
export const databaseUrl = isRemoteDatabase ? REMOTE_URL : `file:${LOCAL_DB}`;
/** Chemin du fichier local (null si la base est distante). */
export const dbPath = isRemoteDatabase ? null : LOCAL_DB;

export function databaseLabel(): string {
  if (!isRemoteDatabase) return `data/fromagerie.db (local)`;
  try {
    const host = new URL(REMOTE_URL).host;
    return host ? `Turso · ${host}` : 'Turso (base libSQL distante)';
  } catch {
    return 'Turso (base distante)';
  }
}

type DbGlobal = typeof globalThis & {
  __fromagerieClient?: Client;
  __fromagerieReady?: Promise<void>;
};

const g = globalThis as DbGlobal;

function client(): Client {
  if (!g.__fromagerieClient) {
    g.__fromagerieClient = createClient({
      url: databaseUrl,
      authToken: isRemoteDatabase && AUTH_TOKEN ? AUTH_TOKEN : undefined,
    });
  }
  return g.__fromagerieClient;
}

/* ------------------------------------------------------------------ */
/*  Schéma                                                             */
/* ------------------------------------------------------------------ */

const DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS jours (
    date             TEXT PRIMARY KEY,
    lait_brousses    REAL NOT NULL DEFAULT 0,
    lait_fromages    REAL NOT NULL DEFAULT 0,
    lait_tomes       REAL NOT NULL DEFAULT 0,
    nb_brousses      REAL NOT NULL DEFAULT 0,
    nb_fromages      REAL NOT NULL DEFAULT 0,
    nb_faisselles    REAL NOT NULL DEFAULT 0,
    nb_tomes         REAL NOT NULL DEFAULT 0,
    vente_brousses   REAL NOT NULL DEFAULT 0,
    vente_fromages   REAL NOT NULL DEFAULT 0,
    vente_faisselles REAL NOT NULL DEFAULT 0,
    vente_tomes      REAL NOT NULL DEFAULT 0,
    conso_brousses   REAL NOT NULL DEFAULT 0,
    conso_fromages   REAL NOT NULL DEFAULT 0,
    conso_faisselles REAL NOT NULL DEFAULT 0,
    conso_tomes      REAL NOT NULL DEFAULT 0,
    perte_brousses   REAL NOT NULL DEFAULT 0,
    perte_fromages   REAL NOT NULL DEFAULT 0,
    perte_tomes      REAL NOT NULL DEFAULT 0,
    perte_lait       REAL NOT NULL DEFAULT 0,
    deduire_pertes   INTEGER NOT NULL DEFAULT 1,
    note             TEXT NOT NULL DEFAULT '',
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS reglages (
    cle    TEXT PRIMARY KEY,
    valeur TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS ventes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    date       TEXT NOT NULL,
    montant    REAL NOT NULL DEFAULT 0,
    moyen      TEXT NOT NULL DEFAULT 'especes',
    note       TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_jours_date ON jours(date)`,
  `CREATE INDEX IF NOT EXISTS idx_ventes_date ON ventes(date)`,
];

/* ------------------------------------------------------------------ */
/*  Conversions ligne SQLite <-> objet métier                          */
/* ------------------------------------------------------------------ */

type Row = Record<string, unknown>;

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function rowToEntry(row: Row): DayEntry {
  return {
    date: String(row.date),
    laitBrousses: num(row.lait_brousses),
    laitFromages: num(row.lait_fromages),
    laitTomes: num(row.lait_tomes),
    nbBrousses: num(row.nb_brousses),
    nbFromages: num(row.nb_fromages),
    nbFaisselles: num(row.nb_faisselles),
    nbTomes: num(row.nb_tomes),
    venteBrousses: num(row.vente_brousses),
    venteFromages: num(row.vente_fromages),
    venteFaisselles: num(row.vente_faisselles),
    venteTomes: num(row.vente_tomes),
    consoBrousses: num(row.conso_brousses),
    consoFromages: num(row.conso_fromages),
    consoFaisselles: num(row.conso_faisselles),
    consoTomes: num(row.conso_tomes),
    perteBrousses: num(row.perte_brousses),
    perteFromages: num(row.perte_fromages),
    perteTomes: num(row.perte_tomes),
    perteLait: num(row.perte_lait),
    deduirePertes: num(row.deduire_pertes) !== 0,
    note: typeof row.note === 'string' ? row.note : '',
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : undefined,
  };
}

const UPSERT = `
INSERT INTO jours (
  date, lait_brousses, lait_fromages, lait_tomes,
  nb_brousses, nb_fromages, nb_faisselles, nb_tomes,
  vente_brousses, vente_fromages, vente_faisselles, vente_tomes,
  conso_brousses, conso_fromages, conso_faisselles, conso_tomes,
  perte_brousses, perte_fromages, perte_tomes, perte_lait,
  deduire_pertes, note, created_at, updated_at
) VALUES (
  ?, ?, ?, ?,
  ?, ?, ?, ?,
  ?, ?, ?, ?,
  ?, ?, ?, ?,
  ?, ?, ?, ?,
  ?, ?, ?, ?
)
ON CONFLICT(date) DO UPDATE SET
  lait_brousses = excluded.lait_brousses,
  lait_fromages = excluded.lait_fromages,
  lait_tomes = excluded.lait_tomes,
  nb_brousses = excluded.nb_brousses,
  nb_fromages = excluded.nb_fromages,
  nb_faisselles = excluded.nb_faisselles,
  nb_tomes = excluded.nb_tomes,
  vente_brousses = excluded.vente_brousses,
  vente_fromages = excluded.vente_fromages,
  vente_faisselles = excluded.vente_faisselles,
  vente_tomes = excluded.vente_tomes,
  conso_brousses = excluded.conso_brousses,
  conso_fromages = excluded.conso_fromages,
  conso_faisselles = excluded.conso_faisselles,
  conso_tomes = excluded.conso_tomes,
  perte_brousses = excluded.perte_brousses,
  perte_fromages = excluded.perte_fromages,
  perte_tomes = excluded.perte_tomes,
  perte_lait = excluded.perte_lait,
  deduire_pertes = excluded.deduire_pertes,
  note = excluded.note,
  updated_at = excluded.updated_at
`;

export function entryStatement(e: DayEntry, now = new Date().toISOString()): InStatement {
  return {
    sql: UPSERT,
    args: [
      e.date,
      e.laitBrousses,
      e.laitFromages,
      e.laitTomes,
      e.nbBrousses,
      e.nbFromages,
      e.nbFaisselles,
      e.nbTomes,
      e.venteBrousses,
      e.venteFromages,
      e.venteFaisselles,
      e.venteTomes,
      e.consoBrousses,
      e.consoFromages,
      e.consoFaisselles,
      e.consoTomes,
      e.perteBrousses,
      e.perteFromages,
      e.perteTomes,
      e.perteLait,
      e.deduirePertes ? 1 : 0,
      e.note ?? '',
      now,
      now,
    ],
  };
}

export async function insertEntry(client: Client, e: DayEntry): Promise<void> {
  await client.execute(entryStatement(e));
}

/* ------------------------------------------------------------------ */
/*  Ventes (caisse)                                                    */
/* ------------------------------------------------------------------ */

export function rowToSale(row: Row): SaleEntry {
  const moyen: PaymentMethod = row.moyen === 'carte' ? 'carte' : 'especes';
  return {
    id: num(row.id),
    date: String(row.date),
    montant: num(row.montant),
    moyen,
    note: typeof row.note === 'string' ? row.note : '',
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : undefined,
  };
}

export function saleInsertStatement(
  s: { date: string; montant: number; moyen: PaymentMethod; note: string },
  now = new Date().toISOString(),
): InStatement {
  return {
    sql: `INSERT INTO ventes (date, montant, moyen, note, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [s.date, s.montant, s.moyen, s.note, now, now],
  };
}

export function saleUpdateStatement(
  id: number,
  s: { date: string; montant: number; moyen: PaymentMethod; note: string },
  now = new Date().toISOString(),
): InStatement {
  return {
    sql: `UPDATE ventes
          SET date = ?, montant = ?, moyen = ?, note = ?, updated_at = ?
          WHERE id = ?`,
    args: [s.date, s.montant, s.moyen, s.note, now, id],
  };
}

/* ------------------------------------------------------------------ */
/*  Réglages                                                           */
/* ------------------------------------------------------------------ */

export const DEFAULT_SETTINGS: Settings = {
  farmName: 'Fromagerie Caprine',
  tagline: 'Élevage & transformation fromagère',
  openingDate: todayISO(),
  openingStock: { brousses: 0, fromages: 0, faisselles: 0, tomes: 0 },
};

export async function readSettings(client?: Client): Promise<Settings> {
  const db = client ?? (await getDb());
  const res = await db.execute('SELECT cle, valeur FROM reglages');
  const map = new Map(
    (res.rows as Row[]).map((r) => [String(r.cle), String(r.valeur)]),
  );
  const n = (key: string, fallback = 0) => {
    const v = map.get(key);
    if (v === undefined) return fallback;
    const parsed = Number(v);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  return {
    farmName: map.get('farm_name') ?? DEFAULT_SETTINGS.farmName,
    tagline: map.get('tagline') ?? DEFAULT_SETTINGS.tagline,
    openingDate: map.get('opening_date') ?? DEFAULT_SETTINGS.openingDate,
    openingStock: {
      brousses: n('opening_brousses'),
      fromages: n('opening_fromages'),
      faisselles: n('opening_faisselles'),
      tomes: n('opening_tomes'),
    },
  };
}

export function settingStatement(key: string, value: string): InStatement {
  return {
    sql: 'INSERT INTO reglages (cle, valeur) VALUES (?, ?) ON CONFLICT(cle) DO UPDATE SET valeur = excluded.valeur',
    args: [key, value],
  };
}

export async function writeSetting(client: Client, key: string, value: string): Promise<void> {
  await client.execute(settingStatement(key, value));
}

export function openingStockStatements(date: string, stock: Stock): InStatement[] {
  return [
    settingStatement('opening_date', date),
    settingStatement('opening_brousses', String(stock.brousses)),
    settingStatement('opening_fromages', String(stock.fromages)),
    settingStatement('opening_faisselles', String(stock.faisselles)),
    settingStatement('opening_tomes', String(stock.tomes)),
  ];
}

export async function writeOpeningStock(
  client: Client,
  date: string,
  stock: Stock,
): Promise<void> {
  for (const stmt of openingStockStatements(date, stock)) {
    await client.execute(stmt);
  }
}

export function defaultSettingStatements(
  openingDate: string,
  stock: Stock,
): InStatement[] {
  return [
    settingStatement('farm_name', DEFAULT_SETTINGS.farmName),
    settingStatement('tagline', DEFAULT_SETTINGS.tagline),
    ...openingStockStatements(openingDate, stock),
  ];
}

/* ------------------------------------------------------------------ */
/*  Initialisation + jeu de démonstration                              */
/* ------------------------------------------------------------------ */

async function initialize(client: Client): Promise<void> {
  if (!isRemoteDatabase) {
    try {
      await client.execute('PRAGMA journal_mode = WAL');
    } catch {
      /* sans importance */
    }
  }

  await client.batch(DDL, 'write');

  const daysCount = await client.execute('SELECT COUNT(*) AS n FROM jours');
  const settingsCount = await client.execute('SELECT COUNT(*) AS n FROM reglages');
  const empty =
    num((daysCount.rows[0] as Row | undefined)?.n) === 0 &&
    num((settingsCount.rows[0] as Row | undefined)?.n) === 0;
  if (!empty) return;

  const demo = process.env.DEMO_DATA !== '0';
  const today = todayISO();
  const openingDate = demo ? demoStartISO(today) : today;

  const statements: InStatement[] = defaultSettingStatements(
    openingDate,
    demo ? DEMO_OPENING_STOCK : { brousses: 0, fromages: 0, faisselles: 0, tomes: 0 },
  );
  if (demo) {
    for (const day of generateDemoDays(today)) statements.push(entryStatement(day));
  }

  // Un seul lot = une seule transaction : pas de base à moitié initialisée.
  await client.batch(statements, 'write');
}

/** Renvoie un client prêt (schéma créé, réglages et démo initialisés si besoin). */
export async function getDb(): Promise<Client> {
  const db = client();
  if (!g.__fromagerieReady) {
    g.__fromagerieReady = initialize(db).catch((err) => {
      // En cas d'échec (réseau, jeton…), on autorise une nouvelle tentative.
      g.__fromagerieReady = undefined;
      throw err;
    });
  }
  await g.__fromagerieReady;
  return db;
}

/** Utilisé par les tests / scripts : force une nouvelle initialisation. */
export async function closeDb(): Promise<void> {
  try {
    g.__fromagerieClient?.close();
  } catch {
    /* déjà fermé */
  }
  g.__fromagerieClient = undefined;
  g.__fromagerieReady = undefined;
}
