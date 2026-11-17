/* ------------------------------------------------------------------ */
/*  Modèle de données partagé (serveur + client)                       */
/* ------------------------------------------------------------------ */

export const PRODUCTS = ['brousses', 'fromages', 'faisselles', 'tomes'] as const;
export type Product = (typeof PRODUCTS)[number];

export type Stock = Record<Product, number>;

export const PRODUCT_LABELS: Record<Product, string> = {
  brousses: 'Brousses',
  fromages: 'Fromages',
  faisselles: 'Faisselles',
  tomes: 'Tomes',
};

export const PRODUCT_SINGULAR: Record<Product, string> = {
  brousses: 'Brousse',
  fromages: 'Fromage',
  faisselles: 'Faisselle',
  tomes: 'Tome',
};

export type DayEntry = {
  date: string; // ISO — YYYY-MM-DD
  laitBrousses: number;
  laitFromages: number;
  laitTomes: number;
  nbBrousses: number;
  nbFromages: number;
  nbFaisselles: number;
  nbTomes: number;
  venteBrousses: number;
  venteFromages: number;
  venteFaisselles: number;
  venteTomes: number;
  consoBrousses: number;
  consoFromages: number;
  consoFaisselles: number;
  consoTomes: number;
  perteBrousses: number;
  perteFromages: number;
  perteTomes: number;
  perteLait: number;
  deduirePertes: boolean;
  note: string;
  updatedAt?: string;
};

export type Settings = {
  farmName: string;
  tagline: string;
  openingDate: string;
  openingStock: Stock;
};

export type DayComputed = {
  date: string;
  entry: DayEntry | null;
  stockBefore: Stock;
  stockAfter: Stock;
  laitTotal: number;
  productionPieces: number;
  ventePieces: number;
  consoPieces: number;
  pertePieces: number;
  rendementBrousses: number | null;
  rendementFromages: number | null;
  negative: boolean;
};

export type MonthTotals = {
  laitBrousses: number;
  laitFromages: number;
  laitTomes: number;
  laitTotal: number;
  nb: Stock;
  ventes: Stock;
  conso: Stock;
  pertes: { brousses: number; fromages: number; tomes: number; lait: number };
  pertePieces: number;
  productionPieces: number;
  ventePieces: number;
  consoPieces: number;
  rendementBrousses: number | null; // moyenne des jours travaillés
  rendementFromages: number | null;
  rendementGlobalBrousses: number | null; // pièces totales / litres totaux
  rendementGlobalFromages: number | null;
  joursTravailles: number;
  joursSaisis: number;
};

export type MonthData = {
  year: number;
  month: number; // 1..12
  days: DayComputed[];
  totals: MonthTotals;
  stockDebut: Stock;
  stockFin: Stock;
  negativeDays: string[];
};

export type YearData = {
  year: number;
  months: MonthData[];
  totals: MonthTotals;
  stockDebut: Stock;
  stockFin: Stock;
};

/* ------------------------------------------------------------------ */
/*  Ventes & recettes (caisse)                                         */
/* ------------------------------------------------------------------ */

export const PAYMENT_METHODS = ['especes', 'carte'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  especes: 'Espèces',
  carte: 'Carte bancaire (TPE)',
};

export type SaleEntry = {
  id: number; // 0 = vente pas encore enregistrée
  date: string; // ISO — YYYY-MM-DD
  montant: number; // euros
  moyen: PaymentMethod;
  note: string;
  updatedAt?: string;
};

export type SalesTotals = {
  especes: number;
  carte: number;
  total: number;
  count: number;
};
