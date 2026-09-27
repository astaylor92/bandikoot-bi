import type { DirectionRisk, ReclassRisk } from '../../strategy/reclass';

const RISK_STYLE = {
  low: 'bg-pit-line text-pit-dim',
  med: 'bg-flag-yellow text-black',
  high: 'bg-flag-red text-white',
} as const;

function Row({ label, d }: { label: string; d: DirectionRisk | null }) {
  if (!d) return null;
  return (
    <div className="flex items-start gap-3">
      <span className={`mt-0.5 w-12 shrink-0 rounded px-1.5 py-0.5 text-center text-xs font-bold uppercase ${RISK_STYLE[d.risk]}`}>
        {d.risk}
      </span>
      <div className="text-sm">
        <div>
          <span className="font-semibold">{label}</span>{' '}
          <span className="tnum text-pit-dim">~{Math.round(d.perHour * 100)}% within the hour</span>
        </div>
        {d.reasons.length > 0 && <div className="text-xs text-pit-dim">{d.reasons.join(' · ')}</div>}
      </div>
    </div>
  );
}

export function ReclassCard({ risk, title = 'Reclass risk' }: { risk: ReclassRisk | null | undefined; title?: string }) {
  return (
    <div className="rounded-lg border border-pit-line bg-pit-panel p-4">
      <h3 className="mb-2 font-bold">{title}</h3>
      {!risk && <div className="text-sm text-pit-dim">Needs 5+ clean laps.</div>}
      {risk && (
        <div className="space-y-2">
          <Row label="Move up a class" d={risk.up} />
          <Row label="Move down a class" d={risk.down} />
          {!risk.up && !risk.down && <div className="text-sm text-pit-dim">Only class running.</div>}
        </div>
      )}
      <p className="mt-2 text-xs text-pit-dim">
        Heuristic from pace vs. neighbouring classes, consistency and trend, calibrated on 5 past LDRL races.
        Officials reclass at their discretion — treat as a hint.
      </p>
    </div>
  );
}
