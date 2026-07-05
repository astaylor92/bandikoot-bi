/**
 * This is a TypeGen auto-generated file.
 * Any changes made to this file can be lost when this file is regenerated.
 */

import { Session } from "./session";
import { EventSchedule } from "./event-schedule";
import { BroadcasterConfig } from "./broadcaster-config";

/**
 * Represents a racing event with complete details including sessions, schedule, track information, and organization details.
 */
export interface Event {
    /**
     * Gets or sets the unique identifier for this event.
     */
    eventId: number;
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
     * Gets or sets the URL for event-specific information or registration.
     * Maximum length: 2083 characters.
     */
    eventUrl: string;
    /**
     * Gets or sets the array of sessions within this event.
     * Maximum number of sessions: 50.
     */
    sessions: Session[];
    /**
     * Gets or sets the name of the organization hosting this event.
     * Maximum length: 255 characters.
     */
    organizationName: string;
    /**
     * Gets or sets the website URL of the organization hosting this event, or <c>null</c> if not available.
     * Maximum length: 2083 characters.
     */
    organizationWebsite: string | null;
    /**
     * Gets or sets the organization's logo as a byte array, or <c>null</c> if not available.
     * Maximum size: 5242880 bytes (5 MB).
     */
    organizationLogo: number[] | null;
    /**
     * Gets or sets the event schedule, or <c>null</c> if no schedule is available.
     */
    schedule: EventSchedule | null;
    /**
     * Gets or sets the name of the track where this event is held.
     * Maximum length: 128 characters.
     */
    trackName: string;
    /**
     * Gets or sets the course configuration or layout variant being used.
     * Maximum length: 60 characters.
     */
    courseConfiguration: string;
    /**
     * Gets or sets the track distance or length.
     * Maximum length: 20 characters.
     */
    distance: string;
    /**
     * Gets or sets the broadcaster configuration for this event, or <c>null</c> if no broadcast is configured.
     */
    broadcast: BroadcasterConfig | null;
    /**
     * Gets or sets a value indicating whether this event has a control log available.
     */
    hasControlLog: boolean;
    /**
     * Gets or sets a value indicating whether this event is currently live.
     */
    isLive: boolean;
    /**
     * Indicates whether this is a real event or a simulation/replay/test event.
     */
    isSimulation: boolean;
    /**
     * Gets or sets a value indicating whether this session is historical or archived.
     */
    isArchived: boolean;
    /**
     * Organization that owns the event.
     */
    organizationId: number;
    /**
     * Gets or sets a value indicating whether this event is private and requires an access code to view timing data.
     */
    isPrivate: boolean;
    /**
     * Gets or sets a value indicating whether the event name is hidden.
     * When true, @see {@link RedMist.TimingCommon.Models.Event.EventName} will be empty in API responses and clients should render their own placeholder.
     */
    hideName: boolean;
}
