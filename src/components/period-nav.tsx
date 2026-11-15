'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { IconCalendar, IconChevronLeft, IconChevronRight } from '@/components/icons';
import {
  addDays,
  formatDateLong,
  monthLabel,
  todayISO,
} from '@/lib/format';

export function DateNav({ date, isSaved }: { date: string; isSaved: boolean }) {
  const router = useRouter();
  const today = todayISO();
  const isToday = date === today;

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/jour/${addDays(date, -1)}`}
        aria-label="Jour précédent"
        className="grid h-12 w-11 shrink-0 place-items-center rounded-xl border border-line bg-paper text-ink-soft transition hover:border-brand/40 hover:text-brand"
      >
        <IconChevronLeft className="h-5 w-5" />
      </Link>

      <div className="relative min-w-0 flex-1">
        <input
          type="date"
          value={date}
          aria-label="Choisir une date"
          onChange={(e) => {
            if (e.target.value) router.push(`/jour/${e.target.value}`);
          }}
          className=" absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        />
        <div className="flex h-12 items-center justify-center gap-2 rounded-xl border border-line bg-paper px-2 shadow-sm">
          <IconCalendar className="h-4 w-4 shrink-0 text-brand" />
          <span className="truncate text-[15px] font-semibold capitalize text-ink">
            {formatDateLong(date)}
          </span>
        </div>
      </div>

      <Link
        href={`/jour/${addDays(date, 1)}`}
        aria-label="Jour suivant"
        className="grid h-12 w-11 shrink-0 place-items-center rounded-xl border border-line bg-paper text-ink-soft transition hover:border-brand/40 hover:text-brand"
      >
        <IconChevronRight className="h-5 w-5" />
      </Link>

      {!isToday ? (
        <Link
          href="/jour"
          className="hidden shrink-0 rounded-xl border border-brand/30 bg-brand-soft px-3 py-2.5 text-xs font-bold text-brand-dark transition hover:bg-brand-soft/70 sm:block"
        >
          Aujourd’hui
        </Link>
      ) : (
        <span className="hidden shrink-0 items-center gap-1.5 rounded-xl bg-olive-soft px-3 py-2.5 text-xs font-bold text-olive sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-olive" />
          Aujourd’hui
        </span>
      )}

      {isSaved ? (
        <span
          className="hidden shrink-0 rounded-xl bg-olive-soft px-2.5 py-2 text-[11px] font-semibold text-olive md:block"
          title="Cette journée contient une saisie"
        >
          Saisie
        </span>
      ) : null}
    </div>
  );
}

export function MonthNav({ year, month }: { year: number; month: number }) {
  const router = useRouter();
  const prev = new Date(Date.UTC(year, month - 2, 1));
  const next = new Date(Date.UTC(year, month, 1));
  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/mois/${fmt(prev)}`}
        aria-label="Mois précédent"
        className="grid h-12 w-11 place-items-center rounded-xl border border-line bg-paper text-ink-soft transition hover:border-brand/40 hover:text-brand"
      >
        <IconChevronLeft className="h-5 w-5" />
      </Link>

      <div className="relative min-w-0 flex-1">
        <input
          type="month"
          value={`${year}-${String(month).padStart(2, '0')}`}
          aria-label="Choisir un mois"
          onChange={(e) => {
            if (e.target.value) router.push(`/mois/${e.target.value}`);
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

      <Link
        href={`/mois/${fmt(next)}`}
        aria-label="Mois suivant"
        className="grid h-12 w-11 shrink-0 place-items-center rounded-xl border border-line bg-paper text-ink-soft transition hover:border-brand/40 hover:text-brand"
      >
        <IconChevronRight className="h-5 w-5" />
      </Link>

      <Link
        href="/mois"
        className="hidden shrink-0 rounded-xl border border-brand/30 bg-brand-soft px-3 py-2.5 text-xs font-bold text-brand-dark transition hover:bg-brand-soft/70 sm:block"
      >
        Ce mois
      </Link>
    </div>
  );
}

export function YearNav({ year }: { year: number }) {
  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/annee/${year - 1}`}
        aria-label="Année précédente"
        className="grid h-12 w-11 place-items-center rounded-xl border border-line bg-paper text-ink-soft transition hover:border-brand/40 hover:text-brand"
      >
        <IconChevronLeft className="h-5 w-5" />
      </Link>
      <div className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-line bg-paper px-2 shadow-sm">
        <IconCalendar className="h-4 w-4 text-brand" />
        <span className="text-[15px] font-semibold text-ink">{year}</span>
      </div>
      <Link
        href={`/annee/${year + 1}`}
        aria-label="Année suivante"
        className="grid h-12 w-11 place-items-center rounded-xl border border-line bg-paper text-ink-soft transition hover:border-brand/40 hover:text-brand"
      >
        <IconChevronRight className="h-5 w-5" />
      </Link>
      <Link
        href="/annee"
        className="hidden shrink-0 rounded-xl border border-brand/30 bg-brand-soft px-3 py-2.5 text-xs font-bold text-brand-dark transition hover:bg-brand-soft/70 sm:block"
      >
        Cette année
      </Link>
    </div>
  );
}
