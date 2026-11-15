import { getMonthData, getSettings } from '@/lib/repo';
import { buildMonthlyWorkbook } from '@/lib/excel';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mois = searchParams.get('mois') ?? '';
  const m = /^(\d{4})-(\d{2})$/.exec(mois);
  if (!m) {
    return new Response('Paramètre « mois » invalide (attendu : AAAA-MM).', { status: 400 });
  }
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (year < 2000 || year > 2100 || month < 1 || month > 12) {
    return new Response('Mois hors limites.', { status: 400 });
  }

  const [data, settings] = await Promise.all([getMonthData(year, month), getSettings()]);
  const wb = buildMonthlyWorkbook({
    year,
    month,
    days: data.days,
    totals: data.totals,
    stockDebut: data.stockDebut,
    farmName: settings.farmName,
  });

  const buffer = await wb.xlsx.writeBuffer();
  const filename = `fromagerie-${year}-${String(month).padStart(2, '0')}.xlsx`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': XLSX_MIME,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
