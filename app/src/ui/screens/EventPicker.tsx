import { useEffect, useState } from 'react';
import type { EventListSummary } from '../../api/redmist/event-list-summary';
import { connectLive, connectReplay, restClient } from '../../data/connect';
import { useAppStore } from '../../state/appStore';

export function EventPicker() {
  const navigate = useAppStore((s) => s.navigate);
  const [events, setEvents] = useState<EventListSummary[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  useEffect(() => {
    let cancelled = false;
    restClient
      .loadLiveAndRecentEvents()
      .then((e) => !cancelled && setEvents(e))
      .catch((err) => !cancelled && setError(String(err)));
    return () => {
      cancelled = true;
    };
  }, []);

  const openLive = async (ev: EventListSummary) => {
    setBusy(`event-${ev.id}`);
    try {
      await connectLive(ev.id, ev.eventName);
      navigate({ name: 'board' });
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy('');
    }
  };

  const openDryRun = async () => {
    setBusy('dryrun');
    try {
      await connectReplay(`${import.meta.env.BASE_URL}fixtures/demo-race.json`, 'Dry Run — LDRL VIR 8 Hr');
      navigate({ name: 'board' });
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="text-center">
        <img
          src={`${import.meta.env.BASE_URL}brand/hero.svg`}
          alt="The Bandicoot flattening Randy's car"
          className="mx-auto w-full max-w-md"
        />
        <h1 className="font-display text-4xl font-extrabold uppercase tracking-wide sm:text-5xl">
          Suck it, <span className="text-accent">Randy</span>
        </h1>
        <p className="text-sm text-pit-dim">Bandicoot Motorwerks #440 · live timing &amp; strategy</p>
      </div>
      <button
        onClick={openDryRun}
        disabled={busy !== ''}
        className="block w-full rounded-lg border-2 border-mycar bg-pit-panel p-4 text-left hover:bg-pit-line disabled:opacity-50"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-bold">
              Dry Run <span className="text-mycar">(demo race)</span>
            </div>
            <div className="text-sm text-pit-dim">
              Replay of LDRL — Virginia is for Dawg Lovers 2026, Sat 8 Hr. Practice with the tool:
              play, scrub and fast-forward a real race. No connection or race needed.
            </div>
          </div>
          <div className="text-2xl">{busy === 'dryrun' ? '…' : '▶'}</div>
        </div>
      </button>

      <h2 className="pt-2 text-sm font-bold uppercase tracking-wide text-pit-dim">
        Live &amp; recent events
      </h2>
      {error && <div className="rounded bg-flag-red/20 p-2 text-sm text-red-300">{error}</div>}
      {events === null && !error && <div className="p-2 text-pit-dim">Loading events…</div>}
      {events !== null && events.length === 0 && (
        <div className="p-2 text-pit-dim">No live or recent events right now.</div>
      )}
      <div className="space-y-2">
        {(events ?? []).map((ev) => (
          <button
            key={ev.id}
            onClick={() => openLive(ev)}
            disabled={busy !== ''}
            className="block w-full rounded-lg border border-pit-line bg-pit-panel p-3 text-left hover:bg-pit-line disabled:opacity-50"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate font-semibold">{ev.eventName}</div>
                <div className="truncate text-sm text-pit-dim">
                  {ev.organizationName} · {ev.trackName} · {ev.eventDate}
                </div>
              </div>
              {ev.isLive ? (
                <span className="shrink-0 rounded bg-flag-green px-2 py-0.5 text-xs font-bold text-white">
                  LIVE
                </span>
              ) : (
                <span className="shrink-0 rounded bg-pit-line px-2 py-0.5 text-xs text-pit-dim">
                  {busy === `event-${ev.id}` ? '…' : 'recent'}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
