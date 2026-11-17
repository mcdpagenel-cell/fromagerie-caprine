'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { IconPencil, IconTrash } from '@/components/icons';
import {
  consoPieces,
  laitTotal,
  pertePieces,
  productionPieces,
  ventePieces,
} from '@/lib/calc';
import { formatDateMedium, fmtNumber } from '@/lib/format';
import type { DayEntry } from '@/lib/types';

/**
 * Historique des journées saisies : chaque ligne propose les actions
 * « Modifier » (formulaire du jour, pré-rempli) et « Supprimer »
 * (confirmation puis suppression définitive).
 * Les récapitulatifs sont recalculés automatiquement après chaque action.
 */
export function HistoryList({ entries }: { entries: DayEntry[] }) {
  const router = useRouter();
  const [busyDate, setBusyDate] = useState<string | null>(null);

  const remove = async (date: string) => {
    if (
      !window.confirm(
        'Êtes-vous sûr de vouloir supprimer cette saisie ? Cette action est définitive.',
      )
    ) {
      return;
    }
    setBusyDate(date);
    try {
      const res = await fetch(`/api/jour?date=${date}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      router.refresh();
    } catch (err) {
      console.error(err);
      window.alert('Suppression impossible. Vérifiez la connexion au serveur.');
    } finally {
      setBusyDate(null);
    }
  };

  if (entries.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-[13px] font-semibold text-ink-soft">Aucune journée saisie ce mois-ci</p>
        <p className="mt-1 text-[11.5px] text-ink-soft/80">
          Les journées saisies apparaîtront ici avec leurs actions de correction.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-line/60">
      {entries.map((e) => {
        const busy = busyDate === e.date;
        return (
          <li key={e.date} className="flex flex-wrap items-center gap-2 px-3 py-2.5 sm:px-4">
            <Link
              href={`/jour/${e.date}`}
              className="w-[74px] shrink-0 text-[12px] font-semibold capitalize text-ink transition hover:text-brand"
            >
              {formatDateMedium(e.date)}
            </Link>

            <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
              <span className="chip bg-brand-soft text-brand-dark">
                {fmtNumber(laitTotal(e), laitTotal(e) % 1 === 0 ? 0 : 1)} L
              </span>
              <span className="chip bg-cream text-ink-soft">
                {fmtNumber(productionPieces(e))} prod.
              </span>
              <span className="chip bg-olive-soft text-olive">{fmtNumber(ventePieces(e))} vend.</span>
              {consoPieces(e) > 0 ? (
                <span className="chip bg-cream text-ink-soft">{fmtNumber(consoPieces(e))} conso.</span>
              ) : null}
              {pertePieces(e) > 0 || e.perteLait > 0 ? (
                <span className="chip bg-danger-soft text-danger">
                  {fmtNumber(pertePieces(e) + e.perteLait * 2)} pertes
                </span>
              ) : null}
              {e.note ? (
                <span
                  className="hidden max-w-[220px] truncate text-[11px] italic text-ink-soft/80 md:inline"
                  title={e.note}
                >
                  « {e.note} »
                </span>
              ) : null}
            </span>

            <span className="flex shrink-0 items-center gap-1">
              <Link
                href={`/jour/${e.date}`}
                className="btn-ghost h-9 px-2.5 text-[12px] font-semibold text-brand-dark"
                aria-label={`Modifier la saisie du ${e.date}`}
              >
                <IconPencil className="h-4 w-4" />
                Modifier
              </Link>
              <button
                type="button"
                disabled={busy}
                onClick={() => void remove(e.date)}
                className="btn-ghost h-9 px-2.5 text-[12px] font-semibold text-danger/80 hover:bg-danger-soft hover:text-danger"
                aria-label={`Supprimer la saisie du ${e.date}`}
              >
                <IconTrash className="h-4 w-4" />
                Supprimer
              </button>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
