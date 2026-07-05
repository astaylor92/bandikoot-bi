/**
 * This is a TypeGen auto-generated file.
 * Any changes made to this file can be lost when this file is regenerated.
 */

import { Flags } from "./flags";

/**
 * Instance of a flag state during a session.
 */
export interface FlagDuration {
    /**
     * The flag that is or was active.
     */
    flag: Flags;
    /**
     * When the flag state started.
     */
    startTime: Date;
    /**
     * When the flag state ended, or null if it is still active.
     */
    endTime: Date | null;
}
