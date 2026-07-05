/**
 * This is a TypeGen auto-generated file.
 * Any changes made to this file can be lost when this file is regenerated.
 */

import { EventScheduleEntry } from "./event-schedule-entry";

/**
 * Represents a schedule for an event, containing a collection of scheduled entries.
 */
export interface EventSchedule {
    /**
     * Gets or sets the name of the schedule.
     * Maximum length: 128 characters.
     */
    name: string;
    /**
     * Gets or sets the list of schedule entries for the event.
     * Maximum number of entries: 25.
     */
    entries: EventScheduleEntry[];
}
