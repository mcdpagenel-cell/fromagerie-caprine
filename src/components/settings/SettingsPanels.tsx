'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { NumberField } from '@/components/day/NumberField';
import { IconCheck, IconDownload, IconTrash, IconUpload } from '@/components/icons';
import type { Settings } from '@/lib/types';
import { fmtNumber } from '@/lib/format';

const inputClass =
  'h-11 w-full rounded-xl border border-line bg-white px-3 text-[15px] outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15';

export function SettingsForm({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [farmName, setFarmName] = useState(settings.farmName);
  const [tagline, setTagline] = useState(settings.tagline);
  const [openingDate, setOpeningDate] = useState(settings.openingDate);
  const [stock, setStock] = useState(settings.openingStock);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/parametres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farmName, tagline, openingDate, openingStock: stock }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'Erreur');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="farm" className="field-label">
            Nom de l’exploitation
          </label>
          <input id="farm" value={farmName} onChange={(e) => setFarmName(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="tagline" className="field-label">
            Sous-titre
          </label>
          <input id="tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} className={inputClass} />
        </div>
      </div>

      <div className="rounded-xl border border-line/80 bg-cream/50 p-3.5">
        <h3 className="text-[13px] font-bold text-ink">Stock de départ</h3>
        <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-soft">
          Stock disponible <strong>au début</strong> de cette date (avant la production du jour).
          Tous les stocks des jours suivants sont recalculés automatiquement, mois après mois et
          année après année.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,180px)_1fr]">
          <div>
            <label htmlFor="openingDate" className="field-label">
              Date de référence
            </label>
            <input
              id="openingDate"
              type="date"
              value={openingDate}
              onChange={(e) => setOpeningDate(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <NumberField
              label="Brousses"
              unit="pcs"
              value={stock.brousses}
              onChange={(v) => setStock((s) => ({ ...s, brousses: v }))}
            />
            <NumberField
              label="Fromages"
              unit="pcs"
              value={stock.fromages}
              onChange={(v) => setStock((s) => ({ ...s, fromages: v }))}
            />
            <NumberField
              label="Faisselles"
              unit="pcs"
              value={stock.faisselles}
              onChange={(v) => setStock((s) => ({ ...s, faisselles: v }))}
            />
            <NumberField
              label="Tomes"
              unit="pcs"
              value={stock.tomes}
              onChange={(v) => setStock((s) => ({ ...s, tomes: v }))}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => void save()} disabled={saving} className="btn-primary h-11 px-5">
          {saving ? 'Enregistrement…' : 'Enregistrer les réglages'}
        </button>
        {saved ? (
          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-olive">
            <IconCheck className="h-4 w-4" /> Réglages enregistrés
          </span>
        ) : null}
        {error ? <span className="text-[12px] font-semibold text-danger">{error}</span> : null}
      </div>
    </div>
  );
}

export function DataTools({
  dbLabel,
  daysCount,
  remote,
}: {
  dbLabel: string;
  daysCount: number;
  remote: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const post = async (body: Record<string, unknown>, label: string) => {
    setBusy(label);
    setMessage(null);
    try {
      const res = await fetch('/api/parametres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'Erreur');
      setMessage({ tone: 'ok', text: 'Opération terminée.' });
      router.refresh();
      setTimeout(() => window.location.reload(), 400);
    } catch (err) {
      setMessage({ tone: 'error', text: err instanceof Error ? err.message : 'Erreur.' });
    } finally {
      setBusy(null);
    }
  };

  const restore = async (file: File) => {
    if (
      !window.confirm(
        'Restaurer cette sauvegarde ? Les données actuelles seront entièrement remplacées par le contenu du fichier.',
      )
    ) {
      return;
    }
    setBusy('restore');
    setMessage(null);
    const form = new FormData();
    form.append('fichier', file);
    try {
      const res = await fetch('/api/sauvegarde', { method: 'POST', body: form });
      const data = (await res.json()) as { ok: boolean; error?: string; days?: number };
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'Restauration impossible.');
      setMessage({
        tone: 'ok',
        text: `Sauvegarde restaurée (${fmtNumber(data.days ?? 0)} journées). Rechargement…`,
      });
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      setMessage({
        tone: 'error',
        text: err instanceof Error ? err.message : 'Restauration impossible.',
      });
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <a href="/api/sauvegarde" className="btn-primary h-11 px-4 text-[12.5px]">
          <IconDownload className="h-4 w-4" /> Télécharger la sauvegarde (.json)
        </a>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy === 'restore'}
          className="btn-secondary h-11 px-4 text-[12.5px]"
        >
          <IconUpload className="h-4 w-4" /> Restaurer une sauvegarde
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void restore(file);
          }}
        />
      </div>

      <div className="rounded-xl border border-line/80 bg-cream/50 px-3.5 py-3 text-[11.5px] leading-relaxed text-ink-soft">
        <p>
          <span className="font-semibold text-ink">Stockage :</span> {dbLabel}
          {remote ? ' — base en ligne persistante' : ' — fichier local'}
        </p>
        <p>
          <span className="font-semibold text-ink">{fmtNumber(daysCount)} journées</span> enregistrées. Une
          sauvegarde contient l’intégralité de l’historique, tous les réglages et le stock de départ.
        </p>
        <p className="mt-1">
          Le fichier <code className="rounded bg-white/70 px-1 py-0.5">.json</code> est lisible, se
          conserve facilement (clé USB, cloud) et fonctionne aussi bien avec la base locale qu’avec
          Turso. Téléchargez-en une avant chaque mise à jour.
        </p>
      </div>

      {message ? (
        <div
          className={`rounded-xl border px-3.5 py-2.5 text-[12px] font-semibold ${
            message.tone === 'ok'
              ? 'border-olive/30 bg-olive-soft text-olive'
              : 'border-danger/30 bg-danger-soft text-danger'
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 border-t border-line/60 pt-3">
        <button
          type="button"
          disabled={!!busy}
          onClick={() => {
            if (window.confirm('Recharger les données de démonstration ? Toutes les saisies actuelles seront remplacées.')) {
              void post({ action: 'reset-demo' }, 'demo');
            }
          }}
          className="btn-ghost h-10 px-3 text-[11.5px]"
        >
          Recharger la démonstration
        </button>
        <button
          type="button"
          disabled={!!busy}
          onClick={() => {
            if (
              window.confirm('Effacer TOUTES les journées saisies ? Cette action est définitive.') &&
              window.confirm('Dernière confirmation : effacer tout l’historique de production ?')
            ) {
              void post({ action: 'clear' }, 'clear');
            }
          }}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-[11.5px] font-semibold text-danger/80 transition hover:bg-danger-soft hover:text-danger"
        >
          <IconTrash className="h-3.5 w-3.5" /> Effacer tout l’historique
        </button>
      </div>
    </div>
  );
}
