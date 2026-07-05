/**
 * This is a TypeGen auto-generated file.
 * Any changes made to this file can be lost when this file is regenerated.
 */

/**
 * Represents a racing session/run within an event, including timing information and session characteristics.
 */
export interface Session {
    /**
     * Gets or sets the unique identifier for this session as provided by the timing system.
     */
    id: number;
    /**
     * Gets or sets the event identifier this session belongs to.
     */
    eventId: number;
    /**
     * Gets or sets the name of the session.
     * Maximum length: 64 characters (RMonitor max is 40).
     */
    name: string;
    /**
     * Gets or sets the scheduled start time of the session.
     */
    startTime: Date;
    /**
     * Gets or sets the end time of the session, or <c>null</c> if the session has not ended.
     */
    endTime: Date | null;
    /**
     * Gets or sets the local time zone offset in hours from UTC.
     */
    localTimeZoneOffset: number;
    /**
     * Gets or sets the timestamp when this session was last updated, or <c>null</c> if never updated.
     */
    lastUpdated: Date | null;
    /**
     * Gets or sets a value indicating whether this session is currently live.
     */
    isLive: boolean;
    /**
     * Gets or sets a value indicating whether this is likely a practice or qualifying session. This may not be accurate.
     */
    isPracticeQualifying: boolean;
}
