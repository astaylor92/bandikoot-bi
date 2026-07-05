# Pit Wall — Live Race Timing & Strategy

A free-to-host web app for endurance racing teams (built around Lucky Dog Racing League),
powered by the public [Red Mist Timing & Scoring API](https://docs.redmist.racing/).

Live timing board, pace analysis, projected finishing order, a target-position
recommender ("what pace do we need for P2 in class?"), and a pit/stint planner —
designed for a crew chief on a laptop or tablet in the pits: high contrast, big
tabular numerals, and resilient to flaky paddock connections.

## Quick start

```bash
npm run install:all        # installs app/, worker/, tools/recorder
npm run dev                # Vite dev server → http://localhost:5173
```

Open the app and hit **Dry Run (demo race)** — a full replay of a real 8-hour
Lucky Dog race at VIR (38 cars, 4,400 laps) reconstructed from public lap data.
Play, scrub, and fast-forward to practice with every feature; no credentials or
live race required. Pin your car (☆ on the timing board) to unlock Strategy and
Pit Plan.

```bash
npm test                   # strategy engine + replay engine unit tests
npm run typecheck          # app + worker
npm run build              # production build → app/dist
npm run fixtures           # rebuild the demo fixture from the API
```

## How it connects

- **REST (public, no auth):** `https://api.redmist.racing/status/v2/Events/...`
  — event lists, session snapshots (`GetCurrentSessionStateJson`), lap history,
  flags. The app fully works in this mode, polling every ~5s.
- **SignalR (needs a token):** `.../status/event-status` — sub-second patch
  stream (`SubscribeToEventV2` → `ReceiveSessionPatch`/`ReceiveCarPatches`,
  nullable-field patch objects). On reconnect or `ReceiveReset` the app
  re-subscribes and re-fetches the snapshot.
- Types and JSON decoders under `app/src/api/redmist/` are vendored from the
  MIT-licensed generated TypeScript in
  [redmist-timing-common](https://github.com/bgriggs/redmist-timing-common).

## Token broker (optional, for live SignalR)

The OAuth client secret must not ship in a static site, so `worker/` contains a
tiny Cloudflare Worker that exchanges your Red Mist relay credentials (org
settings → **Relay Connection**) for short-lived access tokens:

```bash
cd worker
npx wrangler secret put RM_CLIENT_ID
npx wrangler secret put RM_CLIENT_SECRET
npx wrangler secret put TEAM_KEY        # optional shared passphrase
npx wrangler deploy
```

Then set the broker URL in the app's **Settings** page (defaults to
`/api/token`, which the dev server proxies to `wrangler dev` on :8787). If the
broker is missing or unreachable the app silently falls back to REST polling.

## Deploying

- **App:** static output in `app/dist` — Cloudflare Pages, Netlify, GitHub
  Pages, anything. PWA shell caching included.
- **Worker:** `wrangler deploy` (free tier is plenty).

## Recording real races

```bash
node tools/recorder/record.mjs --event 244 --broker https://<worker>/api/token --out recordings/race.jsonl
```

captures the snapshot + timestamped patch stream from a live event (useful for
debugging and future replay formats). `tools/fixtures/build-demo.mjs` builds the
bundled Dry Run fixture from any *completed* event using public endpoints only.

## Layout

```
app/                  Vite + React + TS SPA
  src/api/redmist/    vendored generated types + JSON decoders
  src/api/            REST client, token provider, SignalR + polling transports
  src/data/           session store (zustand), patch merge, lap log, time utils
  src/replay/         replay engine + transport (Dry Run mode)
  src/strategy/       pace, projections, target position, stint planner (+tests)
  src/ui/             screens & components
worker/               Cloudflare Worker token broker
tools/recorder/       live patch-stream recorder
tools/fixtures/       demo fixture builder
```

Strategy outputs are planning estimates, not official timing. Stint rules
(5-min minimum stop etc.) are configurable — always check the event supps.
