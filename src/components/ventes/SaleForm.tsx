'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { NumberField } from '@/components/day/NumberField';
import { IconCheck, IconSave } from '@/components/icons';
import { PAYMENT_LABELS, PAYMENT_METHODS, type PaymentMethod, type SaleEntry } from '@/lib/types';

type Props = {
  /** Date pré-sélectionnée (modifiable dans le formulaire). */
  defaultDate: string;
  /** Vente en cours de modification (mode édition) si défini. */
  initial?: SaleEntry | null;
  onDone?: () => void;
  onCancel?: () => void;
};

export function SaleForm({ defaultDate, initial, onDone, onCancel }: Props) {
  const router = useRouter();
  const [date, setDate] = useState(initial?.date ?? defaultDate);
  const [montant, setMontant] = useState(initial?.montant ?? 0);
  const [moyen, setMoyen] = useState<PaymentMethod>(initial?.moyen ?? 'especes');
  const [note, setNote] = useState(initial?.note ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Le message de confirmation disparaît seul après ~2,6 s (comme le formulaire du jour).
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (montant <= 0) {
      setError('Saisissez un montant supérieur à 0 €.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/ventes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: initial?.id && initial.id > 0 ? initial.id : undefined,
          date,
          montant,
          moyen,
          note,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setToast(initial ? 'Vente modifiée' : 'Vente enregistrée');
      onDone?.();
      router.refresh();
      if (!initial) {
        setMontant(0);
        setNote('');
        setMoyen('especes');
      }
    } catch (err) {
      console.error(err);
      setError('Enregistrement impossible. Vérifiez la connexion au serveur.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3.5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="sale-date">
            Date
          </label>
          <input
            id="sale-date"
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="field-input"
          />
        </div>
        <NumberField
          label="Montant"
          unit="€"
          step={1}
          decimals={2}
          value={montant}
          onChange={setMontant}
        />
      </div>

      <div>
        <span className="field-label">Moyen de paiement</span>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Moyen de paiement">
          {PAYMENT_METHODS.map((m) => {
            const active = moyen === m;
            return (
              <button
                key={m}
                type="button"
                aria-pressed={active}
                onClick={() => setMoyen(m)}
                className={`h-12 rounded-xl border px-3 text-[13px] font-semibold transition ${
                  active
                    ? 'border-brand bg-brand text-white shadow-sm'
                    : 'border-line bg-white text-ink-soft hover:border-brand/40 hover:bg-brand-soft/40 hover:text-ink'
                }`}
              >
                {PAYMENT_LABELS[m]}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="field-label" htmlFor="sale-note">
          Détail des produits
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-ink-soft/70">
            facultatif
          </span>
        </label>
        <input
          id="sale-note"
          type="text"
          value={note}
          maxLength={300}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ex : 3 brousses, 2 fromages frais"
          className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15"
        />
      </div>

      {error ? (
        <p className="rounded-xl border border-danger/30 bg-danger-soft px-3 py-2 text-[12px] font-semibold text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <button type="submit" disabled={saving} className="btn-primary h-11 flex-1 px-4 sm:flex-none">
          <IconSave className="h-4 w-4" />
          {saving ? 'Enregistrement…' : initial ? 'Enregistrer les modifications' : 'Ajouter la vente'}
        </button>
        {onCancel ? (
          <button type="button" onClick={onCancel} className="btn-secondary h-11 px-4">
            Annuler
          </button>
        ) : null}
        {toast ? (
          <span className="ml-auto inline-flex items-center gap-1.5 text-[12px] font-semibold text-olive">
            <IconCheck className="h-4 w-4" />
            {toast}
          </span>
        ) : null}
      </div>
    </form>
  );
}
