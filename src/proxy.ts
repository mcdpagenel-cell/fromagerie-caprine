import { NextResponse, type NextRequest } from 'next/server';

import { SESSION_COOKIE, authEnabled, verifySessionToken } from '@/lib/auth';

/** Pages et ressources accessibles sans être connecté. */
const PUBLIC_PATHS = ['/login', '/api/login', '/api/logout'];
const PUBLIC_FILES = [
  '/logo.jpg',
  '/favicon.ico',
  '/robots.txt',
  '/manifest.webmanifest',
];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return true;
  }
  return PUBLIC_FILES.includes(pathname);
}

export async function proxy(request: NextRequest) {
  // Sans mot de passe configuré, l'application reste ouverte (développement local).
  if (!authEnabled()) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const authenticated = await verifySessionToken(token);

  if (isPublic(pathname)) {
    // Déjà connecté sur /login : on renvoie vers l'application.
    if (authenticated && pathname === '/login') {
      const url = request.nextUrl.clone();
      url.pathname = '/jour';
      url.search = '';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (authenticated) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { ok: false, error: 'Accès protégé : veuillez vous connecter.' },
      { status: 401 },
    );
  }

  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  url.searchParams.set('from', `${pathname}${search}`);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // Tout sauf les fichiers internes de Next.js.
    '/((?!_next/static|_next/image|_next/webpack-hmr).*)',
  ],
};
