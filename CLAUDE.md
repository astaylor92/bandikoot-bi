# SUCK IT, RANDY — project guide for Claude

A live race timing and strategy web app for Lucky Dog Racing League endurance teams, built on the Red Mist Timing & Scoring API.
It is a static React SPA deployed to GitHub Pages, plus an optional Cloudflare Worker token broker.

## Repo map

```
app/                  Vite + React 19 + TS SPA (Tailwind v4, zustand)
  src/api/            REST client, token provider, SignalR + polling transports
  src/api/redmist/    vendored generated types + JSON decoders (don't hand-edit semantics)
  src/data/           session store, snapshot source, patch merge, lap log, time utils
  src/replay/         Dry Run replay engine + transport + fixture format
  src/strategy/       pure strategy logic (pace, projection, stints, next pit, reclass, rival) + tests
  src/state/          appStore: persisted settings (localStorage key `pitwall-settings`)
  src/ui/             screens and components (hand-rolled SVG charts, no chart library)
  public/fixtures/    Dry Run fixtures + index.json
worker/               Cloudflare Worker token broker
tools/recorder/       live recorder (SignalR or --public polling)
tools/fixtures/       fixture builder from the public API
tools/analysis/       offline backtests (e.g. reclass model)
docs/                 architecture, data sources, models, runbooks
refs/                 brand source material (not shipped)
```

## Commands (from the repo root)

- `npm run dev`: app dev server at http://localhost:5173.
- `npm test`: vitest unit tests.
- `npm run typecheck`: typecheck the app and the worker.
- `npm run build`: production build into `app/dist`.
- `npm run fixtures -- --event <id> --session <id>`: build a single Dry Run fixture.
- `npm run fixtures -- --all-ldrl`: build every Lucky Dog session that still has lap data.
- `npm run backtest:reclass`: recalibrate the reclass-risk model on the bundled fixtures.

## Conventions

- Strategy logic is **pure functions in `app/src/strategy/`** and comes with vitest tests. UI components stay thin: they select from stores and call strategy functions.
- No chart library. Draw sparklines and charts as inline SVG, using theme tokens.
- User settings live in `app/src/state/appStore.ts`. They are persisted and stored per event with the key `${mode}:${eventId}` where relevant.
  - Keep the `pitwall-settings` storage key. Renaming it wipes every user's saved settings.
- The theme colours are the `@theme` tokens in `app/src/styles.css`. Flag colours are semantic; never restyle them to match the brand.
- Treat the Red Mist API as unreliable and changeable. Every endpoint call goes through `RestClient`.
  - Live snapshots go through `SnapshotSource`, which falls back from token to public.

## Plan standards

Every implementation plan must include:

1. **Context**: why the change is being made and what outcome it should produce.
2. **Findings**, each with its date, including every API claim. Verify API claims with a real request, e.g. `curl -s -o /dev/null -w "%{http_code}" https://api.redmist.racing/status/v2/Events/...`, and never assert API behaviour from memory.
3. **Phases.** For each phase, name the files to change and the existing functions to reuse. One phase is one commit.
4. **Verification**: which tests to add, and what to check by hand in the Dry Run and/or a live event.
5. **Open items and risks**, including any assumption that can only be checked during a live race.

Keep plans scannable: recommend one approach instead of listing alternatives.

## Execution standards

- Work on a feature branch; never commit straight to `main`.
- `npm run typecheck && npm test` must pass before every commit.
- Put new strategy logic in pure modules, and add tests before or alongside the UI.
- Check UI changes in a browser on the Dry Run, both desktop and phone width, before calling them done. If you can't, say so.
- Never commit secrets, `.dev.vars`, recordings, or `refs/*:Zone.Identifier` files.
- PR descriptions include a test plan and the docs checklist below.
- Ask the user before pushing, opening or merging a PR, or deploying the worker.

## Doc freshness

- Any change to API usage, a strategy model/assumption/default, settings, or the fixture format must update the matching `docs/*.md` **in the same PR**.
- Every doc starts with a `Last verified: YYYY-MM-DD` line. Bump it only after actually re-checking the content.
- Re-verify `docs/data-sources.md` (curl each endpoint for its auth status) whenever a live connection error appears, and at least once each race weekend.
- PR checklist item: "Docs updated (or N/A because …)".

| Change touches | Update |
|---|---|
| `api/`, `data/snapshotSource.ts`, `worker/` | `docs/data-sources.md`, `docs/token-broker.md` |
| `strategy/*` | `docs/strategy-models.md` |
| `replay/fixture.ts`, `tools/fixtures/` | `docs/fixtures.md` |
| store/transport flow, new screens | `docs/architecture.md` |
| theme, logo, naming | `docs/brand.md` |
