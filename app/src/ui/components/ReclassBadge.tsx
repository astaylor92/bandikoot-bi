import type { ReclassRisk } from '../../strategy/reclass';
import { headlineRisk } from '../../strategy/reclass';

/** Compact board badge, shown only for high reclass risk to keep the board quiet. */
export function ReclassBadge({ risk }: { risk: ReclassRisk | null | undefined }) {
  const h = headlineRisk(risk ?? undefined, 'high');
  if (!h) return null;
  return (
    <span
      className="mr-1.5 rounded border border-miami-light px-1 py-0.5 text-xs font-bold text-miami-light"
      title={`Reclass ${h.dir} risk: ~${Math.round(h.d.perHour * 100)}% within the hour (historical)\n${h.d.reasons.join('\n')}`}
    >
      {h.dir === 'up' ? '▲' : '▼'} {Math.round(h.d.perHour * 100)}%/h
    </span>
  );
}
