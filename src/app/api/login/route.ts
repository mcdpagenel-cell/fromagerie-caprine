import { NextResponse } from 'next/server';

import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
  authEnabled,
  passwordMatches,
} from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!authEnabled()) {
    return NextResponse.json({ ok: true, open: true });
  }

  let password = '';
  try {
    const body = (await request.json()) as { password?: unknown };
    password = typeof body.password === 'string' ? body.password : '';
  } catch {
    return NextResponse.json({ ok: false, error: 'Requête invalide.' }, { status: 400 });
  }

  if (!password || !passwordMatches(password)) {
    // Petite temporisation : ralentit les tentatives automatisées.
    await new Promise((resolve) => setTimeout(resolve, 350));
    return NextResponse.json({ ok: false, error: 'Mot de passe incorrect.' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: await createSessionToken(),
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecure(request),
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}

/** `secure` uniquement en HTTPS (local en http:// reste utilisable). */
function isSecure(request: Request): boolean {
  const proto = request.headers.get('x-forwarded-proto');
  if (proto) return proto.split(',')[0].trim() === 'https';
  try {
    return new URL(request.url).protocol === 'https:';
  } catch {
    return false;
  }
}
