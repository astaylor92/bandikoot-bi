/**
 * This is a TypeGen auto-generated file.
 * Any changes made to this file can be lost when this file is regenerated.
 */

/**
 * Competitor entry information for an event.
 */
export interface EventEntry {
    /**
     * Car's number which can include letters, such as 99x.
     */
    number: string;
    /**
     * Typically associated with First or Last name depending on configuration of the timing system.
     */
    name: string;
    /**
     * Typically the name of the team depending on configuration of the timing system.
     */
    team: string;
    /**
     * Car's class. This can be empty.
     */
    class: string;
}
