/**
 * This is a TypeGen auto-generated file.
 * Any changes made to this file can be lost when this file is regenerated.
 */

/**
 * Represents metadata information for a competitor, including identification, personal details, and vehicle
 * information, used in event management or race tracking systems.
 * 
 * @remarks
 * This class for competitor details such as car number, event association, transponder IDs, 
 * and personal or team information. The contents of this are subject to the organizer's configuration and may not 
 * corresponding to the field descritions.
 */
export interface CompetitorMetadata {
    /**
     * Gets or sets the event identifier this competitor is associated with.
     */
    eventId: number;
    /**
     * Gets or sets the car number assigned to this competitor.
     * Maximum length: 16 characters.
     */
    carNumber: string;
    /**
     * Gets or sets the timestamp when this competitor metadata was last updated.
     */
    lastUpdated: Date;
    /**
     * Gets or sets the primary transponder identifier for timing and scoring.
     */
    transponder: number;
    /**
     * Gets or sets the secondary transponder identifier for timing and scoring.
     */
    transponder2: number;
    /**
     * Gets or sets the competition class or category.
     * Maximum length: 32 characters.
     */
    class: string;
    /**
     * Gets or sets the competitor's first name.
     * The contents of this field are subject to the organizer's configuration and may not corresponding to the field.
     * Maximum length: 64 characters.
     */
    firstName: string;
    /**
     * Gets or sets the competitor's last name.
     * The contents of this field are subject to the organizer's configuration and may not corresponding to the field.
     * Maximum length: 64 characters.
     */
    lastName: string;
    /**
     * Gets or sets the competitor's nation or state.
     * The contents of this field are subject to the organizer's configuration and may not corresponding to the field.
     * Maximum length: 128 characters.
     */
    nationState: string;
    /**
     * Gets or sets the competitor's sponsor information.
     * The contents of this field are subject to the organizer's configuration and may not corresponding to the field.
     * Maximum length: 200 characters.
     */
    sponsor: string;
    /**
     * Gets or sets the vehicle make or manufacturer.
     * The contents of this field are subject to the organizer's configuration and may not corresponding to the field.
     * Maximum length: 48 characters.
     */
    make: string;
    /**
     * Gets or sets the competitor's hometown.
     * The contents of this field are subject to the organizer's configuration and may not corresponding to the field.
     * Maximum length: 128 characters.
     */
    hometown: string;
    /**
     * Gets or sets the club or organization the competitor represents.
     * The contents of this field are subject to the organizer's configuration and may not corresponding to the field.
     * Maximum length: 64 characters.
     */
    club: string;
    /**
     * Gets or sets the vehicle model or engine information.
     * The contents of this field are subject to the organizer's configuration and may not corresponding to the field.
     * Maximum length: 48 characters.
     */
    modelEngine: string;
    /**
     * Gets or sets the tire brand or specification.
     * The contents of this field are subject to the organizer's configuration and may not corresponding to the field.
     * Maximum length: 48 characters.
     */
    tires: string;
    /**
     * Gets or sets the competitor's email address.
     * The contents of this field are subject to the organizer's configuration and may not corresponding to the field.
     * Maximum length: 128 characters.
     */
    email: string;
}
