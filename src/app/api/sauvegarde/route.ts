import { backupFilename, backupJson, restorePayload } from '@/lib/repo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Sauvegarde : fichier JSON portable (identique pour la base locale et Turso).
 */
export async function GET() {
  try {
    const json = await backupJson();
    return new Response(json, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${backupFilename()}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('Sauvegarde', err);
    return new Response('Sauvegarde impossible.', { status: 500 });
  }
}

/**
 * Restauration : remplace toutes les données par le contenu d'un fichier JSON
 * exporté depuis l'application (version 1 ou 2).
 */
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get('fichier');
    if (!(file instanceof File)) {
      return Response.json({ ok: false, error: 'Aucun fichier reçu.' }, { status: 400 });
    }
    if (file.size > 50 * 1024 * 1024) {
      return Response.json({ ok: false, error: 'Fichier trop volumineux (max 50 Mo).' }, { status: 400 });
    }

    const text = await file.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return Response.json(
        { ok: false, error: 'Ce fichier n’est pas un JSON valide.' },
        { status: 400 },
      );
    }

    const result = await restorePayload(parsed);
    return Response.json({ ok: true, days: result.days, sales: result.sales });
  } catch (err) {
    console.error('Restauration', err);
    const message = err instanceof Error ? err.message : 'Restauration impossible.';
    return Response.json({ ok: false, error: message }, { status: 400 });
  }
}
