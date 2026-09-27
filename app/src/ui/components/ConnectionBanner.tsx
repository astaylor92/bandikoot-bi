import { useEffect, useState } from 'react';
import { useSessionStore } from '../../data/sessionStore';

const STALE_AFTER_MS = 20_000;

export function ConnectionBanner() {
  const connection = useSessionStore((s) => s.connection);
  const detail = useSessionStore((s) => s.connectionDetail);
  const lastUpdateAt = useSessionStore((s) => s.lastUpdateAt);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(t);
  }, []);

  const stale =
    connection !== 'replay' &&
    connection !== 'idle' &&
    lastUpdateAt !== null &&
    now - lastUpdateAt > STALE_AFTER_MS;

  if (connection === 'error' || connection === 'reconnecting' || stale) {
    const msg =
      connection === 'reconnecting'
        ? 'Reconnecting to live timing…'
        : connection === 'error'
          ? `Connection problem${detail ? ` — ${detail}` : ''}`
          : `No update for ${Math.round((now - (lastUpdateAt ?? now)) / 1000)}s — data may be stale`;
    return (
      <div className="bg-flag-red px-3 py-1.5 text-center text-sm font-bold text-white">
        {msg}
      </div>
    );
  }
  return null;
}

export function ConnectionBadge() {
  const connection = useSessionStore((s) => s.connection);
  const feedSource = useSessionStore((s) => s.feedSource);
  const style: Record<string, { label: string; cls: string }> = {
    idle: { label: 'OFFLINE', cls: 'bg-pit-line text-pit-dim' },
    connecting: { label: 'CONNECTING', cls: 'bg-pit-line text-pit-text' },
    live: { label: 'LIVE', cls: 'bg-flag-green text-white' },
    polling: { label: 'POLLING', cls: 'bg-accent text-black' },
    replay: { label: 'DRY RUN', cls: 'bg-mycar text-black' },
    reconnecting: { label: 'RECONNECTING', cls: 'bg-flag-yellow text-black' },
    error: { label: 'ERROR', cls: 'bg-flag-red text-white' },
  };
  const s = style[connection] ?? style.idle;
  const showSource = feedSource && (connection === 'live' || connection === 'polling');
  return (
    <span
      className={`rounded px-2 py-0.5 text-xs font-bold ${s.cls}`}
      title={
        feedSource === 'public'
          ? 'Public results feed (no token) — ~5s updates'
          : feedSource === 'token'
            ? 'Authenticated live snapshot via token broker'
            : undefined
      }
    >
      {s.label}
      {showSource ? ` · ${feedSource === 'token' ? 'TOKEN' : 'PUBLIC'}` : ''}
    </span>
  );
}
