/**
 * This is a TypeGen auto-generated file.
 * Any changes made to this file can be lost when this file is regenerated.
 */

import { ControlLogEntry } from "./control-log-entry";

/**
 * Represents a collection of control log entries associated with a specific car.
 */
export interface CarControlLogs {
    /**
     * Gets or sets the car number.
     * Maximum length: 5 characters.
     */
    carNumber: string;
    /**
     * Gets or sets the list of control log entries for this car.
     * Maximum number of entries: 2000.
     */
    controlLogEntries: ControlLogEntry[];
}
