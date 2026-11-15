'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { IconAlert } from '@/components/icons';

function safeTarget(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/jour';
  if (value.startsWith('/login')) return '/jour';
  return value;
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'Connexion impossible.');
      router.replace(safeTarget(params.get('from')));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-6 space-y-3">
      <div>
        <label htmlFor="password" className="field-label">
          Mot de passe
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-14 w-full rounded-xl border border-line bg-white px-3 text-center text-xl font-semibold tracking-[0.2em] outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15"
          placeholder="••••••••"
        />
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger-soft px-3 py-2.5 text-[12.5px] text-danger">
          <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <button type="submit" disabled={loading || !password} className="btn-primary h-12 w-full">
        {loading ? 'Connexion…' : 'Entrer'}
      </button>
    </form>
  );
}
