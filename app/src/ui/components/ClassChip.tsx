export function ClassChip({
  cls,
  classColors,
}: {
  cls: string | null | undefined;
  classColors: Record<string, string>;
}) {
  if (!cls) return null;
  const color = classColor(cls, classColors);
  return (
    <span
      className="inline-block rounded px-1.5 py-0.5 text-xs font-bold"
      style={{ backgroundColor: color, color: pickTextColor(color) }}
    >
      {cls.replace(/^LDRL\s*/i, '')}
    </span>
  );
}

/** Red Mist sends #AARRGGBB (Avalonia); CSS reads 8-digit hex as #RRGGBBAA. */
export function normalizeArgb(hex: string): string {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{6})$/i.exec(hex.trim());
  return m ? `#${m[2]}` : hex;
}

export function classColor(cls: string, classColors: Record<string, string>): string {
  const raw = classColors[cls];
  return raw ? normalizeArgb(raw) : '#6b7280';
}

function pickTextColor(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '#fff';
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#000' : '#fff';
}
