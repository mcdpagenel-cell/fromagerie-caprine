import Link from 'next/link';
import type { ReactNode } from 'react';

import { fmtNumber, fmtPercent } from '@/lib/format';

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-0.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-brand">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display text-[24px] font-semibold leading-tight text-ink lg:text-[30px]">
          {title}
        </h1>
        {subtitle ? <p className="mt-0.5 text-[12.5px] text-ink-soft">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Kpi({
  label,
  value,
  unit,
  hint,
  tone = 'ink',
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  tone?: 'ink' | 'brand' | 'olive' | 'danger';
}) {
  const color =
    tone === 'brand'
      ? 'text-brand'
      : tone === 'olive'
        ? 'text-olive'
        : tone === 'danger'
          ? 'text-danger'
          : 'text-ink';
  return (
    <div className="card px-3.5 py-3">
      <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-soft">{label}</div>
      <div className={`num mt-1.5 text-[25px] font-bold leading-none ${color}`}>
        {value}
        {unit ? <span className="ml-1 text-[12px] font-semibold text-ink-soft">{unit}</span> : null}
      </div>
      {hint ? <div className="mt-1.5 truncate text-[10.5px] text-ink-soft">{hint}</div> : null}
    </div>
  );
}

export function ExportLink({
  href,
  children,
  variant = 'secondary',
}: {
  href: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary';
}) {
  return (
    <a
      href={href}
      className={variant === 'primary' ? 'btn-primary h-10 px-3.5 text-[12.5px]' : 'btn-secondary h-10 px-3.5 text-[12.5px]'}
    >
      {children}
    </a>
  );
}

export function RepartitionBar({
  items,
}: {
  items: Array<{ label: string; value: string; pct: number; color: string }>;
}) {
  const total = items.reduce((acc, i) => acc + i.pct, 0);
  return (
    <div>
      <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-cream">
        {items.map((i) => (
          <div
            key={i.label}
            className={i.color}
            style={{ width: `${total > 0 ? i.pct : 0}%` }}
            title={`${i.label} : ${i.value} (${fmtPercent(i.pct)})`}
          />
        ))}
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
        {items.map((i) => (
          <div key={i.label} className="flex min-w-0 items-center gap-1.5">
            <span className={`h-2 w-2 shrink-0 rounded-full ${i.color}`} />
            <span className="truncate text-[11px] text-ink-soft">{i.label}</span>
            <span className="num ml-auto shrink-0 text-[11px] font-semibold text-ink">{i.value}</span>
            <span className="num w-9 shrink-0 text-right text-[10px] text-ink-soft">
              {fmtPercent(i.pct, 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StockPills({
  stock,
  items,
}: {
  stock: Record<string, number>;
  items: Array<{ key: string; label: string }>;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map(({ key, label }) => {
        const value = stock[key] ?? 0;
        const negative = value < -0.001;
        return (
          <div
            key={key}
            className={`rounded-xl border px-2.5 py-2 ${
              negative ? 'border-danger/40 bg-danger-soft' : 'border-line/70 bg-cream/50'
            }`}
          >
            <div className="truncate text-[10px] font-semibold uppercase tracking-wide text-ink-soft">{label}</div>
            <div className={`num text-[19px] font-bold leading-tight ${negative ? 'text-danger' : 'text-ink'}`}>
              {fmtNumber(value, Number.isInteger(value) ? 0 : 1)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SectionCard({
  title,
  subtitle,
  actions,
  children,
  className = '',
  bodyClassName = 'p-3.5 sm:p-4',
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`card overflow-hidden ${className}`}>
      <header className="flex items-center justify-between gap-3 border-b border-line/70 px-4 py-2.5">
        <div className="min-w-0">
          <h2 className="truncate text-[13.5px] font-bold text-ink">{title}</h2>
          {subtitle ? <p className="truncate text-[11px] text-ink-soft">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </header>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-[11.5px] font-semibold text-brand hover:underline">
      {children}
    </Link>
  );
}
