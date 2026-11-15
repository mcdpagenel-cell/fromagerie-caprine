import { fmtNumber } from '@/lib/format';

export type ChartSeries = { label: string; tone: 'brand' | 'olive' | 'gold' };

const FILL: Record<string, string> = {
  brand: 'bg-brand',
  olive: 'bg-olive',
  gold: 'bg-gold',
};

const DOT: Record<string, string> = {
  brand: 'bg-brand',
  olive: 'bg-olive',
  gold: 'bg-gold',
};

export function BarChart({
  data,
  series,
  height = 130,
  unit,
  labelsEvery = 5,
  showValues = false,
}: {
  data: Array<{ label: string; values: number[]; tooltip?: string }>;
  series: ChartSeries[];
  height?: number;
  unit?: string;
  labelsEvery?: number;
  showValues?: boolean;
}) {
  const max = Math.max(1, ...data.flatMap((d) => d.values));
  const step = Math.max(1, Math.ceil(data.length / (data.length > 16 ? 8 : data.length)));

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {series.map((s) => (
            <span key={s.label} className="inline-flex items-center gap-1.5 text-[10.5px] font-medium text-ink-soft">
              <span className={`h-2 w-2 rounded-sm ${DOT[s.tone]}`} />
              {s.label}
            </span>
          ))}
        </div>
        <span className="num text-[10px] text-ink-soft/80">
          max {fmtNumber(max, Number.isInteger(max) ? 0 : 1)} {unit}
        </span>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="border-t border-dashed border-line/60" />
          ))}
        </div>
        <div className="relative flex items-end gap-[2px]" style={{ height }}>
          {data.map((d, idx) => {
            const tip =
              d.tooltip ??
              `${d.label} — ${series.map((s, si) => `${s.label} ${fmtNumber(d.values[si] ?? 0, 1)}`).join(' · ')}`;
            return (
              <div
                key={`${d.label}-${idx}`}
                className="group flex h-full flex-1 items-end justify-center gap-[1px]"
                title={tip}
              >
                {d.values.map((v, si) => (
                  <div
                    key={si}
                    className={`w-full rounded-t-[2px] transition-opacity ${
                      si === 0 ? FILL[series[si]?.tone ?? 'brand'] : FILL[series[si]?.tone ?? 'olive']
                    } ${v > 0 ? 'opacity-90 group-hover:opacity-100' : 'opacity-0'}`}
                    style={{
                      height: v > 0 ? `${Math.max((v / max) * 100, 1.5)}%` : 0,
                      maxWidth: series.length > 1 ? '48%' : '70%',
                    }}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-1.5 flex gap-[2px]">
        {data.map((d, idx) => (
          <div key={`${d.label}-lab-${idx}`} className="num flex-1 text-center text-[9px] text-ink-soft/80">
            {idx % step === 0 || idx === data.length - 1 ? d.label : ''}
          </div>
        ))}
      </div>

      {showValues ? (
        <div className="mt-1 flex gap-[2px]">
          {data.map((d, idx) => (
            <div key={`${d.label}-val-${idx}`} className="num flex-1 text-center text-[9px] font-semibold text-ink">
              {d.values[0] ? fmtNumber(d.values[0], Number.isInteger(d.values[0]) ? 0 : 1) : ''}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function MiniBars({
  values,
  tone = 'brand',
}: {
  values: number[];
  tone?: 'brand' | 'olive' | 'gold';
}) {
  const max = Math.max(1, ...values);
  return (
    <div className="flex h-8 items-end gap-[2px]">
      {values.map((v, i) => (
        <div
          key={i}
          className={`flex-1 rounded-sm ${FILL[tone]} ${v > 0 ? 'opacity-80' : 'opacity-10'}`}
          style={{ height: `${Math.max((v / max) * 100, 4)}%` }}
        />
      ))}
    </div>
  );
}
