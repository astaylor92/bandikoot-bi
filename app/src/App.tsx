import { useEffect } from 'react';
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
import { formatClock, parseDurationMs } from './data/time';

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
  const remaining = parseDurationMs(session.timeToGo);

  const leaveSession = async () => {
    await disconnect();
    useAppStore.getState().setSession(null, null);
    navigate({ name: 'events' });
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-pit-line bg-pit-panel">
        <div className="flex items-center gap-3 px-3 py-2">
          <button className="text-left" onClick={() => (inSession ? navigate({ name: 'board' }) : navigate({ name: 'events' }))}>
            <span className="flex items-center gap-2">
              <img src={`${import.meta.env.BASE_URL}brand/bandicoot.png`} alt="" className="h-7 w-auto shrink-0" />
              <span className="font-display text-lg font-extrabold uppercase tracking-wide whitespace-nowrap sm:text-xl">
                Suck it, <span className="text-accent">Randy</span>
              </span>
            </span>
          </button>
          {inSession && hasSession && (
            <>
              <span className={`rounded px-2 py-0.5 text-sm font-black ${flag.className}`}>{flag.label}</span>
              <span className="tnum hidden text-sm sm:inline">
                {session.sessionName}
                {remaining !== null && remaining > 0 && <> · {formatClock(remaining)} to go</>}
              </span>
            </>
          )}
          <div className="ml-auto flex items-center gap-2">
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
              <button className="rounded border border-pit-line px-2 py-0.5 text-sm text-pit-dim" onClick={() => void leaveSession()}>
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
