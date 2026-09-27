import type { SessionState } from '../api/redmist/session-state';
import type { CarPosition } from '../api/redmist/car-position';
import { Flags } from '../api/redmist/flags';
import { emptyCarPosition, emptySessionState } from '../data/patch';
import type { LapRecord } from '../data/sessionStore';
import { toWireClock, toWireDuration } from '../data/time';
import type { LapReplayFixture } from './fixture';

interface CarSim {
  number: string;
  cls: string;
  team: string;
  crossMs: number[];
  lapMs: number[];
  flag: number[];
  pit: number[];
  /** Running minimum lap time up to index i. */
  bestMs: number[];
  bestLapNo: number[];
  /** Running count of pit laps up to and including index i. */
  pitCount: number[];
  /** Class in effect after completing lap index i. */
  clsAt: string[];
}

/** Binary search: number of laps completed at time t. */
function lapsAt(crossMs: number[], t: number): number {
  let lo = 0;
  let hi = crossMs.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (crossMs[mid] <= t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * Reconstructs full SessionState snapshots at arbitrary race time from a lap
 * replay fixture. Powers Dry Run mode; all logic is pure and unit-testable.
 */
export class ReplayEngine {
  private cars: CarSim[] = [];
  private startingOrder = new Map<string, number>();

  constructor(readonly fixture: LapReplayFixture) {
    const teamByNo = new Map(fixture.entries.map((e) => [e.no, e.nm]));
    for (const car of fixture.cars) {
      const sim: CarSim = {
        number: car.n,
        cls: car.c,
        team: teamByNo.get(car.n) ?? '',
        crossMs: car.laps.map((l) => l[2]),
        lapMs: car.laps.map((l) => l[1]),
        flag: car.laps.map((l) => l[3]),
        pit: car.laps.map((l) => l[4]),
        bestMs: [],
        bestLapNo: [],
        pitCount: [],
        clsAt: [],
      };
      const changes = new Map((car.cc ?? []).map(([lap, cls]) => [lap, cls]));
      let cls = car.c;
      let best = Number.MAX_SAFE_INTEGER;
      let bestLap = 0;
      let pits = 0;
      // Timing glitches produce impossible "laps" (e.g. 0:18 at a 1:50 track); keep them out of best laps.
      const sorted = [...sim.lapMs].sort((a, b) => a - b);
      const minPlausible = (sorted[sorted.length >> 1] ?? 0) * 0.7;
      for (let i = 0; i < sim.lapMs.length; i++) {
        if (sim.lapMs[i] < best && sim.lapMs[i] >= minPlausible) {
          best = sim.lapMs[i];
          bestLap = car.laps[i][0];
        }
        if (sim.pit[i]) pits++;
        cls = changes.get(car.laps[i][0]) ?? cls;
        sim.clsAt.push(cls);
        sim.bestMs.push(best);
        sim.bestLapNo.push(bestLap);
        sim.pitCount.push(pits);
      }
      this.cars.push(sim);
    }

    // Starting order: order of first lap crossings.
    [...this.cars]
      .filter((c) => c.crossMs.length > 0)
      .sort((a, b) => a.crossMs[0] - b.crossMs[0])
      .forEach((c, i) => this.startingOrder.set(c.number, i + 1));
  }

  get durationMs(): number {
    return this.fixture.durationMs;
  }

  flagAt(t: number): Flags {
    let current = Flags.Unknown;
    for (const p of this.fixture.flags) {
      if (p.startMs <= t && (p.endMs === null || t < p.endMs)) current = p.f as Flags;
    }
    return current;
  }

  /** Lap history for a car up to time t, in store LapRecord form. */
  lapsUpTo(car: string, t: number): LapRecord[] {
    const sim = this.cars.find((c) => c.number === car);
    if (!sim) return [];
    const n = lapsAt(sim.crossMs, t);
    const out: LapRecord[] = [];
    for (let i = 0; i < n; i++) {
      out.push({
        lap: i + 1,
        lapMs: sim.lapMs[i],
        totalMs: sim.crossMs[i],
        flag: sim.flag[i] as Flags,
        pit: sim.pit[i] === 1,
        overallPosition: 0,
        classPosition: 0,
        cls: sim.clsAt[i],
      });
    }
    return out;
  }

  stateAt(t: number): SessionState {
    const flag = this.flagAt(t);

    interface Ranked {
      sim: CarSim;
      laps: number;
      lastCross: number;
      cls: string;
    }
    const ranked: Ranked[] = this.cars.map((sim) => {
      const laps = lapsAt(sim.crossMs, t);
      return {
        sim,
        laps,
        lastCross: laps > 0 ? sim.crossMs[laps - 1] : Number.MAX_SAFE_INTEGER,
        cls: laps > 0 ? sim.clsAt[laps - 1] : sim.cls,
      };
    });
    ranked.sort(
      (a, b) => b.laps - a.laps || a.lastCross - b.lastCross || a.sim.number.localeCompare(b.sim.number),
    );

    const leader = ranked[0];
    const positions: CarPosition[] = [];
    const classRank = new Map<string, { count: number; leader: Ranked | null; ahead: Ranked | null }>();

    const gapTo = (car: Ranked, ref: Ranked): { gap: string; laps: number } => {
      if (ref.laps > car.laps) return { gap: `${ref.laps - car.laps} lap${ref.laps - car.laps === 1 ? '' : 's'}`, laps: ref.laps - car.laps };
      if (car.laps === 0) return { gap: '', laps: 0 };
      const refCrossSameLap = ref.sim.crossMs[car.laps - 1];
      const ms = Math.max(0, car.lastCross - refCrossSameLap);
      return { gap: (ms / 1000).toFixed(3), laps: 0 };
    };

    for (let i = 0; i < ranked.length; i++) {
      const r = ranked[i];
      const { sim, laps } = r;
      const cp = emptyCarPosition(sim.number);
      cp.eventId = String(this.fixture.eventId);
      cp.sessionId = String(this.fixture.sessionId);
      cp.class = r.cls;
      cp.overallPosition = i + 1;
      cp.trackFlag = flag;

      const cls = r.cls || 'Unclassified';
      const rankInfo = classRank.get(cls) ?? { count: 0, leader: null, ahead: null };
      rankInfo.count++;
      cp.classPosition = rankInfo.count;

      if (laps > 0) {
        cp.lastLapCompleted = laps;
        cp.lastLapTime = toWireDuration(sim.lapMs[laps - 1]);
        cp.totalTime = toWireDuration(sim.crossMs[laps - 1]);
        cp.bestTime = toWireDuration(sim.bestMs[laps - 1]);
        cp.bestLap = sim.bestLapNo[laps - 1];
        cp.pitStopCount = sim.pitCount[laps - 1];
        cp.lapIncludedPit = sim.pit[laps - 1] === 1;
        // The in-progress lap is a pit lap -> show the car as in the pits.
        cp.isInPit = laps < sim.pit.length && sim.pit[laps] === 1;
        let lastPitLap: number | null = null;
        if (sim.pitCount[laps - 1] > 0) {
          for (let j = laps - 1; j >= 0; j--) {
            if (sim.pit[j]) {
              lastPitLap = j + 1;
              break;
            }
          }
        }
        cp.lastLapPitted = lastPitLap;

        if (i > 0) {
          const ahead = ranked[i - 1];
          cp.overallGap = gapTo(r, ahead).gap;
          cp.overallDifference = gapTo(r, leader).gap;
        }
        if (rankInfo.leader) {
          cp.inClassDifference = gapTo(r, rankInfo.leader).gap;
        }
        if (rankInfo.ahead) {
          cp.inClassGap = gapTo(r, rankInfo.ahead).gap;
        }
      }

      const osp = this.startingOrder.get(sim.number);
      if (osp !== undefined) {
        cp.overallStartingPosition = osp;
        cp.overallPositionsGained = osp - cp.overallPosition;
      }

      if (rankInfo.leader === null) rankInfo.leader = r;
      rankInfo.ahead = r;
      classRank.set(cls, rankInfo);
      positions.push(cp);
    }

    // Best-of-session flags
    let bestOverall: CarPosition | null = null;
    const bestByClass = new Map<string, CarPosition>();
    for (const cp of positions) {
      if (!cp.bestTime) continue;
      if (!bestOverall || cp.bestTime < bestOverall.bestTime!) bestOverall = cp;
      const cur = bestByClass.get(cp.class ?? '');
      if (!cur || cp.bestTime < cur.bestTime!) bestByClass.set(cp.class ?? '', cp);
    }
    if (bestOverall) bestOverall.isBestTime = true;
    for (const cp of bestByClass.values()) cp.isBestTimeClass = true;

    const state = emptySessionState();
    state.eventId = this.fixture.eventId;
    state.eventName = this.fixture.eventName;
    state.sessionId = this.fixture.sessionId;
    state.sessionName = this.fixture.sessionName;
    state.currentFlag = flag;
    state.timeToGo = toWireClock(Math.max(0, this.fixture.durationMs - t));
    state.runningRaceTime = toWireClock(t);
    state.localTimeOfDay = toWireClock((this.fixture.localStartMs + t) % 86_400_000);
    state.isLive = true;
    state.isSimulation = true;
    state.eventEntries = this.fixture.entries.map((e) => ({
      number: e.no,
      name: e.nm,
      team: e.t,
      class: e.c,
    }));
    state.carPositions = positions;
    state.classColors = this.fixture.classColors;
    state.classOrder = this.fixture.classOrder;
    return state;
  }
}
