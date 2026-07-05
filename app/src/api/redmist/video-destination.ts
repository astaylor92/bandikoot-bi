/**
 * This is a TypeGen auto-generated file.
 * Any changes made to this file can be lost when this file is regenerated.
 */

import { VideoDestinationType } from "./video-destination-type";

/**
 * Location where a car's video is being sent or can be accessed.
 */
export interface VideoDestination {
    /**
     * Destination such as YouTube.
     */
    type: VideoDestinationType;
    /**
     * Destination's URL.
     */
    url: string;
    /**
     * Destination URL's host name or IP address.
     */
    hostName: string;
    /**
     * Destination's port.
     */
    port: number;
    /**
     * Gets or sets the parameters associated with the operation.
     */
    parameters: string;
}
