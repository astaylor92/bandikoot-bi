# Strategy models

Last verified: 2026-09-26

These outputs are planning estimates, not official timing. Every function lives in `app/src/strategy/` and is pure and unit-tested.

## Pace (`pace.ts`)

- **`cleanLaps`**:
  - drops non-green laps
  - drops pit laps
  - drops laps slower than 1.35 × the car's median
- **`paceSummary`** over the last 10 clean laps returns:
  - rolling pace, which is the **median** so one traffic lap doesn't skew it
  - best lap
  - trend in ms per lap: a least-squares slope that needs at least 4 laps; negative means getting faster

## Projection (`projection.ts`, `liveInputs.ts`)

- **Laps at the flag** = laps completed + (remaining race time ÷ rolling pace). Remaining race time is `raceEnd − lastCrossing`.
- **Ranking**: cars are ranked by projected laps overall and within their **current** class.
- **Parked cars**: a car is treated as parked if its last crossing is more than max(4 × pace, 10 min) ago.

## Target position (`targetPosition.ts`)

- The target is a class position, e.g. P2.
- The model finds the car to beat and the lap pace needed to pass it by the flag.
- It rates that pace as on-target, push, stretch or unrealistic.

## Stint planner (`stintPlanner.ts`)

- **Even plan**: splits the remaining time into equal stints no longer than the max stint, rotating through the listed drivers. The minimum stop time is added per stop.
- **`stintStatus`**: shows the current stint's age and the must-pit-by time.
- **`pitDecision`**: returns pit-now, stay-out or must-pit.

## Stops, driver changes, reclasses (`stints.ts`)

- **Reference pace**: the car's median green lap time, excluding pit laps.
- **Stop**: a lap that is slower than the reference pace by the *stop duration*. This covers two cases:
  - A pit-flagged lap (`lip`) that is at least 90 s over pace. Anything shorter is a drive-through or penalty, not a stop.
  - An **unflagged** green or yellow lap that is at least 4 min over pace. This is an *inferred* stop. At LDRL 410, the pit loop missed about 40 real stops; car 203 has no pit flags at all, yet it clearly stopped around 1:52, 3:36 and 5:05.
  - Red-flag laps never count as stops.
  - A stop that spans consecutive laps is merged into one.
- **Driver change**: a stop of at least `driverChangeMinStopMin`, default 4 min. The team can correct any stop in Car detail; corrections persist per event.
- **Refuel**: a stop of at least `refuelMinStopMin`, default 4 min.
- **Driver stints**: stints are split only at driver changes. The current stint is always open.
- **Class history**: every lap record carries the car's class at that lap, so a change between laps is a reclass. The board highlights a reclass for 10 min, and Strategy shows a banner when *our* car is reclassed. Class projections and target position always use the current class.

## Next pit (`nextPit.ts`)

This runs for every car, live.

- **Driver out** = when the current driver took over + max stint. Default max stint is 120 min.
- **Fuel out** = time of the last refuel (or the green flag) + tank ÷ burn rate − reserve. Defaults are 14 gal, 5 gal/h and a 5 min reserve, giving 2:43 of usable time.
- **Next pit** = the earlier of the two. The board shows it with a `drv`/`fuel` reason and the laps remaining at rolling pace.
  - `IN PIT` while the car is in pit lane.
  - `DUE` (red) once the car is past its window.
  - `to flag` when the car should finish without stopping.
- **Stops to flag**: the next stop plus as many as the remaining time needs, in cycles of min(max stint, fuel window).
- **Finish projections** subtract each car's remaining stops × its median stop duration (at least the minimum pit time) from its remaining race time.
- **Calibration**: Car detail shows the *observed fuel stint*, the median track time between refuel stops. Use it to tune a car's tank or burn override.
- **Settings**: global defaults are on the Settings page. Per-car overrides for tank, burn and max stint are on the Car detail page.

Validation on 410 Sat: at 1:40, #440 was predicted to stop at 2:00 on its driver limit. It actually pitted between about 1:57 and 2:02.

## Lucky Dog rules the models rely on

| Rule | Source |
|---|---|
| Max driver stint **2 hours** | racelucky.com rules; rulebook 2026 |
| Minimum pit stop **5 minutes** | existing app default; verify in each event's supplementary regs |
| No reclass until about **3 solid stints** | racelucky.com rules summary |

Before a race weekend, check these against that event's supplementary regulations.
