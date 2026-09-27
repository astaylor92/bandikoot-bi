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

## Lucky Dog rules the models rely on

| Rule | Source |
|---|---|
| Max driver stint **2 hours** | racelucky.com rules; rulebook 2026 |
| Minimum pit stop **5 minutes** | existing app default; verify in each event's supplementary regs |
| No reclass until about **3 solid stints** | racelucky.com rules summary |

Before a race weekend, check these against that event's supplementary regulations.
