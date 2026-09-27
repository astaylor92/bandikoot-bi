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

- **Race length.** When the feed's countdown is zero or missing while the race runs (always, at LDRL), the length comes from the session name, then the Pit Plan race length. The estimate is marked `~` in the header. Next pit, "to flag", stops to flag and finish projections all use it.

- **Laps at the flag** = laps completed + (remaining race time − remaining pit time) ÷ rolling pace.
  - Remaining race time counts from **now**. A car on track is credited at most the lap it's on; a car in the pits gets no credit.
  - Earlier versions counted from the last crossing, so a car sitting in the pits was credited with the whole stop as driving. At VIR that turned a projected 1-lap loss into a 13-min win.
- **A stop in progress** costs only what's left of it: the typical stop minus its time so far. The time so far is measured from the last crossing, minus half a lap of driving to pit lane.
- **Typical stop** is the median of a car's stops up to 15 min. Longer stops are red-flag holds or garage visits.
- **Under a red flag** no car counts as parked, since nobody is crossing the line.
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
  - Corrections are keyed by the stop's **first** lap, so they survive a second slow lap merging into the stop.
- **Red-flag holds**: pit-flagged laps under a red flag still count as stops. They are marked `red flag` and are never assumed to be a driver change or refuel unless corrected.
- **Refuel**: a stop of at least `refuelMinStopMin`, default 4 min.
- **Driver stints**: stints are split only at driver changes. The current stint is always open.
- **Class history**: every lap record carries the car's class at that lap, so a change between laps is a reclass. The board highlights a reclass for 10 min, and Strategy shows a banner when *our* car is reclassed. Class projections and target position always use the current class.

## Lap-time sparklines (`spark.ts`, `ui/components/Sparkline.tsx`)

- Each sparkline shows a car's last X laps. X is set on the Settings page; the default is 10.
- **Faster laps plot higher.**
- The y scale uses only clean laps. Pit laps, yellow laps and outliers appear as muted ticks along the bottom.
- The line is green when the least-squares trend is getting faster by more than 0.15 s/lap, orange when getting slower, and grey otherwise.
- Clean laps also exclude impossible laps under 0.7 × the median, which are timing glitches.

## Next pit (`nextPit.ts`)

This runs for every car, live.

- **Driver out** = when the current driver took over + max stint. Default max stint is 120 min.
- **Fuel out** = time of the last refuel (or the green flag) + tank ÷ burn rate − reserve. Defaults are 14 gal, 5 gal/h and a 5 min reserve, giving 2:43 of usable time.
- **Next pit** = the earlier of the two. The board shows it with a `drv`/`fuel` reason and the laps remaining at rolling pace.
  - `IN PIT` while the car is in pit lane.
  - `DUE` (red) once the car is past its window.
  - `to flag` when the car should finish without stopping.
  - `parked` when the car hasn't crossed the line for max(4 laps, 10 min): retired, in the garage or stopped. Parked cars are also left out of finish projections.
- **Stops to flag**: the next stop plus as many as the remaining time needs, in cycles of min(max stint, fuel window).
- **Finish projections** subtract each car's remaining stops × its median stop duration (at least the minimum pit time) from its remaining race time.
- **Calibration**: Car detail shows the *observed fuel stint*, the median track time between refuel stops. Use it to tune a car's tank or burn override.
- **Settings**: global defaults are on the Settings page. Per-car overrides for tank, burn and max stint are on the Car detail page.

Validation on 410 Sat: at 1:40, #440 was predicted to stop at 2:00 on its driver limit. It actually pitted between about 1:57 and 2:02.

## Reclass risk (`reclass.ts`)

LDRL officials reclass at their discretion. Across the five bundled races there were about 110 reclasses. Most came in the first hour, as the field was re-sorted after qualifying; the rest came in batches during the race.

The model scores every car with at least 5 clean laps against the **current** median pace of each class. Parked cars are left out.

| Direction | Points |
|---|---|
| **Up** | +2 if within 1% of the faster class's median, or faster than it (+1 if within 2%) · +1 if in the top 10% of its own class · +0.5 if very consistent (σ < 1.5 s) · +0.5 if getting faster by more than 0.1 s/lap |
| **Down** | +2 if at or slower than the slower class's median (+1.5 if within 2%) · +1 if in the bottom 10% of its class (+0.5 if in the bottom quarter) |

Bands: **high** ≥ 3, **med** ≥ 2, otherwise **low**. Each band shows the historical per-hour rate from `npm run backtest:reclass` (2026-09-26, ~9.5k car-samples, 10-min checkpoints):

| | low | med | high |
|---|---|---|---|
| Up, after the first hour | 0.8%/h | 2.6%/h | **14%/h** |
| Down, after the first hour | 2.7%/h | 9.3%/h | **11%/h** |
| Up / down, first hour | 4% / 18% | 29% / 81% | 30% / 84% |

- **Recall after the first hour:** 14 of 24 up-reclasses were flagged high beforehand, and 14 of 31 down-reclasses were flagged med or higher.
- Down-moves are harder to see coming. Consistency and trend added little signal, which matches the "fast *and consistent*" folklore only weakly.
- Example: at 2:30 of the 410 Sat race, the model flagged #440, #590 and #355 as high up-risk. All three were moved B→A at about 2:33.

**In the UI:**

- The board shows a badge (▲/▼ %/h) only for high risk.
- Car detail and Strategy (for our car) show both directions with the reasons.
- Rerun the backtest and update `CALIBRATION` whenever new fixtures are added.

## Rival Pits (`rivalCall.ts`, `ui/screens/RivalPage.tsx`)

- **Rivals:** up to 3 per event, toggled with ⚔ on the board or picked on the Rival tab. The first rival is compared in detail.
- **Gap series:** the difference between the two cars' crossing times at each shared lap number, with positive meaning we're ahead. Comparing equal lap numbers makes it work when one car is lapped. When the cars are within a lap on the road, the gap is shown in time, even if one of them has crossed the line once more.
- **Projected gap at the flag:** the difference in projected laps × the trailing car's pace. Projections are net of remaining stops.
- **Undercut/overcut call:** fires when the rival is in the pits.
  - Cycled gap ≈ gap now + their typical stop − our typical stop + laps until our window × (their pace − our pace).
  - The typical stop is the car's median stop, with the minimum pit time as a floor.
  - Separately, a "rival window" warning fires when their predicted pit is within 10 min, and notes whether it overlaps with ours.
- **Toast:** a tappable toast appears on any other tab when a rival enters the pits.
- **Comparison table:** class position, sparklines, rolling and best pace, trend, consistency (σ), stops and driver changes, current stint age, next pit, fuel out, reclass risk.

## Lucky Dog rules the models rely on

| Rule | Source |
|---|---|
| Max driver stint **2 hours** | racelucky.com rules; rulebook 2026 |
| Minimum pit stop **5 minutes** | existing app default; verify in each event's supplementary regs |
| No reclass until about **3 solid stints** | racelucky.com rules summary |

Before a race weekend, check these against that event's supplementary regulations.
