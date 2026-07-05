/**
 * This is a TypeGen auto-generated file.
 * Any changes made to this file can be lost when this file is regenerated.
 */

/**
 * Represents a control log entry for tracking race control actions and incidents.
 */
export interface ControlLogEntry {
    /**
     * Gets or sets the order identifier for this log entry.
     */
    orderId: number;
    /**
     * Gets or sets the timestamp when this log entry was created.
     */
    timestamp: Date;
    /**
     * Gets or sets the corner or location where the incident occurred.
     * Maximum length: 128 characters.
     */
    corner: string;
    /**
     * Gets or sets the first car number involved in the incident.
     * Maximum length: 5 characters.
     */
    car1: string;
    /**
     * Gets or sets a value indicating whether the first car is highlighted, indicating who to apply a penalty or at fault.
     */
    isCar1Highlighted: boolean;
    /**
     * Gets or sets the second car number involved in the incident.
     * Maximum length: 5 characters.
     */
    car2: string;
    /**
     * Gets or sets a value indicating whether the second car is highlighted, indicating who to apply a penalty or at fault.
     */
    isCar2Highlighted: boolean;
    /**
     * Gets or sets notes about the incident or action.
     * Maximum length: 128 characters.
     */
    note: string;
    /**
     * Gets or sets the status of the incident or action.
     * Maximum length: 30 characters.
     */
    status: string;
    /**
     * Gets or sets the penalty action taken or applied.
     * Maximum length: 30 characters.
     */
    penaltyAction: string;
    /**
     * Gets or sets additional notes or remarks.
     * Maximum length: 128 characters.
     */
    otherNotes: string;
}
