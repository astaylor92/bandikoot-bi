import { useEffect, useState } from 'react';
import type { EventListSummary } from '../../api/redmist/event-list-summary';
import { connectLive, connectReplay, restClient } from '../../data/connect';
import { useAppStore } from '../../state/appStore';

interface FixtureMeta {
  id: string;
  file: string;
  eventName: string;
  sessionName: string;
  trackName: string;
  date: string;
  hours: number;
  cars: number;
}

export function EventPicker() {
  const navigate = useAppStore((s) => s.navigate);
  const [events, setEvents] = useState<EventListSummary[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [fixtures, setFixtures] = useState<FixtureMeta[]>([]);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}fixtures/index.json`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list: FixtureMeta[]) => setFixtures(list))
      .catch(() => setFixtures([]));
  }, []);

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

  const openDryRun = async (f: FixtureMeta) => {
    setBusy(`dry-${f.id}`);
    try {
      await connectReplay(
        `${import.meta.env.BASE_URL}fixtures/${f.file}`,
        `Dry Run — ${f.eventName.replace(/^LDRL - /, '')} ${f.sessionName}`,
      );
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
          src={`${import.meta.env.BASE_URL}brand/hero-800.webp`}
          srcSet={`${import.meta.env.BASE_URL}brand/hero-800.webp 800w, ${import.meta.env.BASE_URL}brand/hero-1376.webp 1376w`}
          sizes="(min-width: 640px) 576px, 100vw"
          width={1376}
          height={768}
          alt="The Bandicoot stomping Randy's car flat"
          className="hero-fade mx-auto h-auto w-full max-w-xl"
        />
        <h1 className="font-display text-4xl font-extrabold uppercase tracking-wide sm:text-5xl">
          Suck it, <span className="text-accent">Randy</span>
        </h1>
        <p className="text-sm text-pit-dim">Bandicoot Motorwerks #440 · live timing &amp; strategy</p>
      </div>
      <section className="rounded-lg border-2 border-mycar bg-pit-panel p-3">
        <div className="mb-2">
          <div className="text-lg font-bold">
            Dry Run <span className="text-mycar">(replay a real race)</span>
          </div>
          <div className="text-sm text-pit-dim">
            Practice with every feature: play, scrub and fast-forward past Lucky Dog races. No connection needed.
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {fixtures.map((f) => (
            <button
              key={f.id}
              onClick={() => void openDryRun(f)}
              disabled={busy !== ''}
              className="flex items-center justify-between gap-2 rounded border border-pit-line bg-pit-bg p-2 text-left hover:bg-pit-line disabled:opacity-50"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">
                  {f.eventName.replace(/^LDRL - /, '')} · {f.sessionName}
                </div>
                <div className="truncate text-xs text-pit-dim">
                  {f.trackName} · {f.date} · {f.cars} cars
                </div>
              </div>
              <span className="text-xl">{busy === `dry-${f.id}` ? '…' : '▶'}</span>
            </button>
          ))}
          {fixtures.length === 0 && <div className="text-sm text-pit-dim">No dry-run races bundled.</div>}
        </div>
      </section>

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
