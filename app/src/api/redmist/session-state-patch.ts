/**
 * This is a TypeGen auto-generated file.
 * Any changes made to this file can be lost when this file is regenerated.
 */

import { EventEntry } from "./event-entry";
import { CarPosition } from "./car-position";
import { Flags } from "./flags";
import { FlagDuration } from "./flag-duration";
import { Section } from "./section";
import { Announcement } from "./announcement";

/**
 * Patch variant of SessionState with nullable properties for partial updates.
 * Generated automatically by PatchClassGenerator.
 */
export interface SessionStatePatch {
    /**
     * Patch field for EventId. Null indicates no change.
     */
    eventId: number | null;
    /**
     * Patch field for EventName. Null indicates no change.
     */
    eventName: string | null;
    /**
     * Patch field for SessionId. Null indicates no change.
     */
    sessionId: number | null;
    /**
     * Patch field for SessionName. Null indicates no change.
     */
    sessionName: string | null;
    /**
     * Patch field for LapsToGo. Null indicates no change.
     */
    lapsToGo: number | null;
    /**
     * Patch field for TimeToGo. Null indicates no change.
     */
    timeToGo: string | null;
    /**
     * Patch field for LocalTimeOfDay. Null indicates no change.
     */
    localTimeOfDay: string | null;
    /**
     * Patch field for RunningRaceTime. Null indicates no change.
     */
    runningRaceTime: string | null;
    /**
     * Patch field for IsPracticeQualifying. Null indicates no change.
     */
    isPracticeQualifying: boolean | null;
    /**
     * Patch field for SessionStartTime. Null indicates no change.
     */
    sessionStartTime: Date | null;
    /**
     * Patch field for SessionEndTime. Null indicates no change.
     */
    sessionEndTime: Date | null;
    /**
     * Patch field for LocalTimeZoneOffset. Null indicates no change.
     */
    localTimeZoneOffset: number | null;
    /**
     * Patch field for IsLive. Null indicates no change.
     */
    isLive: boolean | null;
    /**
     * Patch field for EventEntries. Null indicates no change.
     */
    eventEntries: EventEntry[] | null;
    /**
     * Patch field for CarPositions. Null indicates no change.
     */
    carPositions: CarPosition[] | null;
    /**
     * Patch field for CurrentFlag. Null indicates no change.
     */
    currentFlag: Flags | null;
    /**
     * Patch field for FlagDurations. Null indicates no change.
     */
    flagDurations: FlagDuration[] | null;
    /**
     * Patch field for GreenTimeMs. Null indicates no change.
     */
    greenTimeMs: number | null;
    /**
     * Patch field for GreenLaps. Null indicates no change.
     */
    greenLaps: number | null;
    /**
     * Patch field for YellowTimeMs. Null indicates no change.
     */
    yellowTimeMs: number | null;
    /**
     * Patch field for YellowLaps. Null indicates no change.
     */
    yellowLaps: number | null;
    /**
     * Patch field for NumberOfYellows. Null indicates no change.
     */
    numberOfYellows: number | null;
    /**
     * Patch field for RedTimeMs. Null indicates no change.
     */
    redTimeMs: number | null;
    /**
     * Patch field for AverageRaceSpeed. Null indicates no change.
     */
    averageRaceSpeed: string | null;
    /**
     * Patch field for LeadChanges. Null indicates no change.
     */
    leadChanges: number | null;
    /**
     * Patch field for Sections. Null indicates no change.
     */
    sections: Section[] | null;
    /**
     * Patch field for ClassColors. Null indicates no change.
     */
    classColors: { [key: string]: string; } | null;
    /**
     * Patch field for Announcements. Null indicates no change.
     */
    announcements: Announcement[] | null;
    /**
     * Patch field for LastUpdated. Null indicates no change.
     */
    lastUpdated: Date | null;
    /**
     * Patch field for ClassOrder. Null indicates no change.
     */
    classOrder: { [key: string]: string; } | null;
    /**
     * Patch field for IsSimulation. Null indicates no change.
     */
    isSimulation: boolean | null;
    /**
     * Patch field for IsArchived. Null indicates no change.
     */
    isArchived: boolean | null;
    /**
     * Patch field for TrackTempDegF. Null indicates no change.
     */
    trackTempDegF: number | null;
    /**
     * Patch field for TrackPrecipitationPerc. Null indicates no change.
     */
    trackPrecipitationPerc: number | null;
}
