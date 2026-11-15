import { NextResponse } from 'next/server';

import { deleteDay, getDay, saveDay } from '@/lib/repo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const date = String(body.date ?? '');
    if (!DATE_RE.test(date)) {
      return NextResponse.json({ ok: false, error: 'Date invalide.' }, { status: 400 });
    }
    const entry = await saveDay(date, body);
    return NextResponse.json({ ok: true, entry });
  } catch (err) {
    console.error('POST /api/jour', err);
    return NextResponse.json({ ok: false, error: 'Enregistrement impossible.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') ?? '';
  if (!DATE_RE.test(date)) {
    return NextResponse.json({ ok: false, error: 'Date invalide.' }, { status: 400 });
  }
  await deleteDay(date);
  return NextResponse.json({ ok: true });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') ?? '';
  if (!DATE_RE.test(date)) {
    return NextResponse.json({ ok: false, error: 'Date invalide.' }, { status: 400 });
  }
  return NextResponse.json({ ok: true, entry: await getDay(date) });
}
