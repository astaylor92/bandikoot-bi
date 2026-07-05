/**
 * This is a TypeGen auto-generated file.
 * Any changes made to this file can be lost when this file is regenerated.
 */

import { EventSchedule } from "./event-schedule";

/**
 * Represents a summary of an event for display in event listings.
 */
export interface EventListSummary {
    /**
     * Gets or sets the unique identifier for this event.
     */
    id: number;
    /**
     * Gets or sets the identifier of the organization hosting this event.
     */
    organizationId: number;
    /**
     * Gets or sets the name of the organization hosting this event.
     * Maximum length: 255 characters.
     */
    organizationName: string;
    /**
     * Gets or sets the name of the event.
     * Maximum length: 512 characters.
     */
    eventName: string;
    /**
     * Gets or sets the date of the event as a formatted string.
     * Maximum length: 80 characters.
     */
    eventDate: string;
    /**
     * Gets or sets a value indicating whether this event is currently live.
     */
    isLive: boolean;
    /**
     * Gets or sets the name of the track where this event is held.
     * Maximum length: 128 characters.
     */
    trackName: string;
    /**
     * Gets or sets the schedule for this event, or <c>null</c> if no schedule is available.
     */
    schedule: EventSchedule | null;
    /**
     * Indicates whether this is a real event or a simulation/replay/test event.
     */
    isSimulation: boolean;
    /**
     * Gets or sets a value indicating whether this session is historical or archived.
     */
    isArchived: boolean;
    /**
     * Whether there are available session results for this event. This is used to determine whether to show a "Results" button in the UI.
     */
    hasResults: boolean;
    /**
     * Gets or sets a value indicating whether this event is private and requires an access code to view timing data.
     */
    isPrivate: boolean;
    /**
     * Gets or sets a value indicating whether the event name is hidden.
     * When true, @see {@link RedMist.TimingCommon.Models.EventListSummary.EventName} will be empty in listings and clients should render their own placeholder.
     */
    hideName: boolean;
}
