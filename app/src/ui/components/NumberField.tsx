import { useEffect, useState } from 'react';

/** Numeric input that commits on blur/Enter and shows the effective value as a placeholder. */
export function NumberField({
  label,
  value,
  onCommit,
  step = 1,
  min = 0,
  max,
  suffix,
  placeholder,
  hint,
}: {
  label: string;
  value: number | undefined;
  onCommit: (v: number | undefined) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  placeholder?: string;
  hint?: string;
}) {
  const [text, setText] = useState(value === undefined ? '' : String(value));
  useEffect(() => setText(value === undefined ? '' : String(value)), [value]);

  const commit = () => {
    if (text.trim() === '') return onCommit(undefined);
    const n = Number(text);
    if (!Number.isFinite(n)) return setText(value === undefined ? '' : String(value));
    const clamped = Math.min(max ?? n, Math.max(min, n));
    onCommit(clamped);
  };

  return (
    <label className="block">
      <span className="text-xs uppercase text-pit-dim">{label}</span>
      <span className="mt-1 flex items-center gap-1">
        <input
          type="number"
          inputMode="decimal"
          className="tnum w-full rounded border border-pit-line bg-pit-bg px-2 py-1"
          value={text}
          step={step}
          min={min}
          max={max}
          placeholder={placeholder}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
        {suffix && <span className="text-sm text-pit-dim">{suffix}</span>}
      </span>
      {hint && <span className="mt-0.5 block text-xs text-pit-dim">{hint}</span>}
    </label>
  );
}
