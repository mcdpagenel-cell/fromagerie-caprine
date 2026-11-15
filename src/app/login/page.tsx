import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { LoginForm } from '@/components/settings/LoginForm';
import { authEnabled } from '@/lib/auth';

export const metadata: Metadata = { title: 'Connexion' };
export const dynamic = 'force-dynamic';

export default function LoginPage() {
  if (!authEnabled()) redirect('/jour');

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="card w-full max-w-sm p-6 sm:p-7">
        <div className="flex flex-col items-center text-center">
          <span className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl border border-line bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt="Logo de la fromagerie" className="h-full w-full object-contain p-1" />
          </span>
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">
            Suivi de production
          </p>
          <h1 className="mt-1 font-display text-[24px] font-semibold leading-tight text-ink">
            Fromagerie caprine
          </h1>
          <p className="mt-1 text-[12.5px] text-ink-soft">
            Accès réservé. Entrez le mot de passe partagé pour continuer.
          </p>
        </div>

        <Suspense fallback={<div className="mt-6 h-[132px]" />}>
          <LoginForm />
        </Suspense>

        <p className="mt-5 text-center text-[10.5px] leading-relaxed text-ink-soft/80">
          Session de 30 jours sur cet appareil. Fermez la session depuis les réglages si vous
          utilisez un ordinateur partagé.
        </p>
      </div>
    </main>
  );
}
