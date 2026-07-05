/**
 * This is a TypeGen auto-generated file.
 * Any changes made to this file can be lost when this file is regenerated.
 */

/**
 * Track segment or section information, e.g., for a pit lane or track sector.
 * Multiloop support is required to utilize this feature.
 */
export interface Section {
    /**
     * Section name from the timing system.
     */
    name: string;
    /**
     * Section length in inches from the timing system.
     */
    lengthInches: number;
    /**
     * Name of the section start point from the timing system.
     */
    startLabel: string;
    /**
     * Name of the end of the section from the timing system
     */
    endLabel: string;
}
