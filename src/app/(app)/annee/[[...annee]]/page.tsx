import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { BarChart } from '@/components/charts';
import { YearNav } from '@/components/period-nav';
import { ExportLink, Kpi, PageHeader, RepartitionBar, SectionCard, StockPills } from '@/components/ui';
import { IconAlert, IconSheet } from '@/components/icons';
import { getYearData } from '@/lib/repo';
import { PRODUCTS, PRODUCT_LABELS } from '@/lib/types';
import { pct } from '@/lib/calc';
import {
  MONTHS_SHORT,
  fmtNumber,
  fmtPercent,
  todayISO,
} from '@/lib/format';

export const dynamic = 'force-dynamic';

type Params = { annee?: string[] };

function resolveYear(segments?: string[]): number | null {
  const raw = segments?.[0] ?? todayISO().slice(0, 4);
  if (!/^\d{4}$/.test(raw)) return null;
  const year = Number(raw);
  return year >= 2000 && year <= 2100 ? year : null;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { annee } = await params;
  const year = resolveYear(annee);
  return { title: year ? `Année ${year}` : 'Année' };
}

export default async function AnneePage({ params }: { params: Promise<Params> }) {
  const { annee } = await params;
  const year = resolveYear(annee);
  if (!year) notFound();

  const data = await getYearData(year);
  const t = data.totals;
  const anyNegative = data.months.some((m) => m.negativeDays.length > 0);
  const stockTotal = Object.values(data.stockFin).reduce((a, b) => a + b, 0);

  const monthChart = data.months.map((m, i) => ({
    label: MONTHS_SHORT[i].slice(0, 3),
    values: [m.totals.laitTotal],
    tooltip: `${MONTHS_SHORT[i]} ${year} — ${fmtNumber(m.totals.laitTotal, 1)} L`,
  }));

  const prodItems = PRODUCTS.map((p, i) => ({
    label: PRODUCT_LABELS[p],
    value: `${fmtNumber(t.nb[p])} pcs`,
    pct: pct(t.nb[p], t.productionPieces),
    color: ['bg-brand', 'bg-olive', 'bg-gold', 'bg-ink'][i],
  }));

  const venteItems = PRODUCTS.map((p, i) => ({
    label: PRODUCT_LABELS[p],
    value: `${fmtNumber(t.ventes[p])} pcs`,
    pct: pct(t.ventes[p], t.ventePieces),
    color: ['bg-brand', 'bg-olive', 'bg-gold', 'bg-ink'][i],
  }));

  return (
    <div className="space-y-3.5">
      <PageHeader
        eyebrow="Synthèse annuelle"
        title={`Année ${year}`}
        subtitle={`${t.joursSaisis} jours saisis · ${fmtNumber(t.laitTotal, 1)} L de lait transformé`}
        actions={
          <ExportLink href={`/api/export/annee?annee=${year}`} variant="primary">
            <IconSheet className="h-4 w-4" /> Classeur annuel
          </ExportLink>
        }
      />

      <YearNav year={year} />

      {anyNegative ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-3 text-[12.5px] text-danger">
          <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <strong>Stock négatif sur certaines journées.</strong> Consultez les mois signalés dans
            le tableau ci-dessous pour corriger les saisies.
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Kpi
          label="Lait de l’année"
          value={fmtNumber(t.laitTotal, t.laitTotal % 1 === 0 ? 0 : 1)}
          unit="L"
          hint={`${t.joursTravailles} jours travaillés`}
          tone="brand"
        />
        <Kpi
          label="Production"
          value={fmtNumber(t.productionPieces)}
          unit="pcs"
          hint={`${fmtNumber(t.nb.brousses)} brousses · ${fmtNumber(t.nb.fromages)} fromages`}
        />
        <Kpi
          label="Ventes"
          value={fmtNumber(t.ventePieces)}
          unit="pcs"
          hint={`${fmtPercent(pct(t.ventePieces, t.productionPieces), 0)} de la production`}
          tone="olive"
        />
        <Kpi
          label="Rendement moyen"
          value={t.rendementGlobalBrousses === null ? '—' : fmtNumber(t.rendementGlobalBrousses, 2)}
          unit="pcs/L"
          hint={`Brousses · fromages ${t.rendementGlobalFromages === null ? '—' : fmtNumber(t.rendementGlobalFromages, 2)}`}
        />
      </div>

      <div className="grid gap-3.5 lg:grid-cols-[1.35fr_1fr]">
        <SectionCard title="Lait mis en fabrication" subtitle="Total par mois" bodyClassName="px-3 pb-3 pt-3">
          <BarChart
            data={monthChart}
            series={[{ label: 'Lait (L)', tone: 'brand' }]}
            unit="L"
            height={140}
            labelsEvery={1}
            showValues
          />
        </SectionCard>

        <SectionCard
          title="Stock en fin d’année"
          subtitle={`Au 31 décembre ${year} · ${fmtNumber(stockTotal, 0)} pièces`}
        >
          <StockPills
            stock={data.stockFin}
            items={PRODUCTS.map((p) => ({ key: p, label: PRODUCT_LABELS[p] }))}
          />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-cream/70 px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft">Pertes totales</div>
              <div className="num text-lg font-bold text-danger">{fmtNumber(t.pertePieces)} pcs</div>
            </div>
            <div className="rounded-xl bg-cream/70 px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft">Lait perdu</div>
              <div className="num text-lg font-bold text-danger">{fmtNumber(t.pertes.lait, 1)} L</div>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-3.5 lg:grid-cols-2">
        <SectionCard title="Répartition de la production" subtitle={`${fmtNumber(t.productionPieces)} pièces`}>
          <RepartitionBar items={prodItems} />
        </SectionCard>
        <SectionCard title="Répartition des ventes" subtitle={`${fmtNumber(t.ventePieces)} pièces`}>
          <RepartitionBar items={venteItems} />
        </SectionCard>
      </div>

      <SectionCard
        title="Tableau récapitulatif mensuel"
        subtitle="Du mois de janvier à décembre — TOTAL en bas de tableau"
        bodyClassName=""
        actions={
          <span className="hidden text-[10.5px] text-ink-soft sm:block">
            Poids de chaque mois en % de l’année
          </span>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-[11.5px]">
            <thead>
              <tr className="border-b border-line bg-cream/60 text-[9.5px] uppercase tracking-wide text-ink-soft">
                <th className="sticky left-0 z-10 bg-cream px-3 py-2 text-left font-bold">Mois</th>
                <th className="px-2 py-2 text-right font-bold">Lait (L)</th>
                <th className="px-2 py-2 text-right font-bold">Prod.</th>
                <th className="px-2 py-2 text-right font-bold">Ventes</th>
                <th className="px-2 py-2 text-right font-bold">Pertes</th>
                <th className="px-2 py-2 text-right font-bold">Stock br.</th>
                <th className="px-2 py-2 text-right font-bold">Stock fr.</th>
                <th className="px-2 py-2 text-right font-bold">Stock fai.</th>
                <th className="px-2 py-2 text-right font-bold">Stock tomes</th>
                <th className="px-2 py-2 text-right font-bold">% lait</th>
                <th className="px-2 py-2 text-right font-bold">% prod.</th>
                <th className="px-3 py-2 text-right font-bold">% ventes</th>
              </tr>
            </thead>
            <tbody>
              {data.months.map((m, i) => {
                const mt = m.totals;
                const empty = mt.joursSaisis === 0;
                const neg = m.negativeDays.length > 0;
                return (
                  <tr
                    key={m.month}
                    className={`border-b border-line/60 last:border-0 ${
                      neg ? 'bg-danger-soft/40' : empty ? 'text-ink-soft/60' : ''
                    }`}
                  >
                    <td className="sticky left-0 z-10 bg-inherit px-3 py-2">
                      <Link
                        href={`/mois/${year}-${String(m.month).padStart(2, '0')}`}
                        className="inline-flex items-center gap-1.5 font-semibold text-ink hover:text-brand hover:underline"
                      >
                        {neg ? <IconAlert className="h-3 w-3 text-danger" /> : null}
                        {MONTHS_SHORT[i]}
                      </Link>
                    </td>
                    <td className={`num px-2 py-2 text-right ${empty ? '' : 'font-semibold'}`}>
                      {empty ? '—' : fmtNumber(mt.laitTotal, mt.laitTotal % 1 === 0 ? 0 : 1)}
                    </td>
                    <td className="num px-2 py-2 text-right">{empty ? '—' : fmtNumber(mt.productionPieces)}</td>
                    <td className="num px-2 py-2 text-right">{empty ? '—' : fmtNumber(mt.ventePieces)}</td>
                    <td className="num px-2 py-2 text-right text-danger/90">
                      {empty ? '—' : mt.pertePieces ? fmtNumber(mt.pertePieces) : '—'}
                    </td>
                    {PRODUCTS.map((p) => (
                      <td
                        key={p}
                        className={`num px-2 py-2 text-right ${
                          m.stockFin[p] < -0.001 ? 'font-bold text-danger' : ''
                        }`}
                      >
                        {empty ? '—' : fmtNumber(m.stockFin[p], Number.isInteger(m.stockFin[p]) ? 0 : 1)}
                      </td>
                    ))}
                    <td className="num px-2 py-2 text-right text-ink-soft">
                      {t.laitTotal ? fmtPercent(pct(mt.laitTotal, t.laitTotal), 0) : '—'}
                    </td>
                    <td className="num px-2 py-2 text-right text-ink-soft">
                      {t.productionPieces ? fmtPercent(pct(mt.productionPieces, t.productionPieces), 0) : '—'}
                    </td>
                    <td className="num px-3 py-2 text-right text-ink-soft">
                      {t.ventePieces ? fmtPercent(pct(mt.ventePieces, t.ventePieces), 0) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-cream/70 text-[11.5px] font-bold text-brand-dark">
                <td className="sticky left-0 z-10 bg-cream px-3 py-3">TOTAL</td>
                <td className="num px-2 py-3 text-right">{fmtNumber(t.laitTotal, 1)}</td>
                <td className="num px-2 py-3 text-right">{fmtNumber(t.productionPieces)}</td>
                <td className="num px-2 py-3 text-right">{fmtNumber(t.ventePieces)}</td>
                <td className="num px-2 py-3 text-right">{fmtNumber(t.pertePieces)}</td>
                {PRODUCTS.map((p) => (
                  <td key={p} className="num px-2 py-3 text-right">
                    {fmtNumber(data.stockFin[p], Number.isInteger(data.stockFin[p]) ? 0 : 1)}
                  </td>
                ))}
                <td className="num px-2 py-3 text-right">100 %</td>
                <td className="num px-2 py-3 text-right">100 %</td>
                <td className="num px-3 py-3 text-right">100 %</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </SectionCard>

      <p className="px-1 text-[10.5px] text-ink-soft/80">
        Export annuel : 12 onglets mensuels + onglet TOTAL (synthèse et rapports en %) + onglet
        PERTES (suivi journalier et annuel). Les formules Excel restent dynamiques.
      </p>
    </div>
  );
}
