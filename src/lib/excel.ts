import 'server-only';
import ExcelJS from 'exceljs';

import type { DayComputed, MonthTotals, Product, Stock } from './types';
import {
  MONTHS_FR,
  MONTHS_UPPER,
  SHEET_MONTHS,
  daysInMonth,
  fmtNumber,
  monthLabel,
} from './format';
import { pct } from './calc';

/* ------------------------------------------------------------------ */
/*  Palette & helpers de mise en forme                                 */
/* ------------------------------------------------------------------ */

const COLOR = {
  ink: 'FF3A2C20',
  brand: 'FF9C4A28',
  brandDark: 'FF6F3419',
  cream: 'FFF8F1E7',
  cream2: 'FFF2E7D8',
  sand: 'FFE7D9C6',
  line: 'FFD6C6B1',
  white: 'FFFFFFFF',
  weekend: 'FFFAF4EA',
  alert: 'FFFBEAE7',
  alertInk: 'FF9E2B1E',
  green: 'FF4F6B45',
};

type Style = {
  fill?: string;
  font?: Partial<ExcelJS.Font>;
  align?: Partial<ExcelJS.Alignment>;
  border?: Partial<ExcelJS.Borders>;
  numFmt?: string;
};

const thin: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: COLOR.line } },
  left: { style: 'thin', color: { argb: COLOR.line } },
  bottom: { style: 'thin', color: { argb: COLOR.line } },
  right: { style: 'thin', color: { argb: COLOR.line } },
};

function applyStyle(ws: ExcelJS.Worksheet, r1: number, c1: number, r2: number, c2: number, s: Style) {
  for (let r = r1; r <= r2; r += 1) {
    for (let c = c1; c <= c2; c += 1) {
      const cell = ws.getCell(r, c);
      if (s.fill) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: s.fill } };
      }
      if (s.font) cell.font = { ...(cell.font ?? {}), ...s.font };
      if (s.align) cell.alignment = { ...(cell.alignment ?? {}), ...s.align };
      if (s.border) cell.border = s.border;
      if (s.numFmt) cell.numFmt = s.numFmt;
    }
  }
}

function colLetter(col: number): string {
  let n = col;
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

const q = (name: string) => `'${name.replace(/'/g, "''")}'`;

function sheetName(year: number, month: number): string {
  return `${SHEET_MONTHS[month - 1]} ${String(year).slice(2)}`;
}

/* ------------------------------------------------------------------ */
/*  Disposition commune de la feuille mensuelle                        */
/* ------------------------------------------------------------------ */

const C = {
  date: 1,
  laitBrousses: 2,
  laitFromages: 3,
  laitTomes: 4,
  laitTotal: 5,
  nbBrousses: 6,
  nbFromages: 7,
  nbFaisselles: 8,
  nbTomes: 9,
  rendBrousses: 10,
  rendFromages: 11,
  venteBrousses: 12,
  venteFromages: 13,
  venteFaisselles: 14,
  venteTomes: 15,
  consoBrousses: 16,
  consoFromages: 17,
  consoFaisselles: 18,
  consoTomes: 19,
  perteBrousses: 20,
  perteFromages: 21,
  perteTomes: 22,
  perteLait: 23,
  stockBrousses: 24,
  stockFromages: 25,
  stockFaisselles: 26,
  stockTomes: 27,
  prevBrousses: 28,
  prevFromages: 29,
  prevFaisselles: 30,
  prevTomes: 31,
  deduct: 32,
};

const LAST_COL = 32;
const DATA_FIRST = 4;
const TOTAL_ROW = 36;
const FMT_L = '0.0#';
const FMT_N = '0.##';
const FMT_R = '0.00';
const FMT_PCT = '0.0%';

type MonthSheetOptions = {
  year: number;
  month: number;
  days: DayComputed[];
  farmName: string;
  previousStock: Stock;
  /** Nom de l'onglet du mois précédent : active les formules inter-onglets. */
  previousSheet?: string;
};

function writeMonthSheet(wb: ExcelJS.Workbook, opts: MonthSheetOptions): ExcelJS.Worksheet {
  const { year, month, days, farmName, previousStock, previousSheet } = opts;
  const name = sheetName(year, month);
  const dim = daysInMonth(year, month);
  const lastDayRow = DATA_FIRST + dim - 1;

  const ws = wb.addWorksheet(name, {
    views: [{ state: 'frozen', xSplit: 1, ySplit: 3, showGridLines: true }],
    pageSetup: {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      printTitlesRow: '1:3',
      printArea: `A1:${colLetter(LAST_COL)}${TOTAL_ROW + 9}`,
      margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.25, footer: 0.25 },
    },
    headerFooter: {
      oddFooter: `&L${farmName}&C&A&RPage &P / &N`,
    },
  });

  ws.properties.defaultRowHeight = 17;

  // Largeurs de colonnes
  const widths: Record<number, number> = {
    [C.date]: 15,
    [C.laitTotal]: 9,
    [C.rendBrousses]: 10,
    [C.rendFromages]: 10,
    [C.perteLait]: 8,
    [C.deduct]: 9,
    28: 8,
    29: 8,
    30: 8,
    31: 8,
  };
  for (let c = 1; c <= LAST_COL; c += 1) {
    ws.getColumn(c).width = widths[c] ?? (c === 1 ? 15 : 7.2);
  }

  /* --- Titre ------------------------------------------------------ */
  ws.mergeCells(1, 1, 1, LAST_COL);
  const title = ws.getCell(1, 1);
  title.value = `${farmName.toUpperCase()}   —   ${MONTHS_UPPER[month - 1]} ${year}`;
  title.font = { name: 'Calibri', size: 16, bold: true, color: { argb: COLOR.white } };
  title.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 32;
  applyStyle(ws, 1, 1, 1, LAST_COL, { fill: COLOR.brandDark });

  /* --- En-têtes groupés ------------------------------------------- */
  const groups: Array<[number, number, string]> = [
    [C.laitBrousses, C.laitTotal, 'LITRAGE (litres)'],
    [C.nbBrousses, C.nbTomes, 'TRANSFORMATION (pièces)'],
    [C.rendBrousses, C.rendFromages, 'RENDEMENT (pces / litre)'],
    [C.venteBrousses, C.venteTomes, 'VENTE (pièces)'],
    [C.consoBrousses, C.consoTomes, 'CONSOMMATION (pièces)'],
    [C.perteBrousses, C.perteLait, 'PERTES (traçabilité)'],
    [C.stockBrousses, C.stockTomes, 'STOCK'],
    [C.prevBrousses, C.prevTomes, 'STOCK PRÉCÉDENT'],
  ];

  ws.getCell(2, 1).value = 'DATE';
  ws.mergeCells(2, 1, 3, 1);
  for (const [c1, c2, label] of groups) {
    ws.getCell(2, c1).value = label;
    ws.mergeCells(2, c1, 2, c2);
  }
  ws.getCell(2, C.deduct).value = 'PERTES DÉDUITES';
  ws.mergeCells(2, C.deduct, 3, C.deduct);

  applyStyle(ws, 2, 1, 2, LAST_COL, {
    fill: COLOR.brand,
    font: { bold: true, size: 9, color: { argb: COLOR.white } },
    align: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border: thin,
  });
  ws.getRow(2).height = 22;

  const subHeaders: Array<[number, string]> = [
    [C.laitBrousses, 'Lait brousses'],
    [C.laitFromages, 'Lait fromages'],
    [C.laitTomes, 'Lait tomes'],
    [C.laitTotal, 'TOTAL LAIT'],
    [C.nbBrousses, 'Nb brousses'],
    [C.nbFromages, 'Nb fromages'],
    [C.nbFaisselles, 'Nb faisselles'],
    [C.nbTomes, 'Nb tomes'],
    [C.rendBrousses, 'Rend. brousses'],
    [C.rendFromages, 'Rend. fromages'],
    [C.venteBrousses, 'Brousses'],
    [C.venteFromages, 'Fromages'],
    [C.venteFaisselles, 'Faisselles'],
    [C.venteTomes, 'Tomes'],
    [C.consoBrousses, 'Brousses'],
    [C.consoFromages, 'Fromages'],
    [C.consoFaisselles, 'Faisselles'],
    [C.consoTomes, 'Tomes'],
    [C.perteBrousses, 'Brousses'],
    [C.perteFromages, 'Fromages'],
    [C.perteTomes, 'Tomes'],
    [C.perteLait, 'Lait (L)'],
    [C.stockBrousses, 'Brousses'],
    [C.stockFromages, 'Fromages'],
    [C.stockFaisselles, 'Faisselles'],
    [C.stockTomes, 'Tomes'],
    [C.prevBrousses, 'Brousses'],
    [C.prevFromages, 'Fromages'],
    [C.prevFaisselles, 'Faisselles'],
    [C.prevTomes, 'Tomes'],
  ];
  for (const [c, label] of subHeaders) ws.getCell(3, c).value = label;
  applyStyle(ws, 3, 1, 3, LAST_COL, {
    fill: COLOR.cream2,
    font: { bold: true, size: 8, color: { argb: COLOR.ink } },
    align: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border: thin,
  });
  ws.getRow(3).height = 36;

  /* --- Lignes journalières ---------------------------------------- */
  const byDate = new Map(days.map((d) => [d.date, d]));

  for (let d = 1; d <= dim; d += 1) {
    const r = DATA_FIRST + d - 1;
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const day = byDate.get(iso);
    const e = day?.entry ?? null;
    const row = ws.getRow(r);

    // Date (vraie date Excel)
    const dateCell = row.getCell(C.date);
    dateCell.value = new Date(Date.UTC(year, month - 1, d, 12, 0, 0));
    dateCell.numFmt = 'ddd dd/mm/yyyy';
    dateCell.alignment = { horizontal: 'center', vertical: 'middle' };

    if (e) {
      const put = (c: number, v: number, fmt = FMT_N) => {
        if (v) {
          const cell = row.getCell(c);
          cell.value = v;
          cell.numFmt = fmt;
        }
      };
      put(C.laitBrousses, e.laitBrousses, FMT_L);
      put(C.laitFromages, e.laitFromages, FMT_L);
      put(C.laitTomes, e.laitTomes, FMT_L);
      put(C.nbBrousses, e.nbBrousses);
      put(C.nbFromages, e.nbFromages);
      put(C.nbFaisselles, e.nbFaisselles);
      put(C.nbTomes, e.nbTomes);
      put(C.venteBrousses, e.venteBrousses);
      put(C.venteFromages, e.venteFromages);
      put(C.venteFaisselles, e.venteFaisselles);
      put(C.venteTomes, e.venteTomes);
      put(C.consoBrousses, e.consoBrousses);
      put(C.consoFromages, e.consoFromages);
      put(C.consoFaisselles, e.consoFaisselles);
      put(C.consoTomes, e.consoTomes);
      put(C.perteBrousses, e.perteBrousses);
      put(C.perteFromages, e.perteFromages);
      put(C.perteTomes, e.perteTomes);
      put(C.perteLait, e.perteLait, FMT_L);
      row.getCell(C.deduct).value = e.deduirePertes ? 'Oui' : 'Non';
      row.getCell(C.deduct).alignment = { horizontal: 'center' };
      if (e.note) {
        row.getCell(C.date).note = e.note;
      }
    }

    // Formules — restent vivantes même si l'on complète à la main.
    row.getCell(C.laitTotal).value = {
      formula: `IF(SUM(${colLetter(C.laitBrousses)}${r}:${colLetter(C.laitTomes)}${r})=0,"",SUM(${colLetter(C.laitBrousses)}${r}:${colLetter(C.laitTomes)}${r}))`,
    };
    row.getCell(C.laitTotal).numFmt = FMT_L;

    row.getCell(C.rendBrousses).value = {
      formula: `IFERROR(IF(${colLetter(C.laitBrousses)}${r}>0,${colLetter(C.nbBrousses)}${r}/${colLetter(C.laitBrousses)}${r},""),"")`,
    };
    row.getCell(C.rendFromages).value = {
      formula: `IFERROR(IF(${colLetter(C.laitFromages)}${r}>0,${colLetter(C.nbFromages)}${r}/${colLetter(C.laitFromages)}${r},""),"")`,
    };

    // Stock précédent
    if (r === DATA_FIRST) {
      // La ligne TOTAL du mois précédent stocke les stocks finaux en X..AA :
      // on y fait référence explicitement (et non dans la colonne AB..AE).
      const prevCols: Array<[number, number, number]> = [
        [C.prevBrousses, C.stockBrousses, previousStock.brousses],
        [C.prevFromages, C.stockFromages, previousStock.fromages],
        [C.prevFaisselles, C.stockFaisselles, previousStock.faisselles],
        [C.prevTomes, C.stockTomes, previousStock.tomes],
      ];
      for (const [col, stockCol, value] of prevCols) {
        const cell = row.getCell(col);
        if (previousSheet) {
          cell.value = { formula: `${q(previousSheet)}!${colLetter(stockCol)}${TOTAL_ROW}` };
        } else {
          cell.value = value;
        }
        cell.numFmt = FMT_N;
      }
    } else {
      const prevRow = r - 1;
      row.getCell(C.prevBrousses).value = { formula: `${colLetter(C.stockBrousses)}${prevRow}` };
      row.getCell(C.prevFromages).value = { formula: `${colLetter(C.stockFromages)}${prevRow}` };
      row.getCell(C.prevFaisselles).value = { formula: `${colLetter(C.stockFaisselles)}${prevRow}` };
      row.getCell(C.prevTomes).value = { formula: `${colLetter(C.stockTomes)}${prevRow}` };
    }

    const deduct = `IF($${colLetter(C.deduct)}${r}="Oui",`;
    row.getCell(C.stockBrousses).value = {
      formula: `${colLetter(C.prevBrousses)}${r}+${colLetter(C.nbBrousses)}${r}-${colLetter(C.venteBrousses)}${r}-${colLetter(C.consoBrousses)}${r}-${deduct}${colLetter(C.perteBrousses)}${r},0)`,
    };
    row.getCell(C.stockFromages).value = {
      formula: `${colLetter(C.prevFromages)}${r}+${colLetter(C.nbFromages)}${r}-${colLetter(C.venteFromages)}${r}-${colLetter(C.consoFromages)}${r}-${deduct}${colLetter(C.perteFromages)}${r},0)`,
    };
    row.getCell(C.stockFaisselles).value = {
      formula: `${colLetter(C.prevFaisselles)}${r}+${colLetter(C.nbFaisselles)}${r}-${colLetter(C.venteFaisselles)}${r}-${colLetter(C.consoFaisselles)}${r}`,
    };
    row.getCell(C.stockTomes).value = {
      formula: `${colLetter(C.prevTomes)}${r}+${colLetter(C.nbTomes)}${r}-${colLetter(C.venteTomes)}${r}-${colLetter(C.consoTomes)}${r}-${deduct}${colLetter(C.perteTomes)}${r},0)`,
    };
    row.getCell(C.stockTomes).numFmt = FMT_N;

    // Style
    applyStyle(ws, r, 1, r, LAST_COL, { border: thin, font: { size: 9, color: { argb: COLOR.ink } } });
    for (let c = 2; c <= LAST_COL; c += 1) {
      row.getCell(c).alignment = { horizontal: 'center', vertical: 'middle' };
    }
    [C.laitTotal, C.stockBrousses, C.stockFromages, C.stockFaisselles, C.stockTomes].forEach((c) => {
      row.getCell(c).font = { size: 9, bold: true, color: { argb: COLOR.ink } };
    });
    [C.stockBrousses, C.stockFromages, C.stockFaisselles, C.stockTomes].forEach((c) => {
      row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.cream } };
    });
    row.getCell(C.rendBrousses).numFmt = FMT_R;
    row.getCell(C.rendFromages).numFmt = FMT_R;
    row.getCell(C.rendBrousses).font = { size: 9, italic: true, color: { argb: COLOR.green } };
    row.getCell(C.rendFromages).font = { size: 9, italic: true, color: { argb: COLOR.green } };
    row.getCell(C.deduct).font = { size: 8, color: { argb: COLOR.ink } };

    // Week-end légèrement teinté
    const dow = new Date(Date.UTC(year, month - 1, d)).getUTCDay();
    if (dow === 0 || dow === 6) {
      applyStyle(ws, r, 1, r, LAST_COL, { fill: COLOR.weekend });
      [C.stockBrousses, C.stockFromages, C.stockFaisselles, C.stockTomes].forEach((c) => {
        row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.sand } };
      });
    }
    row.height = 17;
  }

  // Ligne vide de séparation (ligne 35) → TOTAL en ligne 36 comme le classeur d'origine
  applyStyle(ws, lastDayRow + 1, 1, TOTAL_ROW, LAST_COL, { border: thin });

  /* --- Ligne TOTAL ------------------------------------------------- */
  const tr = TOTAL_ROW;
  const totalRow = ws.getRow(tr);
  totalRow.getCell(1).value = 'TOTAL';
  const sumRange = (col: number) =>
    `SUM(${colLetter(col)}${DATA_FIRST}:${colLetter(col)}${lastDayRow})`;

  for (const c of [2, 3, 4, 5, 6, 7, 8, 9, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]) {
    totalRow.getCell(c).value = { formula: sumRange(c) };
  }
  totalRow.getCell(C.rendBrousses).value = {
    formula: `IFERROR(AVERAGE(${colLetter(C.rendBrousses)}${DATA_FIRST}:${colLetter(C.rendBrousses)}${lastDayRow}),"")`,
  };
  totalRow.getCell(C.rendFromages).value = {
    formula: `IFERROR(AVERAGE(${colLetter(C.rendFromages)}${DATA_FIRST}:${colLetter(C.rendFromages)}${lastDayRow}),"")`,
  };
  for (const c of [24, 25, 26, 27]) {
    totalRow.getCell(c).value = { formula: `${colLetter(c)}${lastDayRow}` };
  }
  totalRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  totalRow.numFmt = FMT_N;
  for (const c of [2, 3, 4, 5, 23]) totalRow.getCell(c).numFmt = FMT_L;
  totalRow.getCell(C.rendBrousses).numFmt = FMT_R;
  totalRow.getCell(C.rendFromages).numFmt = FMT_R;
  totalRow.height = 24;

  applyStyle(ws, tr, 1, tr, LAST_COL, {
    fill: COLOR.cream2,
    font: { bold: true, size: 10, color: { argb: COLOR.brandDark } },
    border: {
      top: { style: 'double', color: { argb: COLOR.brand } },
      left: { style: 'thin', color: { argb: COLOR.line } },
      bottom: { style: 'thin', color: { argb: COLOR.line } },
      right: { style: 'thin', color: { argb: COLOR.line } },
    },
    align: { horizontal: 'center', vertical: 'middle' },
  });

  /* --- Note de bas de tableau ------------------------------------- */
  ws.mergeCells(37, 1, 37, 23);
  const note = ws.getCell(37, 1);
  note.value =
    'Rendement = pièces produites ÷ litres mis en fabrication. Stock J = stock J-1 + transformation − ventes − consommation − pertes déduites.';
  note.font = { size: 8, italic: true, color: { argb: 'FF8A7864' } };
  note.alignment = { horizontal: 'left', vertical: 'middle' };
  ws.getRow(37).height = 18;

  /* --- Synthèse du mois (sous le tableau) ------------------------- */
  const s0 = 39;
  ws.mergeCells(s0, 1, s0, 8);
  const st = ws.getCell(s0, 1);
  st.value = `SYNTHÈSE — ${MONTHS_UPPER[month - 1]} ${year}`;
  st.font = { bold: true, size: 11, color: { argb: COLOR.white } };
  st.alignment = { horizontal: 'left', vertical: 'middle' };
  applyStyle(ws, s0, 1, s0, 8, { fill: COLOR.brand, border: thin });
  ws.getRow(s0).height = 22;

  const sHeaders = ['Produit', 'Production', 'Ventes', 'Consommation', 'Pertes', 'Stock fin', '% production', '% ventes'];
  sHeaders.forEach((h, i) => {
    ws.getCell(s0 + 1, i + 1).value = h;
  });
  applyStyle(ws, s0 + 1, 1, s0 + 1, 8, {
    fill: COLOR.cream2,
    font: { bold: true, size: 9, color: { argb: COLOR.ink } },
    align: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border: thin,
  });
  ws.getRow(s0 + 1).height = 24;

  const products: Array<{
    label: string;
    nb: number;
    vente: number;
    conso: number;
    perte: number | null;
    stock: number;
  }> = [
    { label: 'Brousses', nb: C.nbBrousses, vente: C.venteBrousses, conso: C.consoBrousses, perte: C.perteBrousses, stock: C.stockBrousses },
    { label: 'Fromages', nb: C.nbFromages, vente: C.venteFromages, conso: C.consoFromages, perte: C.perteFromages, stock: C.stockFromages },
    { label: 'Faisselles', nb: C.nbFaisselles, vente: C.venteFaisselles, conso: C.consoFaisselles, perte: null, stock: C.stockFaisselles },
    { label: 'Tomes', nb: C.nbTomes, vente: C.venteTomes, conso: C.consoTomes, perte: C.perteTomes, stock: C.stockTomes },
  ];
  const firstProductRow = s0 + 2;
  products.forEach((p, i) => {
    const r = firstProductRow + i;
    ws.getCell(r, 1).value = p.label;
    ws.getCell(r, 2).value = { formula: `${colLetter(p.nb)}${tr}` };
    ws.getCell(r, 3).value = { formula: `${colLetter(p.vente)}${tr}` };
    ws.getCell(r, 4).value = { formula: `${colLetter(p.conso)}${tr}` };
    ws.getCell(r, 5).value = p.perte ? { formula: `${colLetter(p.perte)}${tr}` } : 0;
    ws.getCell(r, 6).value = { formula: `${colLetter(p.stock)}${tr}` };
    ws.getCell(r, 7).value = { formula: `IFERROR(B${r}/$B$${firstProductRow + 4},"")` };
    ws.getCell(r, 8).value = { formula: `IFERROR(C${r}/$C$${firstProductRow + 4},"")` };
    applyStyle(ws, r, 1, r, 8, { border: thin, font: { size: 9, color: { argb: COLOR.ink } } });
    ws.getCell(r, 1).alignment = { horizontal: 'left', indent: 1 };
    for (let c = 2; c <= 8; c += 1) {
      ws.getCell(r, c).alignment = { horizontal: 'center' };
      ws.getCell(r, c).numFmt = c >= 7 ? FMT_PCT : FMT_N;
    }
  });

  const totalSynthRow = firstProductRow + 4;
  ws.getCell(totalSynthRow, 1).value = 'TOTAL';
  for (let c = 2; c <= 6; c += 1) {
    ws.getCell(totalSynthRow, c).value = {
      formula: `SUM(${colLetter(c)}${firstProductRow}:${colLetter(c)}${firstProductRow + 3})`,
    };
  }
  ws.getCell(totalSynthRow, 7).value = { formula: `SUM(G${firstProductRow}:G${firstProductRow + 3})` };
  ws.getCell(totalSynthRow, 8).value = { formula: `SUM(H${firstProductRow}:H${firstProductRow + 3})` };
  applyStyle(ws, totalSynthRow, 1, totalSynthRow, 8, {
    fill: COLOR.cream,
    font: { bold: true, size: 9, color: { argb: COLOR.brandDark } },
    border: thin,
    align: { horizontal: 'center' },
  });
  ws.getCell(totalSynthRow, 7).numFmt = FMT_PCT;
  ws.getCell(totalSynthRow, 8).numFmt = FMT_PCT;
  for (let c = 2; c <= 6; c += 1) ws.getCell(totalSynthRow, c).numFmt = FMT_N;

  /* --- Alertes stock négatif -------------------------------------- */
  const stockRange = `${colLetter(C.stockBrousses)}${DATA_FIRST}:${colLetter(C.stockTomes)}${lastDayRow}`;
  ws.addConditionalFormatting({
    ref: stockRange,
    rules: [
      {
        type: 'cellIs',
        operator: 'lessThan',
        formulae: ['0'],
        priority: 1,
        style: {
          fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: COLOR.alert } },
          font: { color: { argb: COLOR.alertInk }, bold: true },
        },
      },
    ],
  });

  // Liste déroulante Oui / Non pour la déduction des pertes
  (ws as unknown as { dataValidations: { add: (ref: string, dv: unknown) => void } }).dataValidations.add(`${colLetter(C.deduct)}${DATA_FIRST}:${colLetter(C.deduct)}${lastDayRow}`, {
    type: 'list',
    allowBlank: true,
    formulae: ['"Oui,Non"'],
    showErrorMessage: true,
    errorTitle: 'Valeur attendue',
    error: 'Choisissez Oui ou Non.',
  });

  return ws;
}

/* ------------------------------------------------------------------ */
/*  Export mensuel                                                     */
/* ------------------------------------------------------------------ */

export type MonthExportInput = {
  year: number;
  month: number;
  days: DayComputed[];
  totals: MonthTotals;
  stockDebut: Stock;
  farmName: string;
};

export function buildMonthlyWorkbook(input: MonthExportInput): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = input.farmName;
  wb.created = new Date();
  wb.modified = new Date();
  writeMonthSheet(wb, {
    year: input.year,
    month: input.month,
    days: input.days,
    farmName: input.farmName,
    previousStock: input.stockDebut,
  });
  return wb;
}

/* ------------------------------------------------------------------ */
/*  Export annuel                                                      */
/* ------------------------------------------------------------------ */

export type AnnualExportInput = {
  year: number;
  months: Array<{
    month: number;
    days: DayComputed[];
    totals: MonthTotals;
    stockDebut: Stock;
  }>;
  stockDebut: Stock;
  farmName: string;
  lossDays: Array<{
    date: string;
    perteBrousses: number;
    perteFromages: number;
    perteTomes: number;
    perteLait: number;
    deduirePertes: boolean;
    note: string;
  }>;
};

const TOTAL_COLS = {
  month: 1,
  laitTotal: 2,
  laitBrousses: 3,
  laitFromages: 4,
  laitTomes: 5,
  nbBrousses: 6,
  nbFromages: 7,
  nbFaisselles: 8,
  nbTomes: 9,
  venteBrousses: 10,
  venteFromages: 11,
  venteFaisselles: 12,
  venteTomes: 13,
  conso: 14,
  pertesPcs: 15,
  pertesLait: 16,
  stockBrousses: 17,
  stockFromages: 18,
  stockFaisselles: 19,
  stockTomes: 20,
  pctLait: 21,
  pctProd: 22,
  pctVentes: 23,
  rendB: 24,
  rendF: 25,
};

function writeTotalSheet(wb: ExcelJS.Workbook, input: AnnualExportInput, firstSheetIndex: number): ExcelJS.Worksheet {
  const NCOLS = 25;
  const ws = wb.addWorksheet('TOTAL', {
    views: [{ state: 'frozen', ySplit: 3 }],
    pageSetup: {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      printArea: `A1:${colLetter(NCOLS)}46`,
      margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.25, footer: 0.25 },
    },
    headerFooter: { oddFooter: `&L${input.farmName}&C&A&RPage &P / &N` },
  });

  ws.getColumn(1).width = 16;
  for (let c = 2; c <= NCOLS; c += 1) ws.getColumn(c).width = c >= 21 ? 9.5 : 8.2;

  ws.mergeCells(1, 1, 1, NCOLS);
  const title = ws.getCell(1, 1);
  title.value = `${input.farmName.toUpperCase()}   —   SYNTHÈSE ANNUELLE ${input.year}`;
  title.font = { size: 16, bold: true, color: { argb: COLOR.white } };
  title.alignment = { horizontal: 'center', vertical: 'middle' };
  applyStyle(ws, 1, 1, 1, NCOLS, { fill: COLOR.brandDark });
  ws.getRow(1).height = 32;

  const groups: Array<[number, number, string]> = [
    [2, 5, 'LITRAGE (litres)'],
    [6, 9, 'TRANSFORMATION (pièces)'],
    [10, 13, 'VENTES (pièces)'],
    [14, 16, 'CONSO. / PERTES'],
    [17, 20, 'STOCK FIN DE MOIS'],
    [21, 23, 'POIDS DANS L’ANNÉE'],
    [24, 25, 'RENDEMENT MOYEN'],
  ];
  ws.getCell(2, 1).value = 'MOIS';
  ws.mergeCells(2, 1, 3, 1);
  for (const [c1, c2, label] of groups) {
    ws.getCell(2, c1).value = label;
    ws.mergeCells(2, c1, 2, c2);
  }
  applyStyle(ws, 2, 1, 2, NCOLS, {
    fill: COLOR.brand,
    font: { bold: true, size: 9, color: { argb: COLOR.white } },
    align: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border: thin,
  });
  ws.getRow(2).height = 24;

  const headers: Array<[number, string]> = [
    [2, 'Total lait'],
    [3, 'Lait brousses'],
    [4, 'Lait fromages'],
    [5, 'Lait tomes'],
    [6, 'Brousses'],
    [7, 'Fromages'],
    [8, 'Faisselles'],
    [9, 'Tomes'],
    [10, 'Brousses'],
    [11, 'Fromages'],
    [12, 'Faisselles'],
    [13, 'Tomes'],
    [14, 'Conso. (pcs)'],
    [15, 'Pertes (pcs)'],
    [16, 'Pertes lait (L)'],
    [17, 'Brousses'],
    [18, 'Fromages'],
    [19, 'Faisselles'],
    [20, 'Tomes'],
    [21, '% du lait'],
    [22, '% production'],
    [23, '% ventes'],
    [24, 'Brousses'],
    [25, 'Fromages'],
  ];
  for (const [c, label] of headers) ws.getCell(3, c).value = label;
  applyStyle(ws, 3, 1, 3, NCOLS, {
    fill: COLOR.cream2,
    font: { bold: true, size: 8, color: { argb: COLOR.ink } },
    align: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border: thin,
  });
  ws.getRow(3).height = 34;

  const firstMonthRow = 4;
  const totalRow = firstMonthRow + 12; // 16

  input.months.forEach((m, i) => {
    const r = firstMonthRow + i;
    const name = sheetName(input.year, m.month);
    const ref = `${q(name)}!`;
    const row = ws.getRow(r);
    row.getCell(1).value = `${MONTHS_FR[m.month - 1]}`;
    row.getCell(1).font = { bold: true, size: 9, color: { argb: COLOR.ink } };
    row.getCell(1).alignment = { horizontal: 'left', indent: 1 };

    const totalRef = (col: string) => `${ref}${col}${TOTAL_ROW}`;
    row.getCell(2).value = { formula: totalRef('E') };
    row.getCell(3).value = { formula: totalRef('B') };
    row.getCell(4).value = { formula: totalRef('C') };
    row.getCell(5).value = { formula: totalRef('D') };
    row.getCell(6).value = { formula: totalRef('F') };
    row.getCell(7).value = { formula: totalRef('G') };
    row.getCell(8).value = { formula: totalRef('H') };
    row.getCell(9).value = { formula: totalRef('I') };
    row.getCell(10).value = { formula: totalRef('L') };
    row.getCell(11).value = { formula: totalRef('M') };
    row.getCell(12).value = { formula: totalRef('N') };
    row.getCell(13).value = { formula: totalRef('O') };
    row.getCell(14).value = { formula: `SUM(${ref}P${TOTAL_ROW}:S${TOTAL_ROW})` };
    row.getCell(15).value = { formula: `SUM(${ref}T${TOTAL_ROW}:V${TOTAL_ROW})` };
    row.getCell(16).value = { formula: totalRef('W') };
    row.getCell(17).value = { formula: totalRef('X') };
    row.getCell(18).value = { formula: totalRef('Y') };
    row.getCell(19).value = { formula: totalRef('Z') };
    row.getCell(20).value = { formula: totalRef('AA') };
    row.getCell(21).value = { formula: `IF($B$${totalRow}=0,"",IFERROR(B${r}/$B$${totalRow},""))` };
    row.getCell(22).value = {
      formula: `IF(SUM($F$${totalRow}:$I$${totalRow})=0,"",IFERROR(SUM(F${r}:I${r})/SUM($F$${totalRow}:$I$${totalRow}),""))`,
    };
    row.getCell(23).value = {
      formula: `IF(SUM($J$${totalRow}:$M$${totalRow})=0,"",IFERROR(SUM(J${r}:M${r})/SUM($J$${totalRow}:$M$${totalRow}),""))`,
    };
    row.getCell(24).value = { formula: `IFERROR(${ref}J${TOTAL_ROW},"")` };
    row.getCell(25).value = { formula: `IFERROR(${ref}K${TOTAL_ROW},"")` };

    applyStyle(ws, r, 1, r, NCOLS, { border: thin, font: { size: 9, color: { argb: COLOR.ink } } });
    for (let c = 2; c <= NCOLS; c += 1) {
      row.getCell(c).alignment = { horizontal: 'center' };
      row.getCell(c).numFmt = c >= 21 && c <= 23 ? FMT_PCT : c >= 24 ? FMT_R : c >= 2 && c <= 5 ? FMT_L : FMT_N;
    }
    if (i % 2 === 1) applyStyle(ws, r, 1, r, NCOLS, { fill: 'FFFCF8F2' });
    row.height = 18;
  });

  // TOTAL annuel
  const tr = totalRow;
  const trow = ws.getRow(tr);
  trow.getCell(1).value = 'TOTAL';
  for (let c = 2; c <= 16; c += 1) {
    trow.getCell(c).value = { formula: `SUM(${colLetter(c)}${firstMonthRow}:${colLetter(c)}${totalRow - 1})` };
  }
  for (let c = 17; c <= 20; c += 1) {
    trow.getCell(c).value = { formula: `${colLetter(c)}${totalRow - 1}` };
  }
  trow.getCell(21).value = { formula: `IF($B$${tr}=0,"",100%)` };
  trow.getCell(22).value = { formula: `IF(SUM($F$${tr}:$I$${tr})=0,"",100%)` };
  trow.getCell(23).value = { formula: `IF(SUM($J$${tr}:$M$${tr})=0,"",100%)` };
  trow.getCell(24).value = { formula: `IFERROR(F${tr}/C${tr},"")` };
  trow.getCell(25).value = { formula: `IFERROR(G${tr}/D${tr},"")` };

  applyStyle(ws, tr, 1, tr, NCOLS, {
    fill: COLOR.cream2,
    font: { bold: true, size: 10, color: { argb: COLOR.brandDark } },
    align: { horizontal: 'center' },
    border: {
      top: { style: 'double', color: { argb: COLOR.brand } },
      left: { style: 'thin', color: { argb: COLOR.line } },
      bottom: { style: 'thin', color: { argb: COLOR.line } },
      right: { style: 'thin', color: { argb: COLOR.line } },
    },
  });
  for (let c = 2; c <= NCOLS; c += 1) {
    trow.getCell(c).numFmt = c >= 21 && c <= 23 ? FMT_PCT : c >= 24 ? FMT_R : c >= 2 && c <= 5 ? FMT_L : FMT_N;
  }
  trow.height = 24;

  /* --- Répartitions ------------------------------------------------ */
  const blockRow = tr + 3; // 19
  ws.mergeCells(blockRow, 1, blockRow, 10);
  const bt = ws.getCell(blockRow, 1);
  bt.value = 'RÉPARTITION DE LA PRODUCTION ET DES VENTES';
  bt.font = { bold: true, size: 11, color: { argb: COLOR.white } };
  bt.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  applyStyle(ws, blockRow, 1, blockRow, 10, { fill: COLOR.brand, border: thin });
  ws.getRow(blockRow).height = 22;

  const repHeaders = ['Produit', 'Production', '% production', 'Ventes', '% ventes', 'Stock fin'];
  repHeaders.forEach((h, i) => {
    ws.getCell(blockRow + 1, i + 1).value = h;
  });
  applyStyle(ws, blockRow + 1, 1, blockRow + 1, 6, {
    fill: COLOR.cream2,
    font: { bold: true, size: 9, color: { argb: COLOR.ink } },
    align: { horizontal: 'center', vertical: 'middle' },
    border: thin,
  });
  ws.getRow(blockRow + 1).height = 20;

  const repProducts: Array<[string, number, number, number]> = [
    ['Brousses', 6, 10, 17],
    ['Fromages', 7, 11, 18],
    ['Faisselles', 8, 12, 19],
    ['Tomes', 9, 13, 20],
  ];
  const repFirst = blockRow + 2;
  repProducts.forEach(([label, nbCol, venteCol, stockCol], i) => {
    const r = repFirst + i;
    ws.getCell(r, 1).value = label;
    ws.getCell(r, 2).value = { formula: `${colLetter(nbCol)}${tr}` };
    ws.getCell(r, 3).value = { formula: `IFERROR(B${r}/$B$${repFirst + 4},"")` };
    ws.getCell(r, 4).value = { formula: `${colLetter(venteCol)}${tr}` };
    ws.getCell(r, 5).value = { formula: `IFERROR(D${r}/$D$${repFirst + 4},"")` };
    ws.getCell(r, 6).value = { formula: `${colLetter(stockCol)}${tr}` };
    applyStyle(ws, r, 1, r, 6, { border: thin, font: { size: 9, color: { argb: COLOR.ink } } });
    ws.getCell(r, 1).alignment = { horizontal: 'left', indent: 1 };
    for (let c = 2; c <= 6; c += 1) {
      ws.getCell(r, c).alignment = { horizontal: 'center' };
      ws.getCell(r, c).numFmt = c === 3 || c === 5 ? FMT_PCT : FMT_N;
    }
  });
  const repTotal = repFirst + 4;
  ws.getCell(repTotal, 1).value = 'TOTAL';
  ws.getCell(repTotal, 2).value = { formula: `SUM(B${repFirst}:B${repFirst + 3})` };
  ws.getCell(repTotal, 3).value = { formula: `SUM(C${repFirst}:C${repFirst + 3})` };
  ws.getCell(repTotal, 4).value = { formula: `SUM(D${repFirst}:D${repFirst + 3})` };
  ws.getCell(repTotal, 5).value = { formula: `SUM(E${repFirst}:E${repFirst + 3})` };
  ws.getCell(repTotal, 6).value = { formula: `SUM(F${repFirst}:F${repFirst + 3})` };
  applyStyle(ws, repTotal, 1, repTotal, 6, {
    fill: COLOR.cream,
    font: { bold: true, size: 9, color: { argb: COLOR.brandDark } },
    border: thin,
    align: { horizontal: 'center' },
  });
  ws.getCell(repTotal, 3).numFmt = FMT_PCT;
  ws.getCell(repTotal, 5).numFmt = FMT_PCT;

  // Marge (référence optionnelle pour ne pas casser les index)
  void firstSheetIndex;
  return ws;
}

function writeLossSheet(wb: ExcelJS.Workbook, input: AnnualExportInput): ExcelJS.Worksheet {
  const ws = wb.addWorksheet('PERTES', {
    views: [{ state: 'frozen', ySplit: 4 }],
    pageSetup: {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.25, footer: 0.25 },
    },
    headerFooter: { oddFooter: `&L${input.farmName}&C&A&RPage &P / &N` },
  });

  const widths = [14, 12, 12, 12, 12, 12, 16, 10, 16, 42];
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  ws.mergeCells(1, 1, 1, 10);
  const title = ws.getCell(1, 1);
  title.value = `${input.farmName.toUpperCase()}   —   SUIVI DES PERTES ${input.year}`;
  title.font = { size: 16, bold: true, color: { argb: COLOR.white } };
  title.alignment = { horizontal: 'center', vertical: 'middle' };
  applyStyle(ws, 1, 1, 1, 10, { fill: COLOR.brandDark });
  ws.getRow(1).height = 30;

  ws.mergeCells(3, 1, 3, 10);
  const sub = ws.getCell(3, 1);
  sub.value = 'SYNTHÈSE PAR MOIS';
  sub.font = { bold: true, size: 11, color: { argb: COLOR.white } };
  sub.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  applyStyle(ws, 3, 1, 3, 10, { fill: COLOR.brand });
  ws.getRow(3).height = 22;

  const head = ['Mois', 'Brousses (pcs)', 'Fromages (pcs)', 'Tomes (pcs)', 'Total pièces', 'Lait (L)', 'Équivalent fromages', '% des pertes', 'Jours avec perte', 'Observations'];
  head.forEach((h, i) => {
    ws.getCell(4, i + 1).value = h;
  });
  applyStyle(ws, 4, 1, 4, 10, {
    fill: COLOR.cream2,
    font: { bold: true, size: 9, color: { argb: COLOR.ink } },
    align: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border: thin,
  });
  ws.getRow(4).height = 34;

  // --- Détail : calcul de la mise en page d'abord -------------------
  const monthsLoss = Array.from({ length: 12 }, (_, i) =>
    input.lossDays.filter((d) => Number(d.date.slice(5, 7)) === i + 1),
  );

  const detailTitleRow = 19;
  const detailHeaderRow = 20;
  const detailStart = 21;

  // On simule les lignes pour connaître l'emplacement des sous-totaux.
  const layout: Array<{ month: number; rows: number; subtotal: number; from: number; to: number }> = [];
  let cursor = detailStart;
  monthsLoss.forEach((list, i) => {
    const from = cursor;
    const rows = Math.max(list.length, 1);
    cursor += rows;
    const subtotal = cursor;
    cursor += 1;
    layout.push({ month: i + 1, rows, subtotal, from, to: subtotal - 1 });
    cursor += 1; // ligne vide
  });

  // Synthèse (référence les sous-totaux)
  for (let i = 0; i < 12; i += 1) {
    const r = 5 + i;
    const lay = layout[i];
    const list = monthsLoss[i];
    ws.getCell(r, 1).value = MONTHS_FR[i];
    ws.getCell(r, 2).value = { formula: `${colLetter(2)}${lay.subtotal}` };
    ws.getCell(r, 3).value = { formula: `${colLetter(3)}${lay.subtotal}` };
    ws.getCell(r, 4).value = { formula: `${colLetter(4)}${lay.subtotal}` };
    ws.getCell(r, 5).value = { formula: `${colLetter(5)}${lay.subtotal}` };
    ws.getCell(r, 6).value = { formula: `${colLetter(6)}${lay.subtotal}` };
    ws.getCell(r, 7).value = { formula: `${colLetter(7)}${lay.subtotal}` };
    ws.getCell(r, 8).value = { formula: `IF($E$17=0,"",IFERROR(E${r}/$E$17,""))` };
    ws.getCell(r, 9).value = list.length;
    applyStyle(ws, r, 1, r, 10, { border: thin, font: { size: 9, color: { argb: COLOR.ink } } });
    ws.getCell(r, 1).alignment = { horizontal: 'left', indent: 1 };
    for (let c = 2; c <= 9; c += 1) ws.getCell(r, c).alignment = { horizontal: 'center' };
    for (let c = 2; c <= 7; c += 1) ws.getCell(r, c).numFmt = c === 6 ? FMT_L : FMT_N;
    ws.getCell(r, 8).numFmt = FMT_PCT;
    ws.getRow(r).height = 18;
  }

  // TOTAL annuel de la synthèse
  ws.getCell(17, 1).value = 'TOTAL ANNÉE';
  for (let c = 2; c <= 7; c += 1) {
    ws.getCell(17, c).value = { formula: `SUM(${colLetter(c)}5:${colLetter(c)}16)` };
  }
  ws.getCell(17, 8).value = { formula: 'IF($E$17=0,"",IFERROR(E17/$E$17,""))' };
  ws.getCell(17, 9).value = { formula: 'SUM(I5:I16)' };
  ws.getCell(17, 8).numFmt = FMT_PCT;
  applyStyle(ws, 17, 1, 17, 10, {
    fill: COLOR.cream2,
    font: { bold: true, size: 10, color: { argb: COLOR.brandDark } },
    border: {
      top: { style: 'double', color: { argb: COLOR.brand } },
      left: { style: 'thin', color: { argb: COLOR.line } },
      bottom: { style: 'thin', color: { argb: COLOR.line } },
      right: { style: 'thin', color: { argb: COLOR.line } },
    },
    align: { horizontal: 'center' },
  });
  ws.getCell(17, 1).alignment = { horizontal: 'left', indent: 1 };
  for (let c = 2; c <= 7; c += 1) ws.getCell(17, c).numFmt = c === 6 ? FMT_L : FMT_N;

  // --- Détail journalier -------------------------------------------
  ws.mergeCells(detailTitleRow, 1, detailTitleRow, 10);
  const dt = ws.getCell(detailTitleRow, 1);
  dt.value = 'DÉTAIL JOURNALIER DES PERTES';
  dt.font = { bold: true, size: 11, color: { argb: COLOR.white } };
  dt.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  applyStyle(ws, detailTitleRow, 1, detailTitleRow, 10, { fill: COLOR.brand });
  ws.getRow(detailTitleRow).height = 22;

  const detailHead = ['Date', 'Brousses', 'Fromages', 'Tomes', 'Total pièces', 'Lait (L)', 'Équivalent fromages', 'Déduit du stock', 'Note', ''];
  detailHead.forEach((h, i) => {
    ws.getCell(detailHeaderRow, i + 1).value = h;
  });
  applyStyle(ws, detailHeaderRow, 1, detailHeaderRow, 10, {
    fill: COLOR.cream2,
    font: { bold: true, size: 9, color: { argb: COLOR.ink } },
    align: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border: thin,
  });
  ws.getRow(detailHeaderRow).height = 28;

  monthsLoss.forEach((list, idx) => {
    const lay = layout[idx];
    let r = lay.from;
    if (list.length === 0) {
      ws.mergeCells(r, 1, r, 10);
      const c = ws.getCell(r, 1);
      c.value = `Aucune perte enregistrée — ${MONTHS_UPPER[idx]} ${input.year}`;
      c.font = { size: 9, italic: true, color: { argb: 'FF8A7864' } };
      c.alignment = { horizontal: 'left', indent: 1 };
      applyStyle(ws, r, 1, r, 10, { border: thin });
    } else {
      for (const day of list) {
        const row = ws.getRow(r);
        row.getCell(1).value = new Date(`${day.date}T12:00:00.000Z`);
        row.getCell(1).numFmt = 'ddd dd/mm/yyyy';
        row.getCell(2).value = day.perteBrousses || '';
        row.getCell(3).value = day.perteFromages || '';
        row.getCell(4).value = day.perteTomes || '';
        row.getCell(5).value = { formula: `SUM(B${r}:D${r})` };
        row.getCell(6).value = day.perteLait || '';
        row.getCell(6).numFmt = FMT_L;
        row.getCell(7).value = { formula: `F${r}*2` };
        row.getCell(8).value = day.deduirePertes ? 'Oui' : 'Non (non déduit)';
        row.getCell(9).value = day.note || '';
        applyStyle(ws, r, 1, r, 10, { border: thin, font: { size: 9, color: { argb: COLOR.ink } } });
        row.getCell(1).alignment = { horizontal: 'center' };
        for (let c = 2; c <= 8; c += 1) row.getCell(c).alignment = { horizontal: 'center' };
        row.getCell(9).alignment = { horizontal: 'left', indent: 1 };
        row.height = 17;
        r += 1;
      }
    }

    // Sous-total du mois
    const st = lay.subtotal;
    ws.getCell(st, 1).value = `TOTAL ${MONTHS_UPPER[idx]}`;
    for (let c = 2; c <= 4; c += 1) {
      ws.getCell(st, c).value = { formula: `SUM(${colLetter(c)}${lay.from}:${colLetter(c)}${lay.to})` };
    }
    ws.getCell(st, 5).value = { formula: `SUM(B${st}:D${st})` };
    ws.getCell(st, 6).value = { formula: `SUM(F${lay.from}:F${lay.to})` };
    ws.getCell(st, 6).numFmt = FMT_L;
    ws.getCell(st, 7).value = { formula: `F${st}*2` };
    ws.getCell(st, 8).value = '';
    ws.getCell(st, 9).value = '';
    applyStyle(ws, st, 1, st, 10, {
      fill: COLOR.cream,
      font: { bold: true, size: 9, color: { argb: COLOR.brandDark } },
      border: thin,
      align: { horizontal: 'center' },
    });
    ws.getCell(st, 1).alignment = { horizontal: 'left', indent: 1 };
  });

  return ws;
}

export function buildAnnualWorkbook(input: AnnualExportInput): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = input.farmName;
  wb.created = new Date();
  wb.modified = new Date();

  // 1. Onglet TOTAL
  writeTotalSheet(wb, input, 0);

  // 2. Onglets mensuels
  let previousSheet: string | undefined;
  input.months.forEach((m, idx) => {
    writeMonthSheet(wb, {
      year: input.year,
      month: m.month,
      days: m.days,
      farmName: input.farmName,
      previousStock: idx === 0 ? input.stockDebut : m.stockDebut,
      previousSheet,
    });
    previousSheet = sheetName(input.year, m.month);
  });

  // 3. Onglet PERTES
  writeLossSheet(wb, input);

  // Ordre : TOTAL, mensuels, PERTES
  return wb;
}

/* ------------------------------------------------------------------ */
/*  Résumé texte (pour les logs / tests)                               */
/* ------------------------------------------------------------------ */

export function describeMonthTotals(t: MonthTotals, month: number): string {
  return [
    MONTHS_FR[month - 1],
    `${fmtNumber(t.laitTotal, 1)} L`,
    `${fmtNumber(t.productionPieces)} pcs`,
    `${fmtNumber(t.ventePieces)} vendues`,
    `rend. ${t.rendementBrousses ? fmtNumber(t.rendementBrousses, 2) : '—'}`,
  ].join(' · ');
}

export function monthSheetLabel(year: number, month: number): string {
  return `${monthLabel(year, month)} (onglet « ${sheetName(year, month)} »)`;
}

export type ProductRepartition = { product: Product; value: number; part: number };

export function repartition(values: Array<{ product: Product; value: number }>): ProductRepartition[] {
  const total = values.reduce((acc, v) => acc + v.value, 0);
  return values.map((v) => ({ ...v, part: pct(v.value, total) }));
}
