import { NextResponse } from 'next/server';

import {
  aggregateSales,
  createSale,
  deleteSale,
  getSalesForDate,
  getSalesInRange,
  updateSale,
} from '@/lib/repo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Crée une vente (sans id) ou met à jour une vente existante (avec id). */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const input = {
      date: body.date,
      montant: body.montant,
      moyen: body.moyen,
      note: body.note,
    };
    const id = Number(body.id ?? 0);
    if (Number.isInteger(id) && id > 0) {
      const sale = await updateSale(id, input);
      if (!sale) {
        return NextResponse.json(
          { ok: false, error: 'Vente introuvable ou données invalides.' },
          { status: 404 },
        );
      }
      return NextResponse.json({ ok: true, sale });
    }
    const sale = await createSale(input);
    return NextResponse.json({ ok: true, sale });
  } catch (err) {
    console.error('POST /api/ventes', err);
    return NextResponse.json({ ok: false, error: 'Enregistrement impossible.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get('id') ?? '');
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ ok: false, error: 'Identifiant invalide.' }, { status: 400 });
  }
  await deleteSale(id);
  return NextResponse.json({ ok: true });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') ?? '';
  const from = searchParams.get('from') ?? '';
  const to = searchParams.get('to') ?? '';
  try {
    if (DATE_RE.test(date)) {
      const sales = await getSalesForDate(date);
      return NextResponse.json({ ok: true, sales, totals: aggregateSales(sales) });
    }
    if (DATE_RE.test(from) && DATE_RE.test(to)) {
      const sales = await getSalesInRange(from, to);
      return NextResponse.json({ ok: true, sales, totals: aggregateSales(sales) });
    }
    return NextResponse.json({ ok: false, error: 'Paramètres de date invalides.' }, { status: 400 });
  } catch (err) {
    console.error('GET /api/ventes', err);
    return NextResponse.json({ ok: false, error: 'Lecture impossible.' }, { status: 500 });
  }
}
