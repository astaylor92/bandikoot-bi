# Dry Run fixtures

Last verified: 2026-09-26

A Dry Run replays a real race from `app/public/fixtures/<eventId>-<sessionId>.json`. The event picker lists the entries in `app/public/fixtures/index.json`.

## Building

```bash
npm run fixtures -- --all-ldrl                    # every LDRL race session that still has laps + index.json
npm run fixtures -- --event 410 --session 16      # one session (does not touch index.json)
```

`--all-ldrl` gathers LDRL events from three places:

- `LoadLiveAndRecentEvents`
- every page of `LoadArchivedEvents`
- `KNOWN_LDRL_EVENTS`, for older events that have dropped out of both listings (currently 244)

It skips:

- archived events
- qualifying sessions
- the shadow session 95
- sessions that are still running
- sessions with no laps

**Capture soon after each race.** Once Red Mist archives an event, `LoadSessionLaps` returns nothing, and every 2025 LDRL event is already gone. After the 410 Sun 8 Hr (2026-09-27), run `--all-ldrl` again.

## Bundled (2026-09-26)

| Fixture | Race | Cars | Reclasses |
|---|---|---|---|
| 244-6 | VIR, Fri 7 Hr | 43 | 13 |
| 244-7 | VIR, Sat 8 Hr | 38 | 2 |
| 390-12 | The Ridge, Sat 7 hr | 63 | 41 |
| 390-13 | The Ridge, Sun 8 hr | 52 | 2 |
| 410-15 | CMP, Sat 7 Hr | 42 | 52 |

Each file is 110–200 KB. The service worker caches a fixture only after it has been played.

## Format: `redmist-replay/laps@2`

```jsonc
{
  "format": "redmist-replay/laps@2",
  "eventId": 410, "sessionId": 15, "eventName": "...", "sessionName": "...",
  "trackName": "...", "organizationName": "...",
  "durationMs": 25351000,          // session start → end
  "localStartMs": 50468000,        // local time of day at the start, for the clock display
  "classColors": { "LDRL A": "#ffff7679" },   // Red Mist #AARRGGBB
  "classOrder": { "LDRL A": "1" },
  "entries": [{ "no": "440", "nm": "Bandicoot Motor Werks", "t": "E36", "c": "LDRL B" }],
  "flags": [{ "f": 1, "startMs": 0, "endMs": 1200000 }],
  "cars": [{
    "n": "224", "c": "LDRL C",                  // class at the car's first lap
    "laps": [[1, 157000, 510000, 2, 0]],        // [lap, lapMs, crossingMs, flag, pit 0|1]
    "cc": [[4, "LDRL A"], [17, "LDRL C"]]       // reclasses: [lap, new class]
  }]
}
```

`laps@1` has the same shape without `cc`, and still loads. In that case the class stays fixed for the whole race.
