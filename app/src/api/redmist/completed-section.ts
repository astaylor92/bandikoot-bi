/**
 * This is a TypeGen auto-generated file.
 * Any changes made to this file can be lost when this file is regenerated.
 */

/**
 * Represents a completed section in the timing system for a given competitor.
 * Multiloop support is required to utilize this feature.
 */
export interface CompletedSection {
    /**
     * Car number.
     * 
     * @remarks
     * Max length is 4 if multiloop is in use
     */
    number: string;
    /**
     * Section ID from the timing system.
     */
    sectionId: string;
    /**
     * Section time in milliseconds.
     */
    elapsedTimeMs: number;
    /**
     * Previous section time in milliseconds.
     */
    lastSectionTimeMs: number;
    /**
     * Lap number for the last completed section.
     */
    lastLap: number;
}
