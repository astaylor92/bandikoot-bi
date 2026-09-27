import { useEffect, useState } from 'react';
import { useAppStore } from './state/appStore';
import { useSessionStore } from './data/sessionStore';
import { disconnect } from './data/connect';
import { flagStyle } from './ui/flag';
import { ConnectionBadge, ConnectionBanner } from './ui/components/ConnectionBanner';
import { ReplayControls } from './ui/components/ReplayControls';
import { EventPicker } from './ui/screens/EventPicker';
import { TimingBoard } from './ui/screens/TimingBoard';
import { CarDetail } from './ui/screens/CarDetail';
import { StrategyPage } from './ui/screens/StrategyPage';
import { PlanPage } from './ui/screens/PlanPage';
import { SettingsPage } from './ui/screens/SettingsPage';
import { RivalPage } from './ui/screens/RivalPage';
import { RivalToast } from './ui/components/RivalToast';
import { FreshnessBadge } from './ui/components/FreshnessBadge';
import { formatClock } from './data/time';
import { useRaceClock } from './ui/hooks/useRaceClock';
import { clockLabel } from './strategy/schedule';
import { ScheduleEditor } from './ui/components/ScheduleEditor';

export default function App() {
  const view = useAppStore((s) => s.view);
  const mode = useAppStore((s) => s.mode);
  const eventLabel = useAppStore((s) => s.eventLabel);
  const navigate = useAppStore((s) => s.navigate);
  const session = useSessionStore((s) => s.session);
  const hasSession = useSessionStore((s) => s.hasSession);

  // Keep the screen awake at the pit wall.
  useEffect(() => {
    let lock: { release(): Promise<void> } | null = null;
    const request = async () => {
      try {
        const wl = (navigator as Navigator & { wakeLock?: { request(t: string): Promise<never> } })
          .wakeLock;
        if (wl && mode !== null) lock = await wl.request('screen');
      } catch {
        // not critical
      }
    };
    void request();
    const onVis = () => document.visibilityState === 'visible' && void request();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      void lock?.release().catch(() => {});
    };
  }, [mode]);

  const inSession = mode !== null;
  const flag = flagStyle(session.currentFlag);

  const leaveSession = async () => {
    await disconnect();
    useAppStore.getState().setSession(null, null);
    navigate({ name: 'events' });
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-pit-line bg-pit-panel">
        <div className="flex items-center gap-2 px-2 py-2 sm:gap-3 sm:px-3">
          <button className="shrink-0 text-left" onClick={() => (inSession ? navigate({ name: 'board' }) : navigate({ name: 'events' }))}>
            <span className="flex items-center gap-2">
              <img src={`${import.meta.env.BASE_URL}brand/bandicoot.png`} alt="" className="h-7 w-auto shrink-0" />
              <span
                className={`font-display text-lg font-extrabold uppercase tracking-wide whitespace-nowrap sm:inline sm:text-xl ${inSession ? 'hidden' : ''}`}
              >
                Coot <span className="text-accent">Crew</span>
              </span>
            </span>
          </button>
          {inSession && hasSession && (
            <>
              <span className={`rounded px-1.5 py-0.5 text-xs font-black sm:px-2 sm:text-sm ${flag.className}`}>{flag.label}</span>
              <span className="hidden text-sm text-pit-dim lg:inline">{session.sessionName}</span>
              <RaceClockText />
            </>
          )}
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            {mode === 'live' && hasSession && <FreshnessBadge />}
            <ConnectionBadge />
            {!inSession && (
              <button
                className={`rounded border border-pit-line px-2 py-0.5 text-sm ${view.name === 'settings' ? 'text-pit-text' : 'text-pit-dim'}`}
                onClick={() => navigate(view.name === 'settings' ? { name: 'events' } : { name: 'settings' })}
              >
                {view.name === 'settings' ? 'Done' : 'Settings'}
              </button>
            )}
            {inSession && (
              <button className="rounded border border-pit-line px-1.5 py-0.5 text-sm text-pit-dim sm:px-2" onClick={() => void leaveSession()}>
                Exit
              </button>
            )}
          </div>
        </div>
        {inSession && (
          <nav className="flex gap-1 overflow-x-auto px-2 pb-2">
            <Tab label="Timing" active={view.name === 'board' || view.name === 'car'} onClick={() => navigate({ name: 'board' })} />
            <Tab label="Strategy" active={view.name === 'strategy'} onClick={() => navigate({ name: 'strategy' })} />
            <Tab label="Pit Plan" active={view.name === 'plan'} onClick={() => navigate({ name: 'plan' })} />
            <Tab label="Rival" active={view.name === 'rival'} onClick={() => navigate({ name: 'rival' })} />
            <Tab label="Settings" active={view.name === 'settings'} onClick={() => navigate({ name: 'settings' })} />
          </nav>
        )}
        <ConnectionBanner />
      </header>

      <main className="flex-1">
        {view.name === 'events' && <EventPicker />}
        {view.name === 'board' && <TimingBoard />}
        {view.name === 'car' && <CarDetail car={view.car} />}
        {view.name === 'strategy' && <StrategyPage />}
        {view.name === 'plan' && <PlanPage />}
        {view.name === 'rival' && <RivalPage />}
        {view.name === 'settings' && <SettingsPage />}
      </main>

      {mode === 'replay' && (
        <footer className="sticky bottom-0">
          <ReplayControls />
        </footer>
      )}

      {inSession && <RivalToast />}
      <div className="pb-safe" />
    </div>
  );
}

function Tab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded px-3 py-1 text-sm font-bold whitespace-nowrap ${
        active ? 'bg-accent text-black' : 'text-pit-dim hover:bg-pit-line'
      }`}
    >
      {label}
    </button>
  );
}

/**
 * Header race clock. With a race schedule: time to the next checkered flag
 * (naming the flag when more parts follow), the break countdown, or the start.
 * Otherwise elapsed · time left (~ = estimated). Tap to edit the schedule.
 */
function RaceClockText() {
  const [, setTick] = useState(0);
  const [editing, setEditing] = useState(false);
  const mode = useAppStore((s) => s.mode);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const clock = useRaceClock();
  const sch = clock.schedule;

  let body: React.ReactNode = null;
  let title = 'Race time elapsed · time left';
  if (sch) {
    title = 'From the race schedule (tap to change)';
    if (sch.phase === 'racing') {
      body = (
        <>
          {formatClock(sch.toFlagMs)}
          {sch.isLastSegment ? (
            <span className="text-pit-dim"> left</span>
          ) : (
            <>
              <span className="hidden text-pit-dim sm:inline"> to {clockLabel(sch.flagAtMs!)} flag</span>
              <span className="text-pit-dim sm:hidden"> to {clockLabel(sch.flagAtMs!).replace(/\s?[AP]M$/i, '')}</span>
            </>
          )}
        </>
      );
    } else if (sch.phase === 'break' || sch.phase === 'before') {
      body = (
        <>
          <span className="font-bold text-flag-yellow">{sch.phase === 'break' ? 'BREAK' : 'STARTS'}</span>
          <span className="text-pit-dim"> · green {clockLabel(sch.nextGreenAtMs!)} (</span>
          {formatClock(sch.nextGreenAtMs! - Date.now())}
          <span className="text-pit-dim">)</span>
        </>
      );
    } else {
      body = <span className="text-pit-dim">finished</span>;
    }
  } else if (clock.elapsedMs !== null) {
    const estimated = clock.lengthSource === 'name' || clock.lengthSource === 'setting';
    if (estimated) {
      title = `Time left is estimated from ${
        clock.lengthSource === 'name' ? 'the session name' : 'the Pit Plan race length'
      } — tap to set the race schedule.`;
    }
    body = (
      <>
        <span className={clock.remainingMs !== null ? 'hidden sm:inline' : ''}>{formatClock(clock.elapsedMs)}</span>
        {clock.remainingMs !== null && (
          <>
            <span className="hidden text-pit-dim sm:inline"> · </span>
            {estimated ? '~' : ''}
            {formatClock(clock.remainingMs)}
            <span className="text-pit-dim"> left</span>
          </>
        )}
      </>
    );
  }
  if (body === null) return null;
  const canEdit = mode === 'live';
  return (
    <>
      <button
        className={`tnum whitespace-nowrap text-left text-sm ${canEdit ? 'underline decoration-pit-line decoration-dotted underline-offset-4' : 'cursor-default'}`}
        title={title}
        onClick={() => canEdit && setEditing(true)}
      >
        {body}
      </button>
      {editing && <ScheduleEditor onClose={() => setEditing(false)} />}
    </>
  );
}
