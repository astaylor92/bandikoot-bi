/**
 * This is a TypeGen auto-generated file.
 * Any changes made to this file can be lost when this file is regenerated.
 */

/**
 * Message to convey to team, drivers, spectators, etc.
 */
export interface Announcement {
    /**
     * Time at which the announcement was made.
     */
    timestamp: Date;
    /**
     * Announcement priority ("Urgent", "High", "Normal", "Low").
     */
    priority: string;
    /**
     * The message.
     */
    text: string;
}
