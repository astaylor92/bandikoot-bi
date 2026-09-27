// Backtests the reclass-risk heuristic (app/src/strategy/reclass.ts) over every
// bundled Dry Run fixture. Every 10 min of race time it scores each car, then
// checks whether that car was actually reclassed in the next 10 min.
//
// Usage (from the repo root): npm run backtest:reclass
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { ReplayEngine } from '../../app/src/replay/replayEngine';
import type { LapReplayFixture } from '../../app/src/replay/fixture';
import { paceSnapshot, reclassRisks, type CarPaceSnapshot, type Risk } from '../../app/src/strategy/reclass';
import { classHistory } from '../../app/src/strategy/stints';

const DIR = resolve(__dirname, '../../app/public/fixtures');
const STEP = 10 * 60_000;
const EARLY = 60 * 60_000;

type Key = `${'up' | 'down'}:${'early' | 'later'}:${Risk}`;
const table = new Map<Key, { n: number; hits: number }>();
const recall = { up: { events: 0, med: 0, high: 0 }, down: { events: 0, med: 0, high: 0 } };

for (const file of readdirSync(DIR).filter((f) => /^\d+-\d+\.json$/.test(f))) {
  const fx = JSON.parse(readFileSync(resolve(DIR, file), 'utf8')) as LapReplayFixture;
  const engine = new ReplayEngine(fx);
  const rank = (c: string) => parseInt(fx.classOrder[c] ?? '99', 10);
  const allLaps = Object.fromEntries(fx.cars.map((c) => [c.n, engine.lapsUpTo(c.n, fx.durationMs)]));
  const changes = Object.fromEntries(Object.entries(allLaps).map(([n, l]) => [n, classHistory(l)]));

  for (let t = 20 * 60_000; t < fx.durationMs; t += STEP) {
    const snaps: CarPaceSnapshot[] = [];
    for (const c of fx.cars) {
      const laps = engine.lapsUpTo(c.n, t);
      const last = laps[laps.length - 1];
      if (!last?.cls) continue;
      const s = paceSnapshot(c.n, last.cls, laps);
      if (s) snaps.push(s);
    }
    const risks = reclassRisks(snaps, fx.classOrder, t);
    const phase = t < EARLY ? 'early' : 'later';
    for (const s of snaps) {
      const next = changes[s.car].find((ch) => ch.atMs !== null && ch.atMs > t && ch.atMs <= t + STEP);
      const moved = next ? (rank(next.to) < rank(s.cls) ? 'up' : 'down') : null;
      for (const dir of ['up', 'down'] as const) {
        const d = risks[s.car][dir];
        if (!d) continue;
        const key: Key = `${dir}:${phase}:${d.risk}`;
        const row = table.get(key) ?? { n: 0, hits: 0 };
        row.n++;
        if (moved === dir) row.hits++;
        table.set(key, row);
        if (moved === dir && phase === 'later') {
          recall[dir].events++;
          if (d.risk !== 'low') recall[dir].med++;
          if (d.risk === 'high') recall[dir].high++;
        }
      }
    }
  }
}

console.log('dir   phase  band   samples  hits  per10min  perHour');
for (const [key, { n, hits }] of [...table.entries()].sort()) {
  const [dir, phase, band] = key.split(':');
  const p = hits / n;
  console.log(
    `${dir.padEnd(5)} ${phase.padEnd(6)} ${band.padEnd(5)} ${String(n).padStart(8)} ${String(hits).padStart(5)} ${p.toFixed(4).padStart(9)} ${(1 - (1 - p) ** 6).toFixed(3).padStart(8)}`,
  );
}
for (const dir of ['up', 'down'] as const) {
  const r = recall[dir];
  console.log(`${dir}: ${r.events} reclasses after the first hour; ${r.med} flagged med+, ${r.high} high`);
}
