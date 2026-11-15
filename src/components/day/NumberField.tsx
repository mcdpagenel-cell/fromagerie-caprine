'use client';

import { useEffect, useId, useRef, useState } from 'react';

import { IconMinus, IconPlus } from '@/components/icons';

type Props = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  step?: number;
  decimals?: number;
  hint?: string;
  disabled?: boolean;
  compact?: boolean;
};

function toText(value: number, decimals: number): string {
  if (!value) return '';
  const s = decimals > 0 ? value.toFixed(decimals) : String(Math.round(value * 100) / 100);
  return s.replace('.', ',');
}

function parseText(text: string): number {
  const cleaned = text.replace(/\s/g, '').replace(',', '.').replace(/[^0-9.]/g, '');
  if (!cleaned) return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function NumberField({
  label,
  value,
  onChange,
  unit,
  step = 1,
  decimals = 0,
  hint,
  disabled,
  compact,
}: Props) {
  const id = useId();
  const [text, setText] = useState(() => toText(value, decimals));
  const lastEmitted = useRef(value);

  useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      setText(toText(value, decimals));
    }
  }, [value, decimals]);

  const commit = (raw: string) => {
    setText(raw);
    const n = parseText(raw);
    lastEmitted.current = n;
    onChange(n);
  };

  const bump = (delta: number) => {
    const next = Math.max(0, Math.round((parseText(text) + delta) * 100) / 100);
    lastEmitted.current = next;
    setText(toText(next, decimals));
    onChange(next);
  };

  return (
    <div className={compact ? '' : 'min-w-0'}>
      <label htmlFor={id} className="field-label">
        <span className="truncate">{label}</span>
        {unit ? (
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-ink-soft/70">
            {unit}
          </span>
        ) : null}
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="next"
          disabled={disabled}
          value={text}
          placeholder="0"
          onChange={(e) => commit(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={() => {
            const n = parseText(text);
            lastEmitted.current = n;
            setText(toText(n, decimals));
          }}
          className="field-input"
          aria-describedby={hint ? `${id}-hint` : undefined}
        />
        {!disabled ? (
          <>
            <button
              type="button"
              tabIndex={-1}
              onClick={() => bump(-step)}
              aria-label={`Diminuer ${label}`}
              className="absolute bottom-1 left-1 top-1 hidden w-9 place-items-center rounded-lg text-ink-soft transition hover:bg-brand-soft/70 hover:text-brand-dark active:bg-brand-soft sm:grid"
            >
              <IconMinus className="h-4 w-4" />
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={() => bump(step)}
              aria-label={`Augmenter ${label}`}
              className="absolute bottom-1 right-1 top-1 hidden w-9 place-items-center rounded-lg text-ink-soft transition hover:bg-brand-soft/70 hover:text-brand-dark active:bg-brand-soft sm:grid"
            >
              <IconPlus className="h-4 w-4" />
            </button>
          </>
        ) : null}
      </div>
      {hint ? (
        <p id={`${id}-hint`} className="mt-1 text-[10.5px] leading-tight text-ink-soft/80">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
