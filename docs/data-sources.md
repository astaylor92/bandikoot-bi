# Data sources — Red Mist Status API

Last verified: 2026-09-26

Base URL: `https://api.redmist.racing/status`. Swagger: `/status/swagger/v2/swagger.json`.
The swagger file doesn't list per-endpoint auth, so auth status below was checked by calling each endpoint without a token.

## Endpoints

| Endpoint | Auth | Used for |
|---|---|---|
| `v2/Events/LoadLiveAndRecentEvents` | public | Event picker; live events + last 100 |
| `v2/Events/LoadLiveEvents` | public | — |
| `v2/Events/LoadArchivedEvents?offset&take` | public | Fixture builder event enumeration |
| `v2/Events/LoadEvent?eventId` | public | Fixture metadata |
| `v2/Events/LoadSessions?eventId` | public | Current-session resolution (public feed) |
| `v2/Events/LoadSessionResults?eventId&sessionId` | public | **Live fallback snapshot** (`SessionState` shape) |
| `v2/Events/LoadSessionLaps?eventId&sessionId` | public | Lap history seed/re-seed (~5 MB for a 7 h race) |
| `v2/Events/LoadFlags?eventId&sessionId` | public | Fixture flags |
| `v2/Events/LoadControlLog?eventId` | public | — |
| `v2/Events/GetCurrentSessionStateJson?eventId` | **Bearer token** (401 since ≤2026-09-26) | Live snapshot when the broker is configured |
| `v2/Events/LoadEventCompetitorMetadata?eventId` | **Bearer token** | — (may carry driver info; untested) |
| `v2/Events/LoadInCarPayload` | **Bearer token** | — |
| SignalR hub `/status/event-status` | **Bearer token** | Sub-second patches (`SubscribeToEventV2`) |

## Live feed selection (`app/src/data/snapshotSource.ts`)

1. If a broker URL is configured, try `GetCurrentSessionStateJson` with the broker's token.
2. If there is no token or anything fails, use the public `LoadSessionResults` for the **newest-started session that has cars**.
   - Retry the token path every 5 minutes.
   - Re-resolve the session every 60 seconds. Searching costs one request per session, so it never runs more often than that, even when the last search found nothing (e.g. race morning before any session has cars). Between searches each poll is a single `LoadSessionResults`.
3. The header badge shows which feed is active (`· TOKEN` or `· PUBLIC`).
4. **Freshness:** in live mode the header shows *last crossing Ns ago*, the wall-clock time since any car was seen completing a lap. A cached feed still "succeeds" on every poll, so this is the real staleness test.
   - Under green it turns yellow at 30 s and red at 90 s. Under yellow the limits are 60 s and 180 s.
   - Under red or checkered it never warns.
   - Before the first crossing is seen, the value is estimated from the feed: race clock minus the most recent car crossing.

**Token path verified 2026-09-26:** with a broker token, `GetCurrentSessionStateJson` returned 404 (no live session); without one it returned 401. So Red Mist accepts the client-credentials token. The SignalR stream with that token is still untested.

**Why not simply trust the flags or take the latest session:** `LoadSessions` includes a shadow session **id 95**.
- On event 244 it spans the whole weekend and stays `il: true` (live) after the race, so `isLive` and `endTime` can't be trusted.
- On event 408 (2026-09-26) it *started after the race ended* (newest start time, `il: true`) and has **0 cars**. So sessions are tried newest-first and any with no cars is skipped. The recorder's `--public` mode does the same.

**Open item:** how often `LoadSessionResults` refreshes mid-race hasn't been verified. The only check happened after the 410 Sat race had ended. To verify during a live race, run:

```bash
node tools/recorder/record.mjs --event <id> --public --interval 5
```

It logs `changed N/M` cars per poll. If most polls show 0 changed while cars are on track, the public feed is cached. In that case, derive the live state from `LoadSessionLaps` diffs instead.

## Field semantics that matter (from the LDRL 410 data, 2026-09-26)

Car positions use short JSON keys; the mapping is in `app/src/api/redmist/from-json-functions.ts`.

**Pits (`ip`, `lip`, `psf`, `enp`, `exp`)**
- Pits are detected by **transponder timing loops**, not GPS: `lat`, `lon`, `spd` are null and `hasTelemetrySource` is false.
- The loops are pit-entry (`enp`), pit start/finish (`psf`) and pit-exit (`exp`).
- At LDRL only the pit-lane loop fires (`psf`). That produces `ip` (in pit) and `lip` (lap included a pit).
- Pit laps ran about 7:13 median vs about 1:57 green, which fits the 5-minute minimum stop.
- `enp` and `exp` were never true.
- 48 laps longer than 5 minutes had no pit flag. These are likely stopped on track or behind the wall without crossing the pit loop.

**`psc` (pit stop count) and `lastLapPitted`**
- Always null at LDRL. The app counts pit laps itself.
- `lastLapPitted` really uses the long JSON key; the mapping is correct.

**`dn` / `did` (driver name / id)**
- Always empty at LDRL, because this needs in-car driver-ID hardware.
- Driver changes are **inferred from stop length** (see `strategy-models.md`).

**`class` (the car's class at that lap)**
- Every lap record in `LoadSessionLaps` carries it, so **reclasses are visible in the history**.
- 410 Sat 7 Hr: 27 of 42 cars changed class, some 3–4 times, in bursts around 0:34–0:38, 2:33–2:48 and 3:50–3:53 race time.

**`classColors` / `classOrder`**
- `classColors` looks like `{"LDRL A":"#ffff7679"}`, i.e. `#AARRGGBB`. The app handles the conversion.

## Archived events

When an event is archived (`arch: true`), `LoadSessionLaps` returns **0 laps**, but `LoadSessionResults` still returns final standings. As of 2026-09-26, every 2025-season LDRL event (58, 63, 68, 70, 78, 92, 116) is archived, so capture a fixture soon after each race (see `fixtures.md`).
