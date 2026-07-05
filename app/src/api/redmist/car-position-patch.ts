/**
 * This is a TypeGen auto-generated file.
 * Any changes made to this file can be lost when this file is regenerated.
 */

import { Flags } from "./flags";
import { CompletedSection } from "./completed-section";
import { VideoStatus } from "./video-status";

/**
 * Patch variant of CarPosition with nullable properties for partial updates.
 * Generated automatically by PatchClassGenerator.
 */
export interface CarPositionPatch {
    /**
     * Patch field for EventId. Null indicates no change.
     */
    eventId: string | null;
    /**
     * Patch field for SessionId. Null indicates no change.
     */
    sessionId: string | null;
    /**
     * Patch field for Number. Null indicates no change.
     */
    number: string | null;
    /**
     * Patch field for TransponderId. Null indicates no change.
     */
    transponderId: number | null;
    /**
     * Patch field for Class. Null indicates no change.
     */
    class: string | null;
    /**
     * Patch field for BestTime. Null indicates no change.
     */
    bestTime: string | null;
    /**
     * Patch field for BestLap. Null indicates no change.
     */
    bestLap: number | null;
    /**
     * Patch field for IsBestTime. Null indicates no change.
     */
    isBestTime: boolean | null;
    /**
     * Patch field for IsBestTimeClass. Null indicates no change.
     */
    isBestTimeClass: boolean | null;
    /**
     * Patch field for InClassGap. Null indicates no change.
     */
    inClassGap: string | null;
    /**
     * Patch field for InClassDifference. Null indicates no change.
     */
    inClassDifference: string | null;
    /**
     * Patch field for OverallGap. Null indicates no change.
     */
    overallGap: string | null;
    /**
     * Patch field for OverallDifference. Null indicates no change.
     */
    overallDifference: string | null;
    /**
     * Patch field for TotalTime. Null indicates no change.
     */
    totalTime: string | null;
    /**
     * Patch field for LastLapTime. Null indicates no change.
     */
    lastLapTime: string | null;
    /**
     * Patch field for LastLapCompleted. Null indicates no change.
     */
    lastLapCompleted: number | null;
    /**
     * Patch field for PitStopCount. Null indicates no change.
     */
    pitStopCount: number | null;
    /**
     * Patch field for LastLapPitted. Null indicates no change.
     */
    lastLapPitted: number | null;
    /**
     * Patch field for LapsLedOverall. Null indicates no change.
     */
    lapsLedOverall: number | null;
    /**
     * Patch field for LapsLedInClass. Null indicates no change.
     */
    lapsLedInClass: number | null;
    /**
     * Patch field for OverallPosition. Null indicates no change.
     */
    overallPosition: number | null;
    /**
     * Patch field for ClassPosition. Null indicates no change.
     */
    classPosition: number | null;
    /**
     * Patch field for OverallStartingPosition. Null indicates no change.
     */
    overallStartingPosition: number | null;
    /**
     * Patch field for OverallPositionsGained. Null indicates no change.
     */
    overallPositionsGained: number | null;
    /**
     * Patch field for InClassStartingPosition. Null indicates no change.
     */
    inClassStartingPosition: number | null;
    /**
     * Patch field for InClassPositionsGained. Null indicates no change.
     */
    inClassPositionsGained: number | null;
    /**
     * Patch field for IsOverallMostPositionsGained. Null indicates no change.
     */
    isOverallMostPositionsGained: boolean | null;
    /**
     * Patch field for IsClassMostPositionsGained. Null indicates no change.
     */
    isClassMostPositionsGained: boolean | null;
    /**
     * Patch field for PenalityLaps. Null indicates no change.
     */
    penalityLaps: number | null;
    /**
     * Patch field for PenalityWarnings. Null indicates no change.
     */
    penalityWarnings: number | null;
    /**
     * Patch field for BlackFlags. Null indicates no change.
     */
    blackFlags: number | null;
    /**
     * Patch field for IsEnteredPit. Null indicates no change.
     */
    isEnteredPit: boolean | null;
    /**
     * Patch field for IsPitStartFinish. Null indicates no change.
     */
    isPitStartFinish: boolean | null;
    /**
     * Patch field for IsExitedPit. Null indicates no change.
     */
    isExitedPit: boolean | null;
    /**
     * Patch field for IsInPit. Null indicates no change.
     */
    isInPit: boolean | null;
    /**
     * Patch field for LapIncludedPit. Null indicates no change.
     */
    lapIncludedPit: boolean | null;
    /**
     * Patch field for LastLoopName. Null indicates no change.
     */
    lastLoopName: string | null;
    /**
     * Patch field for IsStale. Null indicates no change.
     */
    isStale: boolean | null;
    /**
     * Patch field for TrackFlag. Null indicates no change.
     */
    trackFlag: Flags | null;
    /**
     * Patch field for LocalFlag. Null indicates no change.
     */
    localFlag: Flags | null;
    /**
     * Patch field for LapHadLocalFlag. Null indicates no change.
     */
    lapHadLocalFlag: boolean | null;
    /**
     * Patch field for CompletedSections. Null indicates no change.
     */
    completedSections: CompletedSection[] | null;
    /**
     * Patch field for ProjectedLapTimeMs. Null indicates no change.
     */
    projectedLapTimeMs: number | null;
    /**
     * Patch field for LapStartTime. Null indicates no change.
     */
    lapStartTime: string | null;
    /**
     * Patch field for DriverName. Null indicates no change.
     */
    driverName: string | null;
    /**
     * Patch field for DriverId. Null indicates no change.
     */
    driverId: string | null;
    /**
     * Patch field for InCarVideo. Null indicates no change.
     */
    inCarVideo: VideoStatus | null;
    /**
     * Patch field for Latitude. Null indicates no change.
     */
    latitude: number | null;
    /**
     * Patch field for Longitude. Null indicates no change.
     */
    longitude: number | null;
    /**
     * Patch field for CurrentStatus. Null indicates no change.
     */
    currentStatus: string | null;
    /**
     * Patch field for ImpactWarning. Null indicates no change.
     */
    impactWarning: boolean | null;
    /**
     * Patch field for InClassFastestAveragePace. Null indicates no change.
     */
    inClassFastestAveragePace: boolean | null;
    /**
     * Patch field for TrackTempDegF. Null indicates no change.
     */
    trackTempDegF: number | null;
    /**
     * Patch field for TrackPrecipitationPerc. Null indicates no change.
     */
    trackPrecipitationPerc: number | null;
}
