import type { DayEntry } from './types';
import { addStock } from './calc';
import { addDays, todayISO, toISODate, weekday } from './format';

/**
 * Jeu de données de démonstration : les deux mois pleins précédant le mois
 * en cours + le mois en cours jusqu'à la veille. Déterministe (même date =>
 * mêmes chiffres) pour pouvoir être rejoué sans surprise.
 */

export const DEMO_OPENING_STOCK = {
  brousses: 8,
  fromages: 24,
  faisselles: 6,
  tomes: 16,
};

export function demoStartISO(today: string = todayISO()): string {
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  const d = new Date(Date.UTC(y, m - 1, 1));
  d.setUTCMonth(d.getUTCMonth() - 2);
  return toISODate(d);
}

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Saisonnalité laitière approximative (pic au printemps, creux en hiver). */
const SEASON: Record<number, number> = {
  1: 0.7, 2: 0.76, 3: 0.88, 4: 1.0, 5: 1.1,
  6: 1.16, 7: 1.1, 8: 1.02, 9: 0.97, 10: 0.9,
  11: 0.84, 12: 0.74,
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function generateDemoDays(today: string = todayISO()): DayEntry[] {
  const start = demoStartISO(today);
  const end = addDays(today, -1);
  const days: DayEntry[] = [];
  let stock = { ...DEMO_OPENING_STOCK };

  for (let iso = start; iso <= end; iso = addDays(iso, 1)) {
    const r = rng(hash(iso));
    const dow = weekday(iso);
    const month = Number(iso.slice(5, 7));
    const season = SEASON[month] ?? 1;
    const market = dow === 6 ? 1 : 0; // samedi = marché
    const eveMarket = dow === 5 ? 0.5 : 0;

    // Journée sans fabrication (dimanche, ou rare coupure)
    const works = dow !== 0 && r() > 0.035;

    const entry: DayEntry = {
      date: iso,
      laitBrousses: 0,
      laitFromages: 0,
      laitTomes: 0,
      nbBrousses: 0,
      nbFromages: 0,
      nbFaisselles: 0,
      nbTomes: 0,
      venteBrousses: 0,
      venteFromages: 0,
      venteFaisselles: 0,
      venteTomes: 0,
      consoBrousses: 0,
      consoFromages: 0,
      consoFaisselles: 0,
      consoTomes: 0,
      perteBrousses: 0,
      perteFromages: 0,
      perteTomes: 0,
      perteLait: 0,
      deduirePertes: r() > 0.12,
      note: '',
    };

    if (works) {
      const total = 60 * season * (0.88 + r() * 0.24);
      const lB = round1(total * 0.28 * (0.9 + r() * 0.2));
      const lF = round1(total * 0.54 * (0.9 + r() * 0.2));
      const lT = round1(Math.max(4, total * 0.18 * (0.85 + r() * 0.3)));
      entry.laitBrousses = lB;
      entry.laitFromages = lF;
      entry.laitTomes = lT;
      entry.nbBrousses = Math.max(1, Math.round(lB * 1.02 * (0.94 + r() * 0.12)));
      entry.nbFromages = Math.max(1, Math.round(lF * 0.52 * (0.94 + r() * 0.12)));
      entry.nbFaisselles = Math.max(1, Math.round(lF * 0.72 * (0.92 + r() * 0.16)));
      entry.nbTomes = Math.max(1, Math.round(lT / 5));
    }

    stock = addStock(stock, {
      brousses: entry.nbBrousses,
      fromages: entry.nbFromages,
      faisselles: entry.nbFaisselles,
      tomes: entry.nbTomes,
    });

    // --- Ventes (les samedis de marché écoulent davantage) -----------
    const noisy = (base: number, spread: number) =>
      Math.max(0, Math.round(base * (1 - spread + r() * spread * 2)));

    let vB = noisy(11 + market * 7 + eveMarket * 3 + (dow === 2 ? 1.5 : 0), 0.35);
    let vF = noisy(13 + market * 5 + eveMarket * 2, 0.32);
    let vFa = noisy(15 + market * 7 + eveMarket * 3, 0.35);
    let vT = Math.round(1.2 + market * 1.1 + (r() < 0.25 ? 1 : 0));

    vB = Math.min(vB, Math.floor(stock.brousses));
    vF = Math.min(vF, Math.floor(stock.fromages));
    vFa = Math.min(vFa, Math.floor(stock.faisselles));
    vT = Math.min(vT, Math.floor(stock.tomes));
    entry.venteBrousses = vB;
    entry.venteFromages = vF;
    entry.venteFaisselles = vFa;
    entry.venteTomes = vT;
    stock = addStock(stock, { brousses: -vB, fromages: -vF, faisselles: -vFa, tomes: -vT });

    // --- Autoconsommation ------------------------------------------
    if (r() < 0.28) entry.consoBrousses = Math.min(1 + (r() < 0.2 ? 1 : 0), Math.floor(stock.brousses));
    if (r() < 0.2) entry.consoFromages = Math.min(1, Math.floor(stock.fromages));
    if (r() < 0.25) entry.consoFaisselles = Math.min(1 + (r() < 0.15 ? 1 : 0), Math.floor(stock.faisselles));
    if (r() < 0.08) entry.consoTomes = Math.min(1, Math.floor(stock.tomes));
    stock = addStock(stock, {
      brousses: -entry.consoBrousses,
      fromages: -entry.consoFromages,
      faisselles: -entry.consoFaisselles,
      tomes: -entry.consoTomes,
    });

    // --- Pertes / rebuts -------------------------------------------
    if (r() < 0.09) entry.perteBrousses = Math.min(1, Math.floor(stock.brousses));
    if (r() < 0.07) entry.perteFromages = Math.min(1, Math.floor(stock.fromages));
    if (r() < 0.05) entry.perteTomes = Math.min(1, Math.floor(stock.tomes));
    if (r() < 0.14) entry.perteLait = round1(0.4 + r() * 1.8);
    if (r() < 0.04) entry.note = 'Caille doux — surveiller l’égouttage';
    if (r() < 0.03) entry.note = 'Fromages retournés / affinage cave';

    if (entry.deduirePertes) {
      stock = addStock(stock, {
        brousses: -entry.perteBrousses,
        fromages: -entry.perteFromages,
        faisselles: 0,
        tomes: -entry.perteTomes,
      });
    }

    days.push(entry);
  }

  return days;
}

export const DEMO_DESCRIPTION = `Données de démonstration du ${demoStartISO()} à la veille de la date du jour.`;
