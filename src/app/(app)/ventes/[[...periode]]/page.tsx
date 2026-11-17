import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { BarChart } from '@/components/charts';
import { SaleForm } from '@/components/ventes/SaleForm';
import { SalesList } from '@/components/ventes/SalesList';
import { VentesDayNav, VentesMonthNav, VentesYearNav } from '@/components/ventes/VentesNav';
import { Kpi, PageHeader, SectionCard } from '@/components/ui';
import { aggregateSales, getSalesInRange, getSettings } from '@/lib/repo';
import type { Periode } from '@/lib/ventes';
import { resolvePeriode } from '@/lib/ventes';
import type { SaleEntry } from '@/lib/types';
import {
  daysInMonth,
  fmtEur,
  fmtNumber,
  formatDateLong,
  isoFromParts,
  monthEndISO,
  monthLabel,
  monthStartISO,
  MONTHS_SHORT,
  todayISO,
  weekdayShortFR,
} from '@/lib/format';

export const dynamic = 'force-dynamic';

type Params = { periode?: string[] };

const tableHead =
  'border-b border-line bg-cream/60 text-[10px] uppercase tracking-wide text-ink-soft';
const cellNum = 'num px-2 py-2 text-right';
const cellNumEnd = 'num px-3 py-2 text-right';

function groupByDay(sales: SaleEntry[]): Map<string, SaleEntry[]> {
  const map = new Map<string, SaleEntry[]>();
  for (const s of sales) {
    const list = map.get(s.date);
    if (list) list.push(s);
    else map.set(s.date, [s]);
  }
  return map;
}

function ViewSwitcher({ periode }: { periode: Periode }) {
  const base =
    periode.kind === 'jour'
      ? periode.date
      : periode.kind === 'mois'
        ? monthStartISO(periode.year, periode.month)
        : `${periode.year}-01-01`;
  const items = [
    { kind: 'jour', label: 'Jour', href: `/ventes/${base}` },
    { kind: 'mois', label: 'Mois', href: `/ventes/${base.slice(0, 7)}` },
    { kind: 'annee', label: 'Année', href: `/ventes/${base.slice(0, 4)}` },
  ] as const;

  return (
    <div className="flex items-center gap-1.5">
      {items.map((item) => {
        const active = periode.kind === item.kind;
        return (
          <Link
            key={item.kind}
            href={item.href}
            className={`rounded-full px-3.5 py-1.5 text-[12px] font-bold transition ${
              active
                ? 'bg-brand text-white shadow-sm'
                : 'border border-line bg-paper text-ink-soft hover:border-brand/40 hover:text-brand'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { periode } = await params;
  const p = resolvePeriode(periode);
  if (!p) return { title: 'Ventes' };
  if (p.kind === 'jour') return { title: `Ventes du ${formatDateLong(p.date)}` };
  if (p.kind === 'mois') return { title: `Ventes — ${monthLabel(p.year, p.month)}` };
  return { title: `Ventes ${p.year}` };
}

export default async function VentesPage({ params }: { params: Promise<Params> }) {
  const { periode } = await params;
  const p = resolvePeriode(periode);
  if (!p) notFound();

  const settings = await getSettings();

  /* ---------------- Vue JOUR : caisse du jour ---------------- */
  if (p.kind === 'jour') {
    const date = p.date;
    const sales = await getSalesInRange(date, date);
    const t = aggregateSales(sales);

    return (
      <div className="mx-auto w-full max-w-3xl space-y-3.5">
        <PageHeader
          eyebrow="Ventes & recettes"
          title="Caisse du jour"
          subtitle={`${settings.farmName} · ${formatDateLong(date)}`}
        />

        <ViewSwitcher periode={p} />
        <VentesDayNav date={date} />

        <div className="grid grid-cols-3 gap-2.5">
          <Kpi label="Espèces" value={fmtEur(t.especes)} hint="Billets & pièces" tone="olive" />
          <Kpi label="Carte bancaire" value={fmtEur(t.carte)} hint="Encaissement TPE" tone="brand" />
          <Kpi
            label="Total du jour"
            value={fmtEur(t.total)}
            hint={`${fmtNumber(t.count)} vente${t.count > 1 ? 's' : ''}`}
          />
        </div>

        <SectionCard title="Nouvelle vente" subtitle={`Encaissement du ${formatDateLong(date)}`}>
          <SaleForm key={date} defaultDate={date} />
        </SectionCard>

        <SectionCard
          title="Ventes du jour"
          subtitle={
            t.count > 0
              ? `${fmtNumber(t.count)} vente${t.count > 1 ? 's' : ''} · ${fmtEur(t.total)} encaissés`
              : 'Aucun encaissement'
          }
        >
          <SalesList sales={sales} />
        </SectionCard>

        <p className="px-1 text-[10.5px] text-ink-soft/80">
          L’encaissement carte bancaire se fait via le TPE physique : cette page sert uniquement de
          suivi des recettes (espèces / carte) pour la caisse du jour, du mois et de l’année.
        </p>
      </div>
    );
  }

  /* ---------------- Vue MOIS : récapitulatif mensuel ---------------- */
  if (p.kind === 'mois') {
    const { year, month } = p;
    const start = monthStartISO(year, month);
    const end = monthEndISO(year, month);
    const sales = await getSalesInRange(start, end);
    const t = aggregateSales(sales);
    const byDay = groupByDay(sales);
    const dim = daysInMonth(year, month);
    const days = Array.from({ length: dim }, (_, i) => isoFromParts(year, month, i + 1));

    const chart = days.map((iso) => {
      const dt = aggregateSales(byDay.get(iso) ?? []);
      return {
        label: String(Number(iso.slice(8, 10))),
        values: [dt.especes, dt.carte],
        tooltip: `${iso} — Espèces ${fmtEur(dt.especes)} · Carte ${fmtEur(dt.carte)}`,
      };
    });

    const salesDays = days.filter((iso) => (byDay.get(iso)?.length ?? 0) > 0);

    return (
      <div className="space-y-3.5">
        <PageHeader
          eyebrow="Ventes & recettes"
          title={<span className="capitalize">{monthLabel(year, month)}</span>}
          subtitle={`${fmtNumber(t.count)} vente${t.count > 1 ? 's' : ''} · ${fmtEur(t.total)} encaissés`}
        />

        <ViewSwitcher periode={p} />
        <VentesMonthNav year={year} month={month} />

        <div className="grid grid-cols-3 gap-2.5">
          <Kpi label="Total Espèces" value={fmtEur(t.especes)} hint="Billets & pièces" tone="olive" />
          <Kpi label="Total Carte" value={fmtEur(t.carte)} hint="Encaissement TPE" tone="brand" />
          <Kpi
            label="Chiffre d’affaires"
            value={fmtEur(t.total)}
            hint={`${fmtNumber(t.count)} vente${t.count > 1 ? 's' : ''}`}
          />
        </div>

        <SectionCard title="Recettes par jour" subtitle="Espèces et carte bancaire" bodyClassName="px-3 pb-3 pt-3">
          <BarChart
            data={chart}
            series={[
              { label: 'Espèces (€)', tone: 'olive' },
              { label: 'Carte (€)', tone: 'brand' },
            ]}
            unit="€"
            height={120}
          />
        </SectionCard>

        <SectionCard
          title="Détail journalier"
          subtitle="Touchez un jour pour voir ou modifier les ventes"
          bodyClassName=""
        >
          {salesDays.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] font-semibold text-ink-soft">
              Aucune vente enregistrée ce mois-ci
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-[12px]">
                <thead>
                  <tr className={tableHead}>
                    <th className="sticky left-0 z-10 bg-cream px-3 py-2 text-left font-bold">Jour</th>
                    <th className="px-2 py-2 text-right font-bold">Espèces</th>
                    <th className="px-2 py-2 text-right font-bold">Carte</th>
                    <th className="px-2 py-2 text-right font-bold">Total</th>
                    <th className="px-3 py-2 text-right font-bold">Ventes</th>
                  </tr>
                </thead>
                <tbody>
                  {salesDays.map((iso) => {
                    const dt = aggregateSales(byDay.get(iso) ?? []);
                    return (
                      <tr key={iso} className="border-b border-line/60 last:border-0">
                        <td className="sticky left-0 z-10 bg-inherit px-3 py-2">
                          <Link
                            href={`/ventes/${iso}`}
                            className="inline-flex items-center gap-1.5 font-semibold text-ink hover:text-brand hover:underline"
                          >
                            <span className="capitalize">{weekdayShortFR(iso)}.</span>
                            {Number(iso.slice(8, 10))}
                          </Link>
                        </td>
                        <td className={`${cellNum} text-olive`}>{fmtEur(dt.especes)}</td>
                        <td className={`${cellNum} text-brand-dark`}>{fmtEur(dt.carte)}</td>
                        <td className={`${cellNum} font-bold`}>{fmtEur(dt.total)}</td>
                        <td className={`${cellNumEnd} text-ink-soft`}>{fmtNumber(dt.count)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-cream/70 font-bold text-brand-dark">
                    <td className="sticky left-0 z-10 bg-cream px-3 py-2.5">TOTAL</td>
                    <td className={cellNum}>{fmtEur(t.especes)}</td>
                    <td className={cellNum}>{fmtEur(t.carte)}</td>
                    <td className={cellNum}>{fmtEur(t.total)}</td>
                    <td className={cellNumEnd}>{fmtNumber(t.count)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </SectionCard>
      </div>
    );
  }

  /* ---------------- Vue ANNÉE : récapitulatif annuel ---------------- */
  const year = p.year;
  const sales = await getSalesInRange(`${year}-01-01`, `${year}-12-31`);
  const t = aggregateSales(sales);
  const byMonth = new Map<number, SaleEntry[]>();
  for (const s of sales) {
    const m = Number(s.date.slice(5, 7));
    const list = byMonth.get(m);
    if (list) list.push(s);
    else byMonth.set(m, [s]);
  }

  const chart = Array.from({ length: 12 }, (_, i) => {
    const mt = aggregateSales(byMonth.get(i + 1) ?? []);
    return {
      label: MONTHS_SHORT[i].slice(0, 3),
      values: [mt.total],
      tooltip: `${MONTHS_SHORT[i]} ${year} — CA ${fmtEur(mt.total)}`,
    };
  });

  return (
    <div className="space-y-3.5">
      <PageHeader
        eyebrow="Ventes & recettes"
        title={`Année ${year}`}
        subtitle={`${fmtNumber(t.count)} vente${t.count > 1 ? 's' : ''} · ${fmtEur(t.total)} encaissés`}
      />

      <ViewSwitcher periode={p} />
      <VentesYearNav year={year} />

      <div className="grid grid-cols-3 gap-2.5">
        <Kpi label="Total Espèces" value={fmtEur(t.especes)} hint="Billets & pièces" tone="olive" />
        <Kpi label="Total Carte" value={fmtEur(t.carte)} hint="Encaissement TPE" tone="brand" />
        <Kpi
          label="Chiffre d’affaires"
          value={fmtEur(t.total)}
          hint={`${fmtNumber(t.count)} vente${t.count > 1 ? 's' : ''}`}
        />
      </div>

      <SectionCard title="Chiffre d’affaires par mois" subtitle="Toutes recettes confondues" bodyClassName="px-3 pb-3 pt-3">
        <BarChart
          data={chart}
          series={[{ label: 'CA (€)', tone: 'gold' }]}
          unit="€"
          height={140}
          labelsEvery={1}
          showValues
        />
      </SectionCard>

      <SectionCard
        title="Récapitulatif mensuel des ventes"
        subtitle="Espèces, carte bancaire et chiffre d’affaires"
        bodyClassName=""
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-[12px]">
            <thead>
              <tr className={tableHead}>
                <th className="sticky left-0 z-10 bg-cream px-3 py-2 text-left font-bold">Mois</th>
                <th className="px-2 py-2 text-right font-bold">Espèces</th>
                <th className="px-2 py-2 text-right font-bold">Carte</th>
                <th className="px-2 py-2 text-right font-bold">Total</th>
                <th className="px-3 py-2 text-right font-bold">Ventes</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 12 }, (_, i) => {
                const mt = aggregateSales(byMonth.get(i + 1) ?? []);
                const empty = mt.count === 0;
                return (
                  <tr
                    key={i + 1}
                    className={`border-b border-line/60 last:border-0 ${empty ? 'text-ink-soft/60' : ''}`}
                  >
                    <td className="sticky left-0 z-10 bg-inherit px-3 py-2">
                      <Link
                        href={`/ventes/${year}-${String(i + 1).padStart(2, '0')}`}
                        className="font-semibold text-ink hover:text-brand hover:underline"
                      >
                        {MONTHS_SHORT[i]}
                      </Link>
                    </td>
                    <td className={`${cellNum} ${empty ? '' : 'text-olive'}`}>
                      {empty ? '—' : fmtEur(mt.especes)}
                    </td>
                    <td className={`${cellNum} ${empty ? '' : 'text-brand-dark'}`}>
                      {empty ? '—' : fmtEur(mt.carte)}
                    </td>
                    <td className={`${cellNum} ${empty ? '' : 'font-bold'}`}>
                      {empty ? '—' : fmtEur(mt.total)}
                    </td>
                    <td className={cellNumEnd}>{empty ? '—' : fmtNumber(mt.count)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-cream/70 font-bold text-brand-dark">
                <td className="sticky left-0 z-10 bg-cream px-3 py-2.5">TOTAL</td>
                <td className={cellNum}>{fmtEur(t.especes)}</td>
                <td className={cellNum}>{fmtEur(t.carte)}</td>
                <td className={cellNum}>{fmtEur(t.total)}</td>
                <td className={cellNumEnd}>{fmtNumber(t.count)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
