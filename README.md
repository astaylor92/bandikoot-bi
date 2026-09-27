# SUCK IT, RANDY — Live Race Timing & Strategy

![The Bandicoot flattening Randy's car](app/public/brand/hero.svg)

Bandicoot Motorwerks #440's pit-wall app.

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

## Docs

- [CLAUDE.md](CLAUDE.md): contributor standards covering plans, execution and doc freshness
- [docs/architecture.md](docs/architecture.md): data flow, stores, transports, replay
- [docs/data-sources.md](docs/data-sources.md): Red Mist endpoints, auth status, field semantics
- [docs/token-broker.md](docs/token-broker.md): optional worker for the authenticated live feed
- [docs/strategy-models.md](docs/strategy-models.md): the models behind every prediction

The app works without credentials. It polls the public results feed, and the
token broker only upgrades it to the sub-second stream.

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
docs/                 project docs (see above)
tools/recorder/       live patch-stream recorder
tools/fixtures/       demo fixture builder
```

Strategy outputs are planning estimates, not official timing. Stint rules
(5-min minimum stop etc.) are configurable — always check the event supps.
