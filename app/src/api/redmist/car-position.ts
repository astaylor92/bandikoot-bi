/**
 * This is a TypeGen auto-generated file.
 * Any changes made to this file can be lost when this file is regenerated.
 */

import { Flags } from "./flags";
import { CompletedSection } from "./completed-section";
import { VideoStatus } from "./video-status";

/**
 * Status data for a car.
 */
export interface CarPosition {
    /**
     * Used to indicate position information is not available.
     */
    readonly invalidPosition: number;
    /**
     * Redmist Event ID.
     */
    eventId: string | null;
    /**
     * Current session ID as reported by the timing system.
     */
    sessionId: string | null;
    /**
     * Car number which can include letters such as 99x.
     */
    number: string | null;
    /**
     * Car's main transponder ID as indicated by the timing system.
     */
    transponderId: number;
    /**
     * Car's class as indicated by the timing system.
     */
    class: string | null;
    /**
     * Car's best lap time formatted as HH:mm:ss.fff.
     */
    bestTime: string | null;
    /**
     * Car's best lap number.
     */
    bestLap: number;
    /**
     * Whether the car set the best lap time of the session.
     */
    isBestTime: boolean;
    /**
     * Whether the car set the best lap time in its class.
     */
    isBestTimeClass: boolean;
    /**
     * Time to the next car in the same class formatted as HH:mm:ss.fff.
     */
    inClassGap: string | null;
    /**
     * Time to the in-class leader formatted as HH:mm:ss.fff.
     */
    inClassDifference: string | null;
    /**
     * Time to the next car overall formatted as HH:mm:ss.fff.
     */
    overallGap: string | null;
    /**
     * Time to the overall leader formatted as HH:mm:ss.fff.
     */
    overallDifference: string | null;
    /**
     * Total race time formatted as HH:mm:ss.fff.
     */
    totalTime: string | null;
    /**
     * Car's last lap time formatted as HH:mm:ss.fff.
     */
    lastLapTime: string | null;
    /**
     * Last lap number.
     */
    lastLapCompleted: number;
    /**
     * Number of times the car pitted. Null if not supported by the timing system.
     */
    pitStopCount: number | null;
    /**
     * Last lap number the car pitted. Null if not supported by the timing system.
     */
    lastLapPitted: number | null;
    /**
     * Laps completed by the car. Null if not supported by the timing system.
     */
    lapsLedOverall: number | null;
    /**
     * Laps completed by the car in class. Null if not supported by the timing system.
     */
    lapsLedInClass: number | null;
    /**
     * Car's overall position in the race by laps and as reported by the timing system.
     */
    overallPosition: number;
    /**
     * Car's position in-class.
     */
    classPosition: number;
    /**
     * Car's starting overall position inferred by the order the cars pass S/F at the start of the race or by the multiloop timing system if available.
     */
    overallStartingPosition: number;
    /**
     * Number of position the car has gained overall. Negative number means positions lost.
     * Value of -999 means not available.
     */
    overallPositionsGained: number;
    /**
     * Car's starting position in-class inferred by the order the cars pass S/F at the start of the race or by the multiloop timing system if available.
     */
    inClassStartingPosition: number;
    /**
     * Number of position the car has gained in-class. Negative number means positions lost.
     * Value of -999 means not available.
     */
    inClassPositionsGained: number;
    /**
     * This car has gained the most positions overall.
     */
    isOverallMostPositionsGained: boolean;
    /**
     * This car has gained the most positions in-class.
     */
    isClassMostPositionsGained: boolean;
    /**
     * Laps lost due to penalties.
     */
    penalityLaps: number;
    /**
     * Number of warnings issued.
     */
    penalityWarnings: number;
    /**
     * Number of black flags applied to the car.
     */
    blackFlags: number;
    /**
     * Car just passed the pit lane entry line.
     */
    isEnteredPit: boolean;
    /**
     * Car is just passed the pit lane start/finish line.
     */
    isPitStartFinish: boolean;
    /**
     * Car just passed the pit lane exit line.
     */
    isExitedPit: boolean;
    /**
     * Car is currently in pits.
     */
    isInPit: boolean;
    /**
     * Current lap includes a pit stop.
     */
    lapIncludedPit: boolean;
    /**
     * Name of the last timing loop passed.
     */
    lastLoopName: string;
    /**
     * Car position is stale and has not been updated for a while.
     */
    isStale: boolean;
    /**
     * Flag active for the overall track.
     */
    trackFlag: Flags;
    /**
     * Current local flag for the car. Requires specific in-car equipment.
     */
    localFlag: Flags;
    /**
     * This lap had a local flag for the car. Requires specific in-car equipment.
     */
    lapHadLocalFlag: boolean | null;
    /**
     * Car's completed section for the current lap.
     */
    completedSections: CompletedSection[];
    /**
     * Estimated lap time for the car.
     */
    projectedLapTimeMs: number;
    /**
     * Time at which the current lap started in UTC.
     */
    lapStartTime: string;
    /**
     * Current name of the driver.
     */
    driverName: string;
    /**
     * Current ID of the driver.
     */
    driverId: string;
    /**
     * In-car video details if available.
     */
    inCarVideo: VideoStatus | null;
    /**
     * Last reported latitude of the car in WGS84 spherical Mercator.
     */
    latitude: number | null;
    /**
     * Last reported longitude of the car in WGS84 spherical Mercator.
     */
    longitude: number | null;
    /**
     * Active, In Pits,DNS, Contact, Mechanical, etc. Only available with multiloop systems.
     */
    currentStatus: string;
    /**
     * Car may have been involved in an incident. Only available with certain in-car systems.
     */
    impactWarning: boolean;
    /**
     * Indicates this car has the fastest moving average lap time in its class (last 5 laps).
     */
    inClassFastestAveragePace: boolean;
    /**
     * Estimated temperature of the track in degrees Fahrenheit.
     */
    trackTempDegF: number | null;
    /**
     * Estimated precipitation on the track as a percentage. Value of 0 means no chance of precipitation, 100 means certain precipitation.
     */
    trackPrecipitationPerc: number | null;
}
