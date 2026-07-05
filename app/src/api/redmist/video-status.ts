/**
 * This is a TypeGen auto-generated file.
 * Any changes made to this file can be lost when this file is regenerated.
 */

import { VideoSystemType } from "./video-system-type";
import { VideoDestination } from "./video-destination";

/**
 * Status of a car's video system.
 */
export interface VideoStatus {
    /**
     * Brand/model of the car's video system.
     */
    videoSystemType: VideoSystemType;
    /**
     * Gets or sets the destination configuration consuming video.
     */
    videoDestination: VideoDestination;
}
