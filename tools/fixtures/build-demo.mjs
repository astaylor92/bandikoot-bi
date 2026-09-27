#!/usr/bin/env node
// Builds a Dry Run replay fixture (redmist-replay/laps@2) from a completed
// Red Mist event using only public REST endpoints:
//   LoadSessions, LoadSessionLaps, LoadFlags, LoadSessionResults
//
// Usage: node tools/fixtures/build-demo.mjs [--event 244] [--session 7] [--out app/public/fixtures/demo-race.json]

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const API = process.env.RM_API_BASE ?? 'https://api.redmist.racing/status';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const eventId = Number(arg('event', '244'));
const sessionId = Number(arg('session', '7'));
const outPath = arg('out', 'app/public/fixtures/demo-race.json');

async function get(path) {
  const url = `${API}/v2/Events/${path}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`GET ${url} -> HTTP ${res.status}`);
  const text = await res.text();
  return text.trim() ? JSON.parse(text) : null;
}

/** "HH:mm:ss.fff" -> ms */
function durMs(s) {
  if (!s) return null;
  const parts = s.split(':');
  let ms = 0;
  let scale = 1000;
  for (let i = parts.length - 1; i >= 0; i--) {
    const n = Math.abs(parseFloat(parts[i]));
    if (Number.isNaN(n)) return null;
    ms += n * scale;
    scale *= 60;
  }
  return Math.round(ms);
}

/** naive "2026-06-27T12:58:33.768064" -> epoch ms (treated as UTC for arithmetic) */
function naiveMs(s) {
  return Date.parse(s.replace(/(\.\d{3})\d+$/, '$1') + 'Z');
}

console.log(`Building fixture for event ${eventId}, session ${sessionId}…`);

const [sessions, lapsRaw, flagsRaw, results, event] = await Promise.all([
  get(`LoadSessions?eventId=${eventId}`),
  get(`LoadSessionLaps?eventId=${eventId}&sessionId=${sessionId}`),
  get(`LoadFlags?eventId=${eventId}&sessionId=${sessionId}`),
  get(`LoadSessionResults?eventId=${eventId}&sessionId=${sessionId}`),
  get(`LoadEvent?eventId=${eventId}`),
]);

const session = sessions.find((s) => s.sid === sessionId);
if (!session) throw new Error(`Session ${sessionId} not found`);
if (!session.et) throw new Error('Session has no end time (still running?)');

// Session start/end come back in UTC; flag timestamps in track-local time.
const tzMs = (session.tz ?? 0) * 3_600_000;
const startUtcMs = naiveMs(session.st);
const durationMs = naiveMs(session.et) - startUtcMs;
const startLocalMs = startUtcMs + tzMs;
const localStartMs = startLocalMs % 86_400_000;

// Flags: f=0 (Unknown) entries mark data gaps; keep real flag states only.
const flags = (flagsRaw ?? [])
  .filter((f) => f.f > 0)
  .map((f) => ({
    f: f.f,
    startMs: Math.max(0, naiveMs(f.s) - startLocalMs),
    endMs: f.e ? Math.max(0, naiveMs(f.e) - startLocalMs) : null,
  }))
  .filter((f) => f.endMs === null || f.endMs > 0)
  .sort((a, b) => a.startMs - b.startMs);

// Group per-lap CarPosition records by car.
const byCar = new Map();
for (const lap of lapsRaw ?? []) {
  const ltm = durMs(lap.ltm);
  const ttm = durMs(lap.ttm);
  if (!lap.n || !lap.llp || ltm === null || ttm === null || ttm <= 0) continue;
  if (!byCar.has(lap.n)) byCar.set(lap.n, { cls: '', laps: [], clsByLap: new Map(), cc: [] });
  const car = byCar.get(lap.n);
  car.laps.push([lap.llp, ltm, ttm, lap.flg ?? 0, lap.lip ? 1 : 0]);
  car.clsByLap.set(lap.llp, lap.class ?? '');
}
for (const car of byCar.values()) {
  car.laps.sort((a, b) => a[0] - b[0]);
  // Drop duplicate lap numbers (data hiccups), keep the last occurrence.
  car.laps = car.laps.filter((l, i, arr) => i === arr.length - 1 || l[0] !== arr[i + 1][0]);
  // Each lap record carries the class at that time, so reclasses are recoverable.
  let prev = null;
  for (const [lapNo] of car.laps) {
    const cls = car.clsByLap.get(lapNo) || prev || '';
    if (prev === null) car.cls = cls;
    else if (cls !== prev) car.cc.push([lapNo, cls]);
    prev = cls;
  }
}

const entries = (results?.eventEntries ?? [])
  .filter((e) => byCar.has(e.no))
  .map((e) => ({ no: e.no, nm: e.nm, t: e.t, c: e.c }));
// Cars that raced but aren't in the entry list still need a row.
for (const [no, car] of byCar) {
  if (!entries.some((e) => e.no === no)) entries.push({ no, nm: `Car ${no}`, t: '', c: car.cls });
}

const classes = [...new Set([...byCar.values()].map((c) => c.cls).filter(Boolean))].sort();
const palette = ['#e11d48', '#2563eb', '#16a34a', '#f59e0b', '#9333ea', '#0891b2'];
const classColors = results?.classColors ?? Object.fromEntries(classes.map((c, i) => [c, palette[i % palette.length]]));
const classOrder = results?.classOrder ?? Object.fromEntries(classes.map((c, i) => [c, String(i + 1)]));

const fixture = {
  format: 'redmist-replay/laps@2',
  eventId,
  eventName: results?.eventName ?? event?.n ?? `Event ${eventId}`,
  sessionId,
  sessionName: results?.sessionName ?? session.n,
  trackName: event?.t ?? '',
  organizationName: event?.on ?? '',
  durationMs,
  localStartMs,
  classColors,
  classOrder,
  entries,
  flags,
  cars: [...byCar.entries()].map(([n, c]) => ({ n, c: c.cls, laps: c.laps, ...(c.cc.length ? { cc: c.cc } : {}) })),
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(fixture));
const totalLaps = [...byCar.values()].reduce((s, c) => s + c.laps.length, 0);
const reclasses = [...byCar.values()].reduce((s, c) => s + c.cc.length, 0);
console.log(
  `Wrote ${outPath}: ${byCar.size} cars, ${totalLaps} laps, ${reclasses} reclasses, ${(durationMs / 3_600_000).toFixed(2)}h, ${flags.length} flag periods`,
);
