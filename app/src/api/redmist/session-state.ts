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
 * The overall state of a race session at any given time. 
 * This includes data needed to fully represent the race.
 */
export interface SessionState {
    /**
     * Redmist ID for the event.
     */
    eventId: number;
    /**
     * Event name as provided by the organizer.
     */
    eventName: string;
    /**
     * Session, or run, is the current part of the event being timed such as in individual race, practice, or qualifying session.
     * This is the ID provided by the timing system.
     */
    sessionId: number;
    /**
     * Session name as provided by the timing system.
     */
    sessionName: string;
    /**
     * Optional number of laps to go if the race is lap based.
     */
    lapsToGo: number;
    /**
     * Optional time of the session remaining if the event is time based.
     * Format is HH:mm:ss.
     * 
     * @remarks
     * Orbits has been seen to have a negative seconds value preceding the start of a race, i.e. HH:mm:-ss
     */
    timeToGo: string;
    /**
     * Gets or sets the local time of day as a string. This is 24 hour format HH:mm:ss.
     */
    localTimeOfDay: string;
    /**
     * Gets or sets the amount of time a race has been running. Format is HH:mm:ss.
     */
    runningRaceTime: string;
    /**
     * Whether the current session is a practice qualifying session. This is is not guaranteed 
     * to be accurate and comes from the session name.
     */
    isPracticeQualifying: boolean;
    /**
     * When the session started according to the the first time data was received from the timing system for the session.
     */
    sessionStartTime: Date;
    /**
     * When the session ended according to the timing system change to another session or timeout of data being received, such as at the end of the race.
     */
    sessionEndTime: Date | null;
    /**
     * The event's local time zone offset from UTC in hours as indicated by the organizer's system time.
     */
    localTimeZoneOffset: number;
    /**
     * Indicates whether the organizer is connected and sending data for the event.
     */
    isLive: boolean;
    /**
     * These are the signed up entries indicated by the timing system.
     * They may not be the same as the cars that actually participated in the event.
     */
    eventEntries: EventEntry[];
    /**
     * Represents the current position and status of each car in the event.
     */
    carPositions: CarPosition[];
    /**
     * Current flag state for the event.
     */
    currentFlag: Flags;
    /**
     * Flag states for the event, including durations.
     */
    flagDurations: FlagDuration[];
    /**
     * Amount of time in milliseconds the session has been under green. Available with Multiloop timing systems.
     */
    greenTimeMs: number | null;
    /**
     * Number of laps the session has been under green. Available with Multiloop timing systems.
     */
    greenLaps: number | null;
    /**
     * Amount of time in milliseconds the session has been under yellow. Available with Multiloop timing systems.
     */
    yellowTimeMs: number | null;
    /**
     * Number of laps the session has been under yellow. Available with Multiloop timing systems.
     */
    yellowLaps: number | null;
    /**
     * Number of yellow flag periods in the session. Available with Multiloop timing systems.
     */
    numberOfYellows: number | null;
    /**
     * Amount of time in milliseconds the session has been under red. Available with Multiloop timing systems.
     */
    redTimeMs: number | null;
    /**
     * Gets or sets the average speed of the race, expressed as a string, e.g. 130.456 mph.
     */
    averageRaceSpeed: string | null;
    /**
     * Count of overall lead changes in the session. Available with Multiloop timing systems.
     */
    leadChanges: number | null;
    /**
     * Track sections as indicated by the timing system.
     */
    sections: Section[];
    /**
     * Class colors in hexadecimal format #RRGGBB (e.g., "#FF0000" for red).
     * Each color corresponds to a racing class for visual identification.
     */
    classColors: { [key: string]: string; };
    /**
     * Session announcements as indicated by the timing system.
     */
    announcements: Announcement[];
    /**
     * Last time the session state was updated.
     */
    lastUpdated: Date | null;
    /**
     * Gets or sets the mapping of class names to their corresponding order values.
     */
    classOrder: { [key: string]: string; };
    /**
     * Indicates whether this is a real event or a simulation/replay/test event.
     */
    isSimulation: boolean;
    /**
     * Gets or sets a value indicating whether this session is historical or archived.
     */
    isArchived: boolean;
    /**
     * Estimated temperature of the track in degrees Fahrenheit.
     */
    trackTempDegF: number | null;
    /**
     * Estimated precipitation on the track as a percentage. Value of 0 means no chance of precipitation, 100 means certain precipitation.
     */
    trackPrecipitationPerc: number | null;
}
