'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { IconCalendar, IconChevronLeft, IconChevronRight } from '@/components/icons';
import { addDays, formatDateLong, monthLabel, todayISO } from '@/lib/format';

/* Navigation de la page Ventes — même ergonomie que DateNav / MonthNav / YearNav. */

const navLink =
  'grid h-12 w-11 shrink-0 place-items-center rounded-xl border border-line bg-paper text-ink-soft transition hover:border-brand/40 hover:text-brand';
const todayLink =
  'hidden shrink-0 rounded-xl border border-brand/30 bg-brand-soft px-3 py-2.5 text-xs font-bold text-brand-dark transition hover:bg-brand-soft/70 sm:block';
const todayBadge =
  'hidden shrink-0 items-center gap-1.5 rounded-xl bg-olive-soft px-3 py-2.5 text-xs font-bold text-olive sm:flex';

export function VentesDayNav({ date }: { date: string }) {
  const router = useRouter();
  const today = todayISO();
  const isToday = date === today;

  return (
    <div className="flex items-center gap-2">
      <Link href={`/ventes/${addDays(date, -1)}`} aria-label="Jour précédent" className={navLink}>
        <IconChevronLeft className="h-5 w-5" />
      </Link>

      <div className="relative min-w-0 flex-1">
        <input
          type="date"
          value={date}
          aria-label="Choisir une date"
          onChange={(e) => {
            if (e.target.value) router.push(`/ventes/${e.target.value}`);
          }}
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        />
        <div className="flex h-12 items-center justify-center gap-2 rounded-xl border border-line bg-paper px-2 shadow-sm">
          <IconCalendar className="h-4 w-4 shrink-0 text-brand" />
          <span className="truncate text-[15px] font-semibold capitalize text-ink">
            {formatDateLong(date)}
          </span>
        </div>
      </div>

      <Link href={`/ventes/${addDays(date, 1)}`} aria-label="Jour suivant" className={navLink}>
        <IconChevronRight className="h-5 w-5" />
      </Link>

      {isToday ? (
        <span className={todayBadge}>
          <span className="h-1.5 w-1.5 rounded-full bg-olive" />
          Aujourd’hui
        </span>
      ) : (
        <Link href="/ventes" className={todayLink}>
          Aujourd’hui
        </Link>
      )}
    </div>
  );
}

export function VentesMonthNav({ year, month }: { year: number; month: number }) {
  const router = useRouter();
  const prev = new Date(Date.UTC(year, month - 2, 1));
  const next = new Date(Date.UTC(year, month, 1));
  const fmt = (d: Date) =>
    `/ventes/${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

  return (
    <div className="flex items-center gap-2">
      <Link href={fmt(prev)} aria-label="Mois précédent" className={navLink}>
        <IconChevronLeft className="h-5 w-5" />
      </Link>

      <div className="relative min-w-0 flex-1">
        <input
          type="month"
          value={`${year}-${String(month).padStart(2, '0')}`}
          aria-label="Choisir un mois"
          onChange={(e) => {
            if (e.target.value) router.push(`/ventes/${e.target.value}`);
          }}
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        />
        <div className="flex h-12 items-center justify-center gap-2 rounded-xl border border-line bg-paper px-2 shadow-sm">
          <IconCalendar className="h-4 w-4 shrink-0 text-brand" />
          <span className="truncate text-[15px] font-semibold capitalize text-ink">
            {monthLabel(year, month)}
          </span>
        </div>
      </div>

      <Link href={fmt(next)} aria-label="Mois suivant" className={navLink}>
        <IconChevronRight className="h-5 w-5" />
      </Link>

      <Link href="/ventes" className={todayLink}>
        Ce mois
      </Link>
    </div>
  );
}

export function VentesYearNav({ year }: { year: number }) {
  return (
    <div className="flex items-center gap-2">
      <Link href={`/ventes/${year - 1}`} aria-label="Année précédente" className={navLink}>
        <IconChevronLeft className="h-5 w-5" />
      </Link>
      <div className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-line bg-paper px-2 shadow-sm">
        <IconCalendar className="h-4 w-4 text-brand" />
        <span className="text-[15px] font-semibold text-ink">Année {year}</span>
      </div>
      <Link href={`/ventes/${year + 1}`} aria-label="Année suivante" className={navLink}>
        <IconChevronRight className="h-5 w-5" />
      </Link>
      <Link href="/ventes" className={todayLink}>
        Cette année
      </Link>
    </div>
  );
}
