import {
  PRODUCTS,
  type DayEntry,
  type MonthData,
  type MonthTotals,
  type Product,
  type Stock,
} from './types';

/* --- Construction ------------------------------------------------ */

export const ZERO_STOCK: Stock = { brousses: 0, fromages: 0, faisselles: 0, tomes: 0 };

export function emptyStock(): Stock {
  return { ...ZERO_STOCK };
}

export function zeroDay(date: string): DayEntry {
  return {
    date,
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
    deduirePertes: true,
    note: '',
  };
}

/* --- Litrage / transformation ------------------------------------ */

export function laitTotal(e: DayEntry): number {
  return e.laitBrousses + e.laitFromages + e.laitTomes;
}

/** Rendement = pièces produites / litres mis en fabrication (null si pas de lait). */
export function rendement(pieces: number, litres: number): number | null {
  if (!litres || litres <= 0) return null;
  return pieces / litres;
}

export function rendementBrousses(e: DayEntry): number | null {
  return rendement(e.nbBrousses, e.laitBrousses);
}

export function rendementFromages(e: DayEntry): number | null {
  return rendement(e.nbFromages, e.laitFromages);
}

export function productionPieces(e: DayEntry): number {
  return e.nbBrousses + e.nbFromages + e.nbFaisselles + e.nbTomes;
}

export function ventePieces(e: DayEntry): number {
  return e.venteBrousses + e.venteFromages + e.venteFaisselles + e.venteTomes;
}

export function consoPieces(e: DayEntry): number {
  return e.consoBrousses + e.consoFromages + e.consoFaisselles + e.consoTomes;
}

export function pertePieces(e: DayEntry): number {
  return e.perteBrousses + e.perteFromages + e.perteTomes;
}

/** Variante « équivalent fromages » d'une perte de lait : 1 L = 2 fromages. */
export function perteLaitEquivFromages(litres: number): number {
  return litres * 2;
}

/* --- Stock -------------------------------------------------------- */

/** Mouvement net de stock du jour (production − ventes − consommation − pertes déduites). */
export function mouvements(e: DayEntry): Stock {
  const ded = e.deduirePertes ? 1 : 0;
  return {
    brousses: e.nbBrousses - e.venteBrousses - e.consoBrousses - e.perteBrousses * ded,
    fromages: e.nbFromages - e.venteFromages - e.consoFromages - e.perteFromages * ded,
    faisselles: e.nbFaisselles - e.venteFaisselles - e.consoFaisselles,
    tomes: e.nbTomes - e.venteTomes - e.consoTomes - e.perteTomes * ded,
  };
}

export function addStock(a: Stock, b: Stock): Stock {
  return {
    brousses: a.brousses + b.brousses,
    fromages: a.fromages + b.fromages,
    faisselles: a.faisselles + b.faisselles,
    tomes: a.tomes + b.tomes,
  };
}

export function stockAfter(entry: DayEntry, before: Stock): Stock {
  return addStock(before, mouvements(entry));
}

export function hasNegative(s: Stock): boolean {
  return PRODUCTS.some((p) => s[p] < -0.001);
}

export function isDayEmpty(e: DayEntry | null): boolean {
  if (!e) return true;
  return (
    laitTotal(e) === 0 &&
    productionPieces(e) === 0 &&
    ventePieces(e) === 0 &&
    consoPieces(e) === 0 &&
    pertePieces(e) === 0 &&
    e.perteLait === 0
  );
}

/* --- Agrégats ----------------------------------------------------- */

export function emptyTotals(): MonthTotals {
  return {
    laitBrousses: 0,
    laitFromages: 0,
    laitTomes: 0,
    laitTotal: 0,
    nb: emptyStock(),
    ventes: emptyStock(),
    conso: emptyStock(),
    pertes: { brousses: 0, fromages: 0, tomes: 0, lait: 0 },
    pertePieces: 0,
    productionPieces: 0,
    ventePieces: 0,
    consoPieces: 0,
    rendementBrousses: null,
    rendementFromages: null,
    rendementGlobalBrousses: null,
    rendementGlobalFromages: null,
    joursTravailles: 0,
    joursSaisis: 0,
  };
}

/**
 * Agrège une liste de jours. Les moyennes de rendement sont calculées
 * uniquement sur les jours réellement travaillés (litrage > 0), comme
 * la formule =MOYENNE() du classeur Excel.
 */
export const NB_FIELD: Record<Product, keyof DayEntry> = {
  brousses: 'nbBrousses',
  fromages: 'nbFromages',
  faisselles: 'nbFaisselles',
  tomes: 'nbTomes',
};

export const VENTE_FIELD: Record<Product, keyof DayEntry> = {
  brousses: 'venteBrousses',
  fromages: 'venteFromages',
  faisselles: 'venteFaisselles',
  tomes: 'venteTomes',
};

export const CONSO_FIELD: Record<Product, keyof DayEntry> = {
  brousses: 'consoBrousses',
  fromages: 'consoFromages',
  faisselles: 'consoFaisselles',
  tomes: 'consoTomes',
};

export const PERTE_FIELD: Partial<Record<Product, keyof DayEntry>> = {
  brousses: 'perteBrousses',
  fromages: 'perteFromages',
  tomes: 'perteTomes',
};

export function aggregate(days: Array<DayEntry | null>): MonthTotals {
  const t = emptyTotals();
  let sumRendB = 0;
  let countRendB = 0;
  let sumRendF = 0;
  let countRendF = 0;

  for (const e of days) {
    if (!e || isDayEmpty(e)) continue;
    t.joursSaisis += 1;
    t.laitBrousses += e.laitBrousses;
    t.laitFromages += e.laitFromages;
    t.laitTomes += e.laitTomes;
    for (const p of PRODUCTS) {
      t.nb[p] += e[NB_FIELD[p]] as number;
      t.ventes[p] += e[VENTE_FIELD[p]] as number;
      t.conso[p] += e[CONSO_FIELD[p]] as number;
    }
    t.pertes.brousses += e.perteBrousses;
    t.pertes.fromages += e.perteFromages;
    t.pertes.tomes += e.perteTomes;
    t.pertes.lait += e.perteLait;
    t.productionPieces += productionPieces(e);
    t.ventePieces += ventePieces(e);
    t.consoPieces += consoPieces(e);
    t.pertePieces += pertePieces(e);

    const rb = rendementBrousses(e);
    if (rb !== null) {
      sumRendB += rb;
      countRendB += 1;
      t.joursTravailles += 1;
    }
    const rf = rendementFromages(e);
    if (rf !== null) {
      sumRendF += rf;
      countRendF += 1;
    }
  }

  t.laitTotal = t.laitBrousses + t.laitFromages + t.laitTomes;
  t.rendementBrousses = countRendB ? sumRendB / countRendB : null;
  t.rendementFromages = countRendF ? sumRendF / countRendF : null;
  t.rendementGlobalBrousses = t.laitBrousses > 0 ? t.nb.brousses / t.laitBrousses : null;
  t.rendementGlobalFromages = t.laitFromages > 0 ? t.nb.fromages / t.laitFromages : null;
  return t;
}

export function mergeTotals(a: MonthTotals, b: MonthTotals): MonthTotals {
  const out = emptyTotals();
  out.laitBrousses = a.laitBrousses + b.laitBrousses;
  out.laitFromages = a.laitFromages + b.laitFromages;
  out.laitTomes = a.laitTomes + b.laitTomes;
  out.laitTotal = a.laitTotal + b.laitTotal;
  for (const p of PRODUCTS) {
    out.nb[p] = a.nb[p] + b.nb[p];
    out.ventes[p] = a.ventes[p] + b.ventes[p];
    out.conso[p] = a.conso[p] + b.conso[p];
  }
  out.pertes = {
    brousses: a.pertes.brousses + b.pertes.brousses,
    fromages: a.pertes.fromages + b.pertes.fromages,
    tomes: a.pertes.tomes + b.pertes.tomes,
    lait: a.pertes.lait + b.pertes.lait,
  };
  out.productionPieces = a.productionPieces + b.productionPieces;
  out.ventePieces = a.ventePieces + b.ventePieces;
  out.consoPieces = a.consoPieces + b.consoPieces;
  out.pertePieces = a.pertePieces + b.pertePieces;
  out.joursTravailles = a.joursTravailles + b.joursTravailles;
  out.joursSaisis = a.joursSaisis + b.joursSaisis;
  out.rendementBrousses =
    out.laitBrousses > 0 ? out.nb.brousses / out.laitBrousses : null;
  out.rendementFromages =
    out.laitFromages > 0 ? out.nb.fromages / out.laitFromages : null;
  out.rendementGlobalBrousses = out.rendementBrousses;
  out.rendementGlobalFromages = out.rendementFromages;
  return out;
}

function cap(p: Product): string {
  return p.charAt(0).toUpperCase() + p.slice(1);
}

/** Répartition en % d'une valeur dans un total (0 si total nul). */
export function pct(value: number, total: number): number {
  return total > 0 ? (value / total) * 100 : 0;
}
