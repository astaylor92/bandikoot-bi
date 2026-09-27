# Architecture

Last verified: 2026-09-26

## Data flow

```
             ┌──────────── live ───────────────────────────────┐
EventPicker ─┤ connectLive(eventId)  (app/src/data/connect.ts)  │
             │   SnapshotSource: token snapshot → public results│
             │   SignalRTransport (needs broker) ─┐             │
             │   PollingTransport (every 5 s) ────┤ fallback    │
             │   seedLapsFromRest: LoadSessionLaps│ every 3 min │
             ├──────────── dry run ────────────────────────────-┤
             │ connectReplay(fixtureUrl) → ReplayTransport      │
             └──────────────────────┬───────────────────────────┘
                                    ▼ TransportHandlers
                      useSessionStore (data/sessionStore.ts)
                      session · cars · lapLog · connection · feedSource
                                    ▼
             strategy/* pure functions  ←  useAppStore settings
                                    ▼
                          ui/screens/*  (view switch in App.tsx)
```

The three transports (SignalR, polling, replay) all raise the same `TransportHandlers` events (`data/transport.ts`). The rest of the app can't tell a live race from a Dry Run.

## Stores

- **`useSessionStore`** holds the current session.
  - `cars` holds the latest `CarPosition` for each car number.
  - `lapLog` holds a `LapRecord[]` for each car. It is appended whenever `lastLapCompleted` goes up, and merged with the `LoadSessionLaps` seed (REST data wins).
  - `feedSource` records which REST feed produced the last snapshot.
  - `lastCrossingAt` is the wall clock when any car was last seen completing a lap. It drives the header's freshness badge (`data/freshness.ts`, `ui/components/FreshnessBadge.tsx`).
  - A new `sessionId` under the same event, such as Saturday's race moving to Sunday's, starts a fresh lap log.
  - `connect.ts` versions each connection. A lap-history download still in flight from an earlier event or session is discarded when it lands.
  - Replay scrubbing *replaces* a car's lap log (`onLapHistory`), so seeking backwards removes laps from the future. The live REST seed *merges* instead.
- **`useProjections(intel)`** returns finish projections net of each car's remaining pit time. The Strategy and Rival screens share it.
- **`useFieldIntel()`** (`ui/hooks/useFieldIntel.ts`) runs `strategy/fieldIntel.ts` once per render cycle to build each car's stops, stints, reclasses, pace and next pit.
- **`useAppStore`** holds navigation state and the persisted settings. Settings are saved to localStorage under `pitwall-settings`.
  - Per-event settings are keyed `${mode}:${eventId}`: pinned car, target position, stint config, rivals, per-car strategy overrides.

## Replay

`replay/replayEngine.ts` rebuilds a full `SessionState` for any race time t from a lap fixture (`replay/fixture.ts`). `ReplayTransport` ticks this at 1 Hz, with play, pause, speed and seek. The fixture format is described in `docs/fixtures.md`.

## Strategy

The pure modules in `app/src/strategy/` are described in `docs/strategy-models.md`. Screens call them inside `useMemo`, keyed on store slices.

## UI

- There is no router. `appStore.view` selects one of Timing, Strategy, Pit Plan, Rival, Settings, or a car detail screen.
- Settings can also be reached from the home screen header, so the broker can be set up before opening a race.
- The home screen refreshes the Red Mist event list every 30 s, so races that go live later appear without a reload. While not in a race, the header pill shows the list's status (`LOADING RACES…`, `N LIVE`, `NO LIVE RACES`, `CAN'T REACH RED MIST`) from `appStore.eventsStatus`.
- **Browser history** (`state/navHistory.ts`): each screen change adds a hash URL (`#/board`, `#/car/440`, `#/rival`, …) so Back, Forward and swipe-back work.
  - GitHub Pages can't rewrite real paths, hence the hash.
  - **In a race, Back never leaves to the event list**; use Exit, so a stray swipe mid-race can't disconnect you.
  - Reloading a race-screen URL lands on the event list, because a race can't be restored from a link. `#/settings` survives a reload.
  - In-app "← Back" links call `goBack(fallback)`. That is browser Back when an app screen is behind the current one (each history entry carries its `idx`), otherwise the fallback screen.
- The pinned car ("my car") and the rivals are stored per event.

## Deployment

- `.github/workflows/deploy-pages.yml` runs on every push to `main`.
  - It runs typecheck and tests, builds with `BASE_PATH=/<repo>/`, and deploys to GitHub Pages.
- The worker is deployed by hand with `wrangler deploy` (see `docs/token-broker.md`).
