'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { SaleForm } from './SaleForm';
import { IconPencil, IconTrash } from '@/components/icons';
import { fmtEur } from '@/lib/format';
import { PAYMENT_LABELS, type SaleEntry } from '@/lib/types';

export function SalesList({ sales }: { sales: SaleEntry[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const remove = async (sale: SaleEntry) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette vente ?')) return;
    setBusyId(sale.id);
    try {
      const res = await fetch(`/api/ventes?id=${sale.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      router.refresh();
    } catch (err) {
      console.error(err);
      window.alert('Suppression impossible. Vérifiez la connexion au serveur.');
    } finally {
      setBusyId(null);
    }
  };

  if (sales.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-[13px] font-semibold text-ink-soft">Aucune vente enregistrée ce jour</p>
        <p className="mt-1 text-[11.5px] text-ink-soft/80">
          Utilisez le formulaire ci-dessus pour saisir la première vente.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-line/60">
      {sales.map((sale) =>
        editingId === sale.id ? (
          <li key={sale.id} className="p-3.5 sm:p-4">
            <SaleForm
              defaultDate={sale.date}
              initial={sale}
              onDone={() => setEditingId(null)}
              onCancel={() => setEditingId(null)}
            />
          </li>
        ) : (
          <li key={sale.id} className="flex flex-wrap items-center gap-2 px-3 py-2.5 sm:px-4">
            <span
              className={`chip shrink-0 ${
                sale.moyen === 'especes' ? 'bg-olive-soft text-olive' : 'bg-brand-soft text-brand-dark'
              }`}
            >
              {PAYMENT_LABELS[sale.moyen]}
            </span>
            <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink-soft">
              {sale.note || <span className="text-ink-soft/50">—</span>}
            </span>
            <span className="num shrink-0 text-[15px] font-bold text-ink">{fmtEur(sale.montant)}</span>
            <span className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => setEditingId(sale.id)}
                className="btn-ghost h-9 px-2.5 text-[12px]"
                aria-label={`Modifier la vente de ${fmtEur(sale.montant)}`}
              >
                <IconPencil className="h-4 w-4" />
                Modifier
              </button>
              <button
                type="button"
                disabled={busyId === sale.id}
                onClick={() => void remove(sale)}
                className="btn-ghost h-9 px-2.5 text-[12px] text-danger/80 hover:bg-danger-soft hover:text-danger"
                aria-label={`Supprimer la vente de ${fmtEur(sale.montant)}`}
              >
                <IconTrash className="h-4 w-4" />
                Supprimer
              </button>
            </span>
          </li>
        ),
      )}
    </ul>
  );
}
