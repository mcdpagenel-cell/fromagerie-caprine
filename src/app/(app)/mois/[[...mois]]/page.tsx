import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { BarChart } from '@/components/charts';
import { MonthCalendar } from '@/components/month-calendar';
import { MonthNav } from '@/components/period-nav';
import { ExportLink, Kpi, PageHeader, RepartitionBar, SectionCard, StockPills } from '@/components/ui';
import { IconAlert, IconSheet } from '@/components/icons';
import { getMonthData, getSettings } from '@/lib/repo';
import { PRODUCTS, PRODUCT_LABELS, type Product } from '@/lib/types';
import { pct } from '@/lib/calc';
import {
  MONTHS_SHORT,
  monthLabel,
  fmtNumber,
  fmtPercent,
  todayISO,
} from '@/lib/format';

export const dynamic = 'force-dynamic';

type Params = { mois?: string[] };

function resolveMonth(segments?: string[]): { year: number; month: number } | null {
  const raw = segments?.[0] ?? todayISO().slice(0, 7);
  const m = /^(\d{4})-(\d{2})$/.exec(raw);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (year < 2000 || year > 2100 || month < 1 || month > 12) return null;
  return { year, month };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { mois } = await params;
  const period = resolveMonth(mois);
  return { title: period ? monthLabel(period.year, period.month) : 'Mois' };
}

export default async function MoisPage({ params }: { params: Promise<Params> }) {
  const { mois } = await params;
  const period = resolveMonth(mois);
  if (!period) notFound();

  const { year, month } = period;
  const [data, settings] = await Promise.all([
    getMonthData(year, month),
    getSettings(),
  ]);
  const today = todayISO();
  const t = data.totals;
  const key = `${year}-${String(month).padStart(2, '0')}`;
  const nbDay = (p: Product) => t.nb[p];
  const totalProd = t.productionPieces;
  const totalVentes = t.ventePieces;
  const anyNegative = Object.values(data.stockFin).some((v) => v < -0.001);

  const dayChart = data.days.map((d) => ({
    label: String(Number(d.date.slice(8, 10))),
    values: [d.laitTotal],
    tooltip: `${d.date} — ${fmtNumber(d.laitTotal, 1)} L de lait`,
  }));

  const prodVenteChart = data.days.map((d) => ({
    label: String(Number(d.date.slice(8, 10))),
    values: [d.productionPieces, d.ventePieces],
    tooltip: `${d.date} — production ${fmtNumber(d.productionPieces)} pcs · ventes ${fmtNumber(d.ventePieces)} pcs`,
  }));

  const laitItems = [
    { key: 'laitBrousses', label: 'Brousses', value: t.laitBrousses, color: 'bg-brand' },
    { key: 'laitFromages', label: 'Fromages', value: t.laitFromages, color: 'bg-olive' },
    { key: 'laitTomes', label: 'Tomes', value: t.laitTomes, color: 'bg-gold' },
  ];

  return (
    <div className="space-y-3.5">
      <PageHeader
        eyebrow="Vue mensuelle"
        title={<span className="capitalize">{monthLabel(year, month)}</span>}
        subtitle={`${t.joursSaisis} jour${t.joursSaisis > 1 ? 's' : ''} saisi${t.joursSaisis > 1 ? 's' : ''} · ${fmtNumber(t.laitTotal, 1)} L de lait mis en fabrication`}
        actions={
          <>
            <ExportLink href={`/api/export/mois?mois=${key}`} variant="primary">
              <IconSheet className="h-4 w-4" /> Excel du mois
            </ExportLink>
            <ExportLink href={`/api/export/annee?annee=${year}`}>
              <IconSheet className="h-4 w-4" /> Année {year}
            </ExportLink>
          </>
        }
      />

      <MonthNav year={year} month={month} />

      {anyNegative ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-3 text-[12.5px] text-danger">
          <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <strong>Stock négatif détecté.</strong> Corrigez les journées concernées dans le
            calendrier ci-dessous.
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Kpi
          label="Lait total"
          value={fmtNumber(t.laitTotal, t.laitTotal % 1 === 0 ? 0 : 1)}
          unit="L"
          hint={`${t.joursTravailles} jours travaillés`}
          tone="brand"
        />
        <Kpi
          label="Production"
          value={fmtNumber(totalProd)}
          unit="pcs"
          hint={`${fmtNumber(t.nb.brousses)} brousses · ${fmtNumber(t.nb.fromages)} fromages`}
        />
        <Kpi
          label="Ventes"
          value={fmtNumber(totalVentes)}
          unit="pcs"
          hint={`${totalProd > 0 ? fmtPercent(pct(totalVentes, totalProd), 0) : '—'} de la production`}
          tone="olive"
        />
        <Kpi
          label="Pertes"
          value={fmtNumber(t.pertePieces)}
          unit="pcs"
          hint={`+ ${fmtNumber(t.pertes.lait, 1)} L de lait`}
          tone="danger"
        />
      </div>

      <div className="grid gap-3.5 lg:grid-cols-[1.3fr_1fr]">
        <SectionCard
          title="Calendrier du mois"
          subtitle="Touchez un jour pour saisir ou modifier"
          bodyClassName="p-3 sm:p-4"
        >
          <MonthCalendar year={year} month={month} days={data.days} today={today} />
        </SectionCard>

        <div className="space-y-3.5">
          <SectionCard title="Stock en fin de mois" subtitle={MONTHS_SHORT[month - 1] + ' ' + year}>
            <StockPills
              stock={data.stockFin}
              items={PRODUCTS.map((p) => ({ key: p, label: PRODUCT_LABELS[p] }))}
            />
            <div className="mt-3 border-t border-line/60 pt-2.5">
              <div className="mb-2 flex items-center justify-between text-[11px]">
                <span className="font-semibold text-ink-soft">Rendement moyen</span>
                <span className="text-ink-soft">pcs / litre</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-olive-soft/70 px-3 py-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft">Brousses</div>
                  <div className="num text-lg font-bold text-olive">
                    {t.rendementBrousses === null ? '—' : fmtNumber(t.rendementBrousses, 2)}
                  </div>
                </div>
                <div className="rounded-xl bg-olive-soft/70 px-3 py-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft">Fromages</div>
                  <div className="num text-lg font-bold text-olive">
                    {t.rendementFromages === null ? '—' : fmtNumber(t.rendementFromages, 2)}
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Litrage par destination" subtitle={`${fmtNumber(t.laitTotal, 1)} L au total`}>
            <RepartitionBar
              items={laitItems.map((i) => ({
                label: i.label,
                value: `${fmtNumber(i.value, 0)} L`,
                pct: pct(i.value, t.laitTotal),
                color: i.color,
              }))}
            />
          </SectionCard>
        </div>
      </div>

      <div className="grid gap-3.5 lg:grid-cols-2">
        <SectionCard title="Lait mis en fabrication" subtitle="Litres par jour" bodyClassName="px-3 pb-3 pt-3">
          <BarChart data={dayChart} series={[{ label: 'Lait (L)', tone: 'brand' }]} unit="L" height={120} />
        </SectionCard>
        <SectionCard
          title="Production & ventes"
          subtitle="Pièces par jour"
          bodyClassName="px-3 pb-3 pt-3"
        >
          <BarChart
            data={prodVenteChart}
            series={[
              { label: 'Production', tone: 'olive' },
              { label: 'Ventes', tone: 'brand' },
            ]}
            unit="pcs"
            height={120}
          />
        </SectionCard>
      </div>

      <SectionCard
        title="Détail par produit"
        subtitle="Cumuls du mois et répartition"
        actions={
          <Link href={`/annee/${year}`} className="text-[11.5px] font-semibold text-brand hover:underline">
            Voir l’année →
          </Link>
        }
        bodyClassName=""
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-[12px]">
            <thead>
              <tr className="border-b border-line bg-cream/60 text-[10px] uppercase tracking-wide text-ink-soft">
                <th className="px-3 py-2 text-left font-bold">Produit</th>
                <th className="px-2 py-2 text-right font-bold">Production</th>
                <th className="px-2 py-2 text-right font-bold">Ventes</th>
                <th className="px-2 py-2 text-right font-bold">Conso.</th>
                <th className="px-2 py-2 text-right font-bold">Pertes</th>
                <th className="px-2 py-2 text-right font-bold">Stock fin</th>
                <th className="px-2 py-2 text-right font-bold">% prod.</th>
                <th className="px-3 py-2 text-right font-bold">% ventes</th>
              </tr>
            </thead>
            <tbody>
              {PRODUCTS.map((p) => {
                const perte = p === 'faisselles' ? 0 : (t.pertes[p] ?? 0);
                const neg = data.stockFin[p] < -0.001;
                return (
                  <tr key={p} className="border-b border-line/60 last:border-0">
                    <td className="px-3 py-2 font-semibold text-ink">{PRODUCT_LABELS[p]}</td>
                    <td className="num px-2 py-2 text-right">{fmtNumber(nbDay(p))}</td>
                    <td className="num px-2 py-2 text-right">{fmtNumber(t.ventes[p])}</td>
                    <td className="num px-2 py-2 text-right">{fmtNumber(t.conso[p])}</td>
                    <td className="num px-2 py-2 text-right text-danger/90">
                      {perte ? fmtNumber(perte) : '—'}
                    </td>
                    <td className={`num px-2 py-2 text-right font-semibold ${neg ? 'text-danger' : ''}`}>
                      {fmtNumber(data.stockFin[p], Number.isInteger(data.stockFin[p]) ? 0 : 1)}
                    </td>
                    <td className="num px-2 py-2 text-right text-ink-soft">
                      {totalProd ? fmtPercent(pct(nbDay(p), totalProd), 0) : '—'}
                    </td>
                    <td className="num px-3 py-2 text-right text-ink-soft">
                      {totalVentes ? fmtPercent(pct(t.ventes[p], totalVentes), 0) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-cream/60 font-bold text-brand-dark">
                <td className="px-3 py-2.5">TOTAL</td>
                <td className="num px-2 py-2.5 text-right">{fmtNumber(totalProd)}</td>
                <td className="num px-2 py-2.5 text-right">{fmtNumber(totalVentes)}</td>
                <td className="num px-2 py-2.5 text-right">{fmtNumber(t.consoPieces)}</td>
                <td className="num px-2 py-2.5 text-right">{fmtNumber(t.pertePieces)}</td>
                <td className="num px-2 py-2.5 text-right">
                  {fmtNumber(
                    PRODUCTS.reduce((acc, p) => acc + data.stockFin[p], 0),
                    0,
                  )}
                </td>
                <td className="px-2 py-2.5 text-right">100 %</td>
                <td className="px-3 py-2.5 text-right">100 %</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </SectionCard>

      <p className="px-1 text-[10.5px] text-ink-soft/80">
        {settings.farmName} · export Excel prêt à archiver : litrage, transformation, rendements,
        ventes, consommation, pertes et stocks avec formules dynamiques.
      </p>
    </div>
  );
}
