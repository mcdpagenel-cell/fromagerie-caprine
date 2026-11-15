import Link from 'next/link';

import type { DayComputed } from '@/lib/types';
import { isDayEmpty } from '@/lib/calc';
import { fmtNumber, isoFromParts, weekday } from '@/lib/format';

export function MonthCalendar({
  year,
  month,
  days,
  today,
}: {
  year: number;
  month: number;
  days: DayComputed[];
  today: string;
}) {
  const first = isoFromParts(year, month, 1);
  const offset = (weekday(first) + 6) % 7;
  const maxLait = Math.max(1, ...days.map((d) => d.laitTotal));
  const filled = days.filter((d) => d.entry && !isDayEmpty(d.entry)).length;
  const alerts = days.filter((d) => d.negative).length;

  return (
    <div>
      <div className="mb-1 grid grid-cols-7 gap-1">
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
          <div key={d} className="pb-0.5 text-center text-[9.5px] font-bold uppercase tracking-wider text-ink-soft/80">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: offset }).map((_, i) => (
          <div key={`blank-${i}`} className="min-h-[58px] rounded-lg bg-cream/30 sm:min-h-[72px]" />
        ))}
        {days.map((d) => {
          const dayNumber = Number(d.date.slice(8, 10));
          const hasData = !!d.entry && !isDayEmpty(d.entry);
          const isToday = d.date === today;
          const isWeekend = [0, 6].includes(weekday(d.date));
          return (
            <Link
              key={d.date}
              href={`/jour/${d.date}`}
              className={`group relative flex min-h-[58px] flex-col rounded-lg border p-1 transition sm:min-h-[72px] sm:p-1.5 ${
                isToday
                  ? 'border-brand bg-brand-soft/60 shadow-sm ring-1 ring-brand/30'
                  : d.negative
                    ? 'border-danger/40 bg-danger-soft/60 hover:border-danger/70'
                    : hasData
                      ? 'border-line bg-paper hover:border-brand/50 hover:shadow-sm'
                      : `border-line/60 bg-paper/40 hover:border-brand/30 ${isWeekend ? 'bg-cream/40' : ''}`
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`num text-[11px] font-bold leading-none sm:text-[12px] ${
                    isToday
                      ? 'grid h-[18px] w-[18px] place-items-center rounded-full bg-brand text-white'
                      : hasData
                        ? 'text-ink'
                        : 'text-ink-soft/60'
                  }`}
                >
                  {dayNumber}
                </span>
                {d.negative ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-danger" title="Stock négatif" />
                ) : hasData ? (
                  <span className="h-1 w-1 rounded-full bg-olive/60" />
                ) : null}
              </div>

              {hasData ? (
                <>
                  <div className="num mt-0.5 text-[10px] font-semibold leading-tight text-brand-dark sm:text-[11px]">
                    {fmtNumber(d.laitTotal, d.laitTotal % 1 === 0 ? 0 : 1)}
                    <span className="ml-0.5 text-[8px] font-medium text-ink-soft">L</span>
                  </div>
                  <div className="mt-auto pt-1">
                    <div className="h-[3px] w-full overflow-hidden rounded-full bg-line/50">
                      <div
                        className="h-full rounded-full bg-brand/80"
                        style={{ width: `${Math.max((d.laitTotal / maxLait) * 100, d.laitTotal > 0 ? 6 : 0)}%` }}
                      />
                    </div>
                    <div className="mt-0.5 hidden text-[9px] text-ink-soft sm:block">
                      {fmtNumber(d.productionPieces)} pcs · {fmtNumber(d.ventePieces)} vend.
                    </div>
                  </div>
                </>
              ) : (
                <span className="mt-auto text-[8.5px] text-ink-soft/40">—</span>
              )}
            </Link>
          );
        })}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[10px] text-ink-soft">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-olive/60" /> saisie
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1 w-4 rounded-full bg-brand/80" /> litrage du jour
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-danger" /> stock négatif
          </span>
        </div>
        <span className="font-semibold">
          {filled} jour{filled > 1 ? 's' : ''} saisi{filled > 1 ? 's' : ''}
          {alerts > 0 ? ` · ${alerts} alerte${alerts > 1 ? 's' : ''}` : ''}
        </span>
      </div>
    </div>
  );
}
