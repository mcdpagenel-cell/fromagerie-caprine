'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { NumberField } from './NumberField';
import { IconAlert, IconCheck, IconSave, IconTrash } from '@/components/icons';
import { addStock, mouvements } from '@/lib/calc';
import type { DayEntry, Product, Stock } from '@/lib/types';
import { PRODUCT_LABELS } from '@/lib/types';
import { fmtNumber } from '@/lib/format';

type Props = {
  date: string;
  initialEntry: DayEntry;
  initialSaved: boolean;
  updatedAt?: string;
  stockBefore: Stock;
  isFuture: boolean;
};

type Status = 'clean' | 'dirty' | 'saving' | 'error';

const PRODUCT_ORDER: Product[] = ['brousses', 'fromages', 'faisselles', 'tomes'];

function qty(n: number): string {
  return fmtNumber(n, Number.isInteger(n) ? 0 : 1);
}

function signed(n: number): string {
  if (Math.abs(n) < 0.001) return '0';
  const v = qty(Math.abs(n));
  return `${n > 0 ? '+' : '−'}${v}`;
}

function Section({
  index,
  title,
  subtitle,
  aside,
  children,
  footer,
  tone = 'brand',
}: {
  index: number;
  title: string;
  subtitle: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  tone?: 'brand' | 'olive' | 'danger' | 'neutral';
}) {
  const badge =
    tone === 'brand'
      ? 'bg-brand text-white'
      : tone === 'olive'
        ? 'bg-olive text-white'
        : tone === 'danger'
          ? 'bg-danger text-white'
          : 'bg-ink text-white';

  return (
    <section className="card overflow-hidden">
      <header className="flex items-center gap-3 border-b border-line/70 bg-gradient-to-r from-cream/80 to-transparent px-4 py-3">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[13px] font-bold ${badge}`}>
          {index}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-bold leading-tight text-ink">{title}</h2>
          <p className="truncate text-[11px] text-ink-soft">{subtitle}</p>
        </div>
        {aside ? <div className="ml-auto shrink-0 text-right">{aside}</div> : null}
      </header>
      <div className="grid grid-cols-2 gap-3 p-3.5 sm:grid-cols-3 sm:p-4 lg:grid-cols-4">{children}</div>
      {footer ? <div className="border-t border-line/60 px-3.5 py-2.5 sm:px-4">{footer}</div> : null}
    </section>
  );
}

export function DayForm({
  date,
  initialEntry,
  initialSaved,
  updatedAt,
  stockBefore,
  isFuture,
}: Props) {
  const router = useRouter();
  const [entry, setEntry] = useState<DayEntry>(initialEntry);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(
    initialSaved
      ? updatedAt
        ? new Date(updatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        : ''
      : null,
  );
  const [toast, setToast] = useState<string | null>(null);

  const entryRef = useRef(entry);
  const savingRef = useRef(false);
  const lastSavedRef = useRef<string>(initialSaved ? JSON.stringify(initialEntry) : '');
  const dirtyRef = useRef(false);

  useEffect(() => {
    entryRef.current = entry;
  }, [entry]);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  const set = useCallback((patch: Partial<DayEntry>) => {
    setEntry((prev) => ({ ...prev, ...patch }));
    setDirty(true);
    setError(null);
  }, []);

  const setNum = useCallback(
    (key: keyof DayEntry) => (value: number) => set({ [key]: value } as Partial<DayEntry>),
    [set],
  );

  const save = useCallback(async (): Promise<boolean> => {
    if (savingRef.current) return false;
    savingRef.current = true;
    setSaving(true);
    let ok = false;

    try {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const payload = entryRef.current;
        const json = JSON.stringify(payload);
        const res = await fetch('/api/jour', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: json,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        lastSavedRef.current = json;
        setSavedAt(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
        if (JSON.stringify(entryRef.current) === json) break;
      }
      if (JSON.stringify(entryRef.current) === lastSavedRef.current) {
        setDirty(false);
        ok = true;
      }
      setError(null);
    } catch (err) {
      setError('Enregistrement impossible. Vérifiez la connexion au serveur.');
      console.error(err);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
    return ok;
  }, []);

  // Enregistrement automatique (900 ms après la dernière frappe)
  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(() => {
      void save();
    }, 900);
    return () => clearTimeout(timer);
  }, [dirty, entry, save]);

  // Ctrl/Cmd + S
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void save().then((ok) => {
          if (ok) setToast('Journée enregistrée');
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save]);

  // Avertit si l'on quitte avec des modifications non enregistrées
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const stockAfter = useMemo(() => addStock(stockBefore, mouvements(entry)), [stockBefore, entry]);
  const anyNegative = PRODUCT_ORDER.some((p) => stockAfter[p] < -0.001);
  const lait = entry.laitBrousses + entry.laitFromages + entry.laitTomes;
  const pieces =
    entry.nbBrousses + entry.nbFromages + entry.nbFaisselles + entry.nbTomes;
  const vendues =
    entry.venteBrousses + entry.venteFromages + entry.venteFaisselles + entry.venteTomes;
  const consommees =
    entry.consoBrousses + entry.consoFromages + entry.consoFaisselles + entry.consoTomes;
  const rendB = entry.laitBrousses > 0 ? entry.nbBrousses / entry.laitBrousses : null;
  const rendF = entry.laitFromages > 0 ? entry.nbFromages / entry.laitFromages : null;
  const pertesPieces = entry.perteBrousses + entry.perteFromages + entry.perteTomes;

  const status: Status = error ? 'error' : saving ? 'saving' : dirty ? 'dirty' : 'clean';

  const statusLabel =
    status === 'saving'
      ? 'Enregistrement…'
      : status === 'error'
        ? error
        : status === 'dirty'
          ? 'Modifications non enregistrées'
          : savedAt
            ? `Enregistré${savedAt ? ` à ${savedAt}` : ''}`
            : 'Aucune saisie pour cette journée';

  const deleteDay = async () => {
    if (!window.confirm('Effacer toute la saisie de cette journée ? Cette action est définitive.')) return;
    const res = await fetch(`/api/jour?date=${date}`, { method: 'DELETE' });
    if (res.ok) {
      const reset: DayEntry = { ...initialEntry, deduirePertes: true, note: '' };
      const asRecord = reset as unknown as Record<string, unknown>;
      for (const k of Object.keys(reset)) {
        if (k === 'date' || k === 'deduirePertes' || k === 'note' || k === 'updatedAt') continue;
        asRecord[k] = 0;
      }
      setEntry(reset);
      setDirty(false);
      setSavedAt(null);
      lastSavedRef.current = '';
      setToast('Saisie effacée');
      router.refresh();
    }
  };

  return (
    <div className="space-y-3.5">
      {/* Bandeau stock */}
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-line/70 px-4 py-2.5">
          <h2 className="text-[13px] font-bold uppercase tracking-wide text-ink-soft">
            Stock après cette journée
          </h2>
          {stockBefore.brousses + stockBefore.fromages + stockBefore.faisselles + stockBefore.tomes !==
          stockAfter.brousses + stockAfter.fromages + stockAfter.faisselles + stockAfter.tomes ? (
            <span className="text-[11px] text-ink-soft">
              Veille : {qty(stockBefore.brousses + stockBefore.fromages + stockBefore.faisselles + stockBefore.tomes)} pcs
            </span>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-2 p-2.5 sm:grid-cols-4 sm:gap-3 sm:p-3">
          {PRODUCT_ORDER.map((p) => {
            const value = stockAfter[p];
            const delta = value - stockBefore[p];
            const negative = value < -0.001;
            return (
              <div
                key={p}
                className={`rounded-xl border px-3 py-2.5 transition ${
                  negative
                    ? 'border-danger/40 bg-danger-soft'
                    : 'border-line/80 bg-cream/50'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                    {PRODUCT_LABELS[p]}
                  </span>
                  {negative ? <IconAlert className="h-3.5 w-3.5 shrink-0 text-danger" /> : null}
                </div>
                <div
                  className={`num mt-0.5 text-[26px] font-bold leading-none ${
                    negative ? 'text-danger' : 'text-ink'
                  }`}
                >
                  {qty(value)}
                </div>
                <div
                  className={`mt-1 text-[11px] font-semibold ${
                    delta > 0.001 ? 'text-olive' : delta < -0.001 ? 'text-brand' : 'text-ink-soft/60'
                  }`}
                >
                  {signed(delta)} aujourd’hui
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {anyNegative ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-3 text-[12.5px] leading-snug text-danger">
          <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <strong>Stock négatif.</strong> Vérifiez les ventes, l’autoconsommation ou les pertes
            saisies : il est impossible de vendre plus que le stock disponible.
          </p>
        </div>
      ) : null}

      {isFuture ? (
        <div className="rounded-xl border border-line bg-paper px-3.5 py-2.5 text-[12.5px] text-ink-soft">
          Journée à venir — vous pouvez préparer la saisie, elle sera enregistrée normalement.
        </div>
      ) : null}

      {/* 1 — Litrage */}
      <Section
        index={1}
        title="Litrage"
        subtitle="Lait mis en fabrication"
        aside={
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">Total lait</div>
            <div className="num text-xl font-bold leading-tight text-brand-dark">
              {qty(lait)} <span className="text-xs font-semibold text-ink-soft">L</span>
            </div>
          </div>
        }
      >
        <NumberField
          label="Lait brousses"
          unit="L"
          step={0.5}
          decimals={1}
          value={entry.laitBrousses}
          onChange={setNum('laitBrousses')}
        />
        <NumberField
          label="Lait fromages"
          unit="L"
          step={0.5}
          decimals={1}
          hint="Inclut le lait des faisselles"
          value={entry.laitFromages}
          onChange={setNum('laitFromages')}
        />
        <NumberField
          label="Lait tomes"
          unit="L"
          step={0.5}
          decimals={1}
          value={entry.laitTomes}
          onChange={setNum('laitTomes')}
        />
      </Section>

      {/* 2 — Transformation */}
      <Section
        index={2}
        title="Transformation"
        subtitle="Pièces produites"
        aside={
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">Produites</div>
            <div className="num text-xl font-bold leading-tight text-ink">
              {qty(pieces)} <span className="text-xs font-semibold text-ink-soft">pcs</span>
            </div>
          </div>
        }
        footer={
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip bg-olive-soft text-olive">
              Rend. brousses {rendB === null ? '—' : fmtNumber(rendB, 2)} pcs/L
            </span>
            <span className="chip bg-olive-soft text-olive">
              Rend. fromages {rendF === null ? '—' : fmtNumber(rendF, 2)} pcs/L
            </span>
            <span className="ml-auto hidden text-[10.5px] text-ink-soft sm:block">
              Calculé automatiquement
            </span>
          </div>
        }
      >
        <NumberField label="Nb brousses" unit="pcs" value={entry.nbBrousses} onChange={setNum('nbBrousses')} />
        <NumberField label="Nb fromages" unit="pcs" value={entry.nbFromages} onChange={setNum('nbFromages')} />
        <NumberField label="Nb faisselles" unit="pcs" value={entry.nbFaisselles} onChange={setNum('nbFaisselles')} />
        <NumberField label="Nb tomes" unit="pcs" value={entry.nbTomes} onChange={setNum('nbTomes')} />
      </Section>

      {/* 3 — Ventes */}
      <Section
        index={3}
        tone="olive"
        title="Ventes"
        subtitle="Pièces vendues"
        aside={
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">Vendues</div>
            <div className="num text-xl font-bold leading-tight text-olive">
              {qty(vendues)} <span className="text-xs font-semibold text-ink-soft">pcs</span>
            </div>
          </div>
        }
      >
        <NumberField label="Brousses vendues" unit="pcs" value={entry.venteBrousses} onChange={setNum('venteBrousses')} />
        <NumberField label="Fromages vendus" unit="pcs" value={entry.venteFromages} onChange={setNum('venteFromages')} />
        <NumberField label="Faisselles vendues" unit="pcs" value={entry.venteFaisselles} onChange={setNum('venteFaisselles')} />
        <NumberField label="Tomes vendues" unit="pcs" value={entry.venteTomes} onChange={setNum('venteTomes')} />
      </Section>

      {/* 4 — Consommation */}
      <Section
        index={4}
        tone="neutral"
        title="Consommation"
        subtitle="Autoconsommation & dons"
        aside={
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">Consommées</div>
            <div className="num text-xl font-bold leading-tight text-ink">
              {qty(consommees)} <span className="text-xs font-semibold text-ink-soft">pcs</span>
            </div>
          </div>
        }
      >
        <NumberField label="Brousses" unit="pcs" value={entry.consoBrousses} onChange={setNum('consoBrousses')} />
        <NumberField label="Fromages" unit="pcs" value={entry.consoFromages} onChange={setNum('consoFromages')} />
        <NumberField label="Faisselles" unit="pcs" value={entry.consoFaisselles} onChange={setNum('consoFaisselles')} />
        <NumberField label="Tomes" unit="pcs" value={entry.consoTomes} onChange={setNum('consoTomes')} />
      </Section>

      {/* 5 — Pertes */}
      <Section
        index={5}
        tone="danger"
        title="Pertes & rebuts"
        subtitle="Traçabilité sanitaire et comptable"
        aside={
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">Pertes</div>
            <div className="num text-xl font-bold leading-tight text-danger">
              {qty(pertesPieces)} <span className="text-xs font-semibold text-ink-soft">pcs</span>
            </div>
          </div>
        }
        footer={
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="chip bg-brand-soft text-brand-dark">
                Lait perdu ≈ {qty(entry.perteLait * 2)} fromages
              </span>
              <span className="text-ink-soft">1 litre de lait = 2 fromages</span>
            </div>
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-line bg-cream/50 px-3 py-2.5">
              <span className="text-[12.5px] font-medium text-ink">
                Déduire les pertes du stock disponible
                <span className="block text-[10.5px] font-normal text-ink-soft">
                  Si désactivé, la perte reste comptabilisée mais n’impacte pas le stock.
                </span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={entry.deduirePertes}
                onClick={() => set({ deduirePertes: !entry.deduirePertes })}
                className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                  entry.deduirePertes ? 'bg-brand' : 'bg-line'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${
                    entry.deduirePertes ? 'left-[22px]' : 'left-0.5'
                  }`}
                />
                <span className="sr-only">Déduire les pertes du stock</span>
              </button>
            </label>
          </div>
        }
      >
        <NumberField label="Pertes brousses" unit="pcs" value={entry.perteBrousses} onChange={setNum('perteBrousses')} />
        <NumberField label="Pertes fromages" unit="pcs" value={entry.perteFromages} onChange={setNum('perteFromages')} />
        <NumberField label="Pertes tomes" unit="pcs" value={entry.perteTomes} onChange={setNum('perteTomes')} />
        <NumberField
          label="Pertes lait"
          unit="L"
          step={0.5}
          decimals={1}
          hint="Lait écarté de la fabrication"
          value={entry.perteLait}
          onChange={setNum('perteLait')}
        />
      </Section>

      {/* Note de traçabilité */}
      <details className="card group overflow-hidden">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-[13px] font-semibold text-ink-soft transition hover:text-ink">
          <span className="grid h-6 w-6 place-items-center rounded-full border border-line text-[11px] group-open:bg-brand group-open:text-white group-open:border-brand">
            +
          </span>
          Note de traçabilité
          {entry.note ? (
            <span className="ml-1 truncate rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-medium text-brand-dark">
              {entry.note.slice(0, 40)}
            </span>
          ) : (
            <span className="ml-auto text-[10.5px] font-normal text-ink-soft/70">facultatif</span>
          )}
        </summary>
        <div className="border-t border-line/60 p-3.5">
          <textarea
            value={entry.note}
            onChange={(e) => set({ note: e.target.value })}
            rows={3}
            maxLength={500}
            placeholder="Ex : caillé doux, panne de chauffage, fromage retourné, lot n°…"
            className="w-full resize-y rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15"
          />
        </div>
      </details>

      {/* Barre d'enregistrement */}
      <div className="sticky bottom-[74px] z-20 lg:bottom-4">
        <div
          className={`card flex items-center gap-3 p-2.5 pl-4 ${
            status === 'error' ? 'border-danger/40' : ''
          }`}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              {status === 'clean' && savedAt ? (
                <IconCheck className="h-3.5 w-3.5 shrink-0 text-olive" />
              ) : null}
              {status === 'saving' ? (
                <span className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
              ) : null}
              <span
                className={`truncate text-[11.5px] font-semibold ${
                  status === 'error'
                    ? 'text-danger'
                    : status === 'clean'
                      ? 'text-olive'
                      : 'text-ink-soft'
                }`}
              >
                {statusLabel}
              </span>
            </div>
            <div className="text-[10px] text-ink-soft/70">
              Enregistrement automatique · Ctrl/Cmd + S
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              void save().then((ok) => {
                if (ok) setToast('Journée enregistrée');
              });
            }}
            disabled={saving}
            className="btn-primary h-11 shrink-0 px-4 text-[13px]"
          >
            <IconSave className="h-4 w-4" />
            {saving ? 'Enregistrement' : 'Enregistrer'}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 px-1 pb-2 text-[10.5px] text-ink-soft/80">
        <span>
          {savedAt
            ? `Dernier enregistrement : ${savedAt}`
            : isFuture
              ? 'Journée à venir'
              : 'Journée non saisie'}
        </span>
        <button
          type="button"
          onClick={() => void deleteDay()}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-danger/80 transition hover:bg-danger-soft hover:text-danger"
        >
          <IconTrash className="h-3.5 w-3.5" />
          Effacer la journée
        </button>
      </div>

      {toast ? (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 lg:bottom-8">
          <div className="flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[12.5px] font-semibold text-white shadow-lg">
            <IconCheck className="h-4 w-4 text-olive-soft" />
            {toast}
          </div>
        </div>
      ) : null}
    </div>
  );
}
