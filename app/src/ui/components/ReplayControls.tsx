import { useAppStore } from '../../state/appStore';
import { getActiveReplay } from '../../data/connect';
import { formatClock } from '../../data/time';

const SPEEDS = [1, 10, 30, 60];

export function ReplayControls() {
  const progress = useAppStore((s) => s.replay);
  if (!progress) return null;
  const replay = getActiveReplay();
  if (!replay) return null;

  return (
    <div className="flex items-center gap-3 border-t border-pit-line bg-pit-panel px-3 py-2">
      <button
        className="w-16 rounded bg-accent px-2 py-1 text-sm font-bold text-black"
        onClick={() => (progress.playing ? replay.pause() : replay.play())}
      >
        {progress.playing ? 'Pause' : 'Play'}
      </button>
      <span className="tnum text-sm">{formatClock(progress.simTimeMs)}</span>
      <input
        type="range"
        className="min-w-0 flex-1 accent-sky-400"
        min={0}
        max={progress.durationMs}
        step={30_000}
        value={progress.simTimeMs}
        onChange={(e) => replay.seekTo(Number(e.target.value))}
      />
      <span className="tnum text-sm text-pit-dim">{formatClock(progress.durationMs)}</span>
      <select
        className="rounded border border-pit-line bg-pit-bg px-1 py-0.5 text-sm"
        value={progress.speed}
        onChange={(e) => replay.setSpeed(Number(e.target.value))}
      >
        {SPEEDS.map((s) => (
          <option key={s} value={s}>
            {s}×
          </option>
        ))}
      </select>
    </div>
  );
}
