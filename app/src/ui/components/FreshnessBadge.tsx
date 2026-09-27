import { useEffect, useState } from 'react';
import { useSessionStore } from '../../data/sessionStore';
import { freshness } from '../../data/freshness';

const STYLE = {
  ok: 'text-pit-dim',
  neutral: 'text-pit-dim',
  warn: 'bg-flag-yellow text-black',
  stale: 'bg-flag-red text-white',
} as const;

/** "last crossing 4s ago" — the real test of whether live timing is moving. */
export function FreshnessBadge() {
  const lastCrossingAt = useSessionStore((s) => s.lastCrossingAt);
  const lastUpdateAt = useSessionStore((s) => s.lastUpdateAt);
  const flag = useSessionStore((s) => s.session.currentFlag);
  const feedSource = useSessionStore((s) => s.feedSource);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const f = freshness(now, lastCrossingAt, flag);
  const pollAgo = lastUpdateAt === null ? null : Math.round((now - lastUpdateAt) / 1000);
  const title = [
    'Time since any car was last seen crossing the line.',
    'Under green, 30s+ means the feed may be stuck; 90s+ means it almost certainly is.',
    `Feed: ${feedSource === 'token' ? 'authenticated (token)' : feedSource === 'public' ? 'public results' : feedSource === 'public-laps' ? 'public lap history (~20s delay)' : '–'}`,
    `Last poll/update: ${pollAgo === null ? '–' : `${pollAgo}s ago`}`,
  ].join('\n');

  return (
    <span className={`tnum whitespace-nowrap rounded px-1.5 py-0.5 text-xs ${STYLE[f.level]}`} title={title}>
      {f.sinceCrossingSec === null ? (
        'waiting…'
      ) : (
        <>
          <span className="hidden sm:inline">last crossing </span>
          {fmt(f.sinceCrossingSec)} ago
        </>
      )}
    </span>
  );
}

function fmt(sec: number): string {
  return sec < 90 ? `${sec}s` : `${Math.floor(sec / 60)}m`;
}
