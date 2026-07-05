/**
 * This is a TypeGen auto-generated file.
 * Any changes made to this file can be lost when this file is regenerated.
 */

/**
 * Represents a single entry in an event schedule, defining a scheduled activity with start and end times.
 */
export interface EventScheduleEntry {
    /**
     * Gets or sets the day of the event for this schedule entry.
     */
    dayOfEvent: Date;
    /**
     * Gets or sets the start time of the scheduled activity.
     */
    startTime: Date;
    /**
     * Gets or sets the end time of the scheduled activity.
     */
    endTime: Date;
    /**
     * Gets or sets the name or description of the scheduled session, such as qualifying, race 1, etc.
     * Maximum length: 128 characters.
     */
    name: string;
}
