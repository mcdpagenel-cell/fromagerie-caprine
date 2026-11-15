import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { DateNav } from '@/components/period-nav';
import { DayForm } from '@/components/day/DayForm';
import { getDay, getDayComputed, getSettings } from '@/lib/repo';
import { zeroDay } from '@/lib/calc';
import { formatDateLong, isoWeek, parseISO, todayISO, toISODate } from '@/lib/format';

export const dynamic = 'force-dynamic';

type Params = { date?: string[] };

function resolveDate(segments?: string[]): string {
  const raw = segments?.[0];
  if (!raw) return todayISO();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return '';
  const parsed = parseISO(raw);
  if (Number.isNaN(parsed.getTime()) || toISODate(parsed) !== raw) return '';
  return raw;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { date } = await params;
  const iso = resolveDate(date);
  return { title: iso ? formatDateLong(iso) : 'Journée' };
}

export default async function JourPage({ params }: { params: Promise<Params> }) {
  const { date } = await params;
  const iso = resolveDate(date);
  if (!iso) notFound();

  const [settings, computed, raw] = await Promise.all([
    getSettings(),
    getDayComputed(iso),
    getDay(iso),
  ]);
  const today = todayISO();

  const entry = computed.entry ?? zeroDay(iso);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-3">
      <div className="flex items-end justify-between gap-3 pb-1">
        <div>
          <h1 className="font-display text-[22px] font-semibold leading-tight text-ink lg:text-[26px]">
            Journal de production
          </h1>
          <p className="text-[12px] text-ink-soft">
            {settings.farmName} · semaine {isoWeek(iso)}
            {raw ? ' · saisie enregistrée' : ''}
          </p>
        </div>
        <span className="hidden shrink-0 rounded-full border border-line bg-paper px-3 py-1 text-[11px] font-semibold text-ink-soft sm:block">
          {iso === today ? 'Aujourd’hui' : iso < today ? 'Journée passée' : 'À venir'}
        </span>
      </div>

      <DateNav date={iso} isSaved={!!raw} />

      <DayForm
        key={iso}
        date={iso}
        initialEntry={entry}
        initialSaved={!!raw}
        updatedAt={raw?.updatedAt}
        stockBefore={computed.stockBefore}
        isFuture={iso > today}
      />
    </div>
  );
}
