import type { Metadata, Viewport } from 'next';

import './globals.css';
import { todayISO } from '@/lib/format';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: {
    default: 'Fromagerie — suivi de production',
    template: '%s · Fromagerie',
  },
  description:
    'Suivi quotidien du litrage, de la transformation fromagère, des ventes, des stocks et de la traçabilité.',
  icons: {
    icon: '/logo.jpg',
    apple: '/logo.jpg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#faf5ec',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // `todayISO` est conservé ici pour garder le fuseau de l'application actif
  // dès le premier rendu (voir APP_TIMEZONE).
  void todayISO();

  return (
    <html lang="fr">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
