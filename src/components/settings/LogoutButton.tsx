'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { IconLogout } from '@/components/icons';

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const logout = async () => {
    setBusy(true);
    try {
      await fetch('/api/logout', { method: 'POST' });
    } finally {
      router.replace('/login');
      router.refresh();
    }
  };

  return (
    <button
      type="button"
      onClick={() => void logout()}
      disabled={busy}
      className={
        className ??
        'inline-flex h-10 items-center gap-1.5 rounded-xl border border-line bg-white px-3 text-[12px] font-semibold text-ink-soft transition hover:border-brand/40 hover:text-brand'
      }
    >
      <IconLogout className="h-4 w-4" />
      {busy ? 'Déconnexion…' : 'Se déconnecter'}
    </button>
  );
}
