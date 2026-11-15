import { clearAllData, resetDemoData, saveSettings } from '@/lib/repo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    if (body.action === 'reset-demo') {
      await resetDemoData();
      return Response.json({ ok: true });
    }
    if (body.action === 'clear') {
      await clearAllData();
      return Response.json({ ok: true });
    }

    const settings = await saveSettings({
      farmName: typeof body.farmName === 'string' ? body.farmName : undefined,
      tagline: typeof body.tagline === 'string' ? body.tagline : undefined,
      openingDate: typeof body.openingDate === 'string' ? body.openingDate : undefined,
      openingStock:
        body.openingStock && typeof body.openingStock === 'object'
          ? (body.openingStock as Record<string, number>)
          : undefined,
    });
    return Response.json({ ok: true, settings });
  } catch (err) {
    console.error('POST /api/parametres', err);
    return Response.json({ ok: false, error: 'Enregistrement impossible.' }, { status: 500 });
  }
}
