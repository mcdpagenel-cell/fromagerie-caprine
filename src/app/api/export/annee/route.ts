import { getDaysWithLosses, getSettings, getYearData } from '@/lib/repo';
import { buildAnnualWorkbook } from '@/lib/excel';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const annee = searchParams.get('annee') ?? '';
  if (!/^\d{4}$/.test(annee)) {
    return new Response('Paramètre « annee » invalide (attendu : AAAA).', { status: 400 });
  }
  const year = Number(annee);
  if (year < 2000 || year > 2100) {
    return new Response('Année hors limites.', { status: 400 });
  }

  const [data, settings, lossEntries] = await Promise.all([
    getYearData(year),
    getSettings(),
    getDaysWithLosses(year),
  ]);
  const lossDays = lossEntries.map((d) => ({
    date: d.date,
    perteBrousses: d.perteBrousses,
    perteFromages: d.perteFromages,
    perteTomes: d.perteTomes,
    perteLait: d.perteLait,
    deduirePertes: d.deduirePertes,
    note: d.note,
  }));

  const wb = buildAnnualWorkbook({
    year,
    months: data.months.map((m) => ({
      month: m.month,
      days: m.days,
      totals: m.totals,
      stockDebut: m.stockDebut,
    })),
    stockDebut: data.stockDebut,
    farmName: settings.farmName,
    lossDays,
  });

  const buffer = await wb.xlsx.writeBuffer();
  const filename = `fromagerie-annee-${year}.xlsx`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': XLSX_MIME,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
