/**
 * This is a TypeGen auto-generated file.
 * Any changes made to this file can be lost when this file is regenerated.
 */

import { SessionState } from "./session-state"
import { EventEntry } from "./event-entry"
import { CarPosition } from "./car-position"
import { FlagDuration } from "./flag-duration"
import { Section } from "./section"
import { Announcement } from "./announcement"
import { CompletedSection } from "./completed-section"
import { EventListSummary } from "./event-list-summary"
import { Event } from "./event"
import { Session } from "./session"
import { CompetitorMetadata } from "./competitor-metadata"
import { ControlLogEntry } from "./control-log-entry"
import { CarControlLogs } from "./car-control-logs"
import { SessionStatePatch } from "./session-state-patch"
import { CarPositionPatch } from "./car-position-patch"
import { VideoStatus } from "./video-status"
import { VideoDestination } from "./video-destination"
import { BroadcasterConfig } from "./broadcaster-config"
import { EventSchedule } from "./event-schedule"
import { EventScheduleEntry } from "./event-schedule-entry"
import { Flags } from "./flags"
import { VideoDestinationType } from "./video-destination-type"
import { VideoSystemType } from "./video-system-type"

export function sessionStateFromJson(json: Record<string, unknown>): SessionState {
    return {
        eventId: json['eventId'] as number,
        eventName: json['eventName'] as string,
        sessionId: json['sessionId'] as number,
        sessionName: json['sessionName'] as string,
        lapsToGo: json['lapsToGo'] as number,
        timeToGo: json['timeToGo'] as string,
        localTimeOfDay: json['localTimeOfDay'] as string,
        runningRaceTime: json['runningRaceTime'] as string,
        isPracticeQualifying: json['isPracticeQualifying'] as boolean,
        sessionStartTime: json['sessionStartTime'] as Date,
        sessionEndTime: json['sessionEndTime'] as Date | null,
        localTimeZoneOffset: json['localTimeZoneOffset'] as number,
        isLive: json['isLive'] as boolean,
        eventEntries: (json['eventEntries'] as Record<string, unknown>[]).map(eventEntryFromJson),
        carPositions: (json['carPositions'] as Record<string, unknown>[]).map(carPositionFromJson),
        currentFlag: json['currentFlag'] as Flags,
        flagDurations: (json['flagDurations'] as Record<string, unknown>[]).map(flagDurationFromJson),
        greenTimeMs: json['greenTimeMs'] as number | null,
        greenLaps: json['greenLaps'] as number | null,
        yellowTimeMs: json['yellowTimeMs'] as number | null,
        yellowLaps: json['yellowLaps'] as number | null,
        numberOfYellows: json['numberOfYellows'] as number | null,
        redTimeMs: json['redTimeMs'] as number | null,
        averageRaceSpeed: json['averageRaceSpeed'] as string,
        leadChanges: json['leadChanges'] as number | null,
        sections: (json['sections'] as Record<string, unknown>[]).map(sectionFromJson),
        classColors: json['classColors'] as { [key: string]: string; },
        announcements: (json['announcements'] as Record<string, unknown>[]).map(announcementFromJson),
        lastUpdated: json['lastUpdated'] as Date | null,
        classOrder: json['classOrder'] as { [key: string]: string; },
        isSimulation: json['isSimulation'] as boolean,
        isArchived: json['isArchived'] as boolean,
        trackTempDegF: json['trackTempDegF'] as number | null,
        trackPrecipitationPerc: json['trackPrecipitationPerc'] as number | null,
    };
}

export function eventEntryFromJson(json: Record<string, unknown>): EventEntry {
    return {
        number: json['no'] as string,
        name: json['nm'] as string,
        team: json['t'] as string,
        class: json['c'] as string,
    };
}

export function carPositionFromJson(json: Record<string, unknown>): CarPosition {
    return {
        invalidPosition: -999,
        eventId: json['eid'] as string,
        sessionId: json['sid'] as string,
        number: json['n'] as string,
        transponderId: json['tp'] as number,
        class: json['class'] as string,
        bestTime: json['bt'] as string,
        bestLap: json['bl'] as number,
        isBestTime: json['ibt'] as boolean,
        isBestTimeClass: json['btc'] as boolean,
        inClassGap: json['cg'] as string,
        inClassDifference: json['cd'] as string,
        overallGap: json['og'] as string,
        overallDifference: json['od'] as string,
        totalTime: json['ttm'] as string,
        lastLapTime: json['ltm'] as string,
        lastLapCompleted: json['llp'] as number,
        pitStopCount: json['psc'] as number | null,
        lastLapPitted: json['lastLapPitted'] as number | null,
        lapsLedOverall: json['llo'] as number | null,
        lapsLedInClass: json['llic'] as number | null,
        overallPosition: json['ovp'] as number,
        classPosition: json['clp'] as number,
        overallStartingPosition: json['osp'] as number,
        overallPositionsGained: json['opg'] as number,
        inClassStartingPosition: json['icsp'] as number,
        inClassPositionsGained: json['cpg'] as number,
        isOverallMostPositionsGained: json['ompg'] as boolean,
        isClassMostPositionsGained: json['cmpg'] as boolean,
        penalityLaps: json['pl'] as number,
        penalityWarnings: json['pw'] as number,
        blackFlags: json['bf'] as number,
        isEnteredPit: json['enp'] as boolean,
        isPitStartFinish: json['psf'] as boolean,
        isExitedPit: json['exp'] as boolean,
        isInPit: json['ip'] as boolean,
        lapIncludedPit: json['lip'] as boolean,
        lastLoopName: json['ln'] as string,
        isStale: json['st'] as boolean,
        trackFlag: json['flg'] as Flags,
        localFlag: json['lflg'] as Flags,
        lapHadLocalFlag: json['lhlf'] as boolean | null,
        completedSections: (json['csec'] as Record<string, unknown>[]).map(completedSectionFromJson),
        projectedLapTimeMs: json['plt'] as number,
        lapStartTime: json['lstt'] as string,
        driverName: json['dn'] as string,
        driverId: json['did'] as string,
        inCarVideo: json['vid'] != null ? videoStatusFromJson(json['vid'] as Record<string, unknown>) : null,
        latitude: json['lat'] as number | null,
        longitude: json['lon'] as number | null,
        currentStatus: json['mcs'] as string,
        impactWarning: json['iw'] as boolean,
        inClassFastestAveragePace: json['faic'] as boolean,
        trackTempDegF: json['temp'] as number | null,
        trackPrecipitationPerc: json['precip'] as number | null,
    };
}

export function flagDurationFromJson(json: Record<string, unknown>): FlagDuration {
    return {
        flag: json['f'] as Flags,
        startTime: json['s'] as Date,
        endTime: json['e'] as Date | null,
    };
}

export function sectionFromJson(json: Record<string, unknown>): Section {
    return {
        name: json['name'] as string,
        lengthInches: json['lengthInches'] as number,
        startLabel: json['startLabel'] as string,
        endLabel: json['endLabel'] as string,
    };
}

export function announcementFromJson(json: Record<string, unknown>): Announcement {
    return {
        timestamp: json['timestamp'] as Date,
        priority: json['priority'] as string,
        text: json['text'] as string,
    };
}

export function completedSectionFromJson(json: Record<string, unknown>): CompletedSection {
    return {
        number: json['number'] as string,
        sectionId: json['sectionId'] as string,
        elapsedTimeMs: json['elapsedTimeMs'] as number,
        lastSectionTimeMs: json['lastSectionTimeMs'] as number,
        lastLap: json['lastLap'] as number,
    };
}

export function eventListSummaryFromJson(json: Record<string, unknown>): EventListSummary {
    return {
        id: json['eid'] as number,
        organizationId: json['oid'] as number,
        organizationName: json['on'] as string,
        eventName: json['en'] as string,
        eventDate: json['ed'] as string,
        isLive: json['l'] as boolean,
        trackName: json['t'] as string,
        schedule: json['s'] != null ? eventScheduleFromJson(json['s'] as Record<string, unknown>) : null,
        isSimulation: json['sim'] as boolean,
        isArchived: json['arch'] as boolean,
        hasResults: json['hasResults'] as boolean,
        isPrivate: json['priv'] as boolean,
        hideName: json['hn'] as boolean,
    };
}

export function eventFromJson(json: Record<string, unknown>): Event {
    return {
        eventId: json['e'] as number,
        eventName: json['n'] as string,
        eventDate: json['d'] as string,
        eventUrl: json['u'] as string,
        sessions: (json['s'] as Record<string, unknown>[]).map(sessionFromJson),
        organizationName: json['on'] as string,
        organizationWebsite: json['ow'] as string,
        organizationLogo: json['l'] as number[],
        schedule: json['sc'] != null ? eventScheduleFromJson(json['sc'] as Record<string, unknown>) : null,
        trackName: json['t'] as string,
        courseConfiguration: json['cc'] as string,
        distance: json['di'] as string,
        broadcast: json['b'] != null ? broadcasterConfigFromJson(json['b'] as Record<string, unknown>) : null,
        hasControlLog: json['hc'] as boolean,
        isLive: json['il'] as boolean,
        isSimulation: json['isSimulation'] as boolean,
        isArchived: json['isArchived'] as boolean,
        organizationId: json['organizationId'] as number,
        isPrivate: json['priv'] as boolean,
        hideName: json['hn'] as boolean,
    };
}

export function sessionFromJson(json: Record<string, unknown>): Session {
    return {
        id: json['sid'] as number,
        eventId: json['eid'] as number,
        name: json['n'] as string,
        startTime: json['st'] as Date,
        endTime: json['et'] as Date | null,
        localTimeZoneOffset: json['tz'] as number,
        lastUpdated: json['lu'] as Date | null,
        isLive: json['il'] as boolean,
        isPracticeQualifying: json['pq'] as boolean,
    };
}

export function competitorMetadataFromJson(json: Record<string, unknown>): CompetitorMetadata {
    return {
        eventId: json['e'] as number,
        carNumber: json['n'] as string,
        lastUpdated: json['lu'] as Date,
        transponder: json['t'] as number,
        transponder2: json['t2'] as number,
        class: json['cl'] as string,
        firstName: json['fn'] as string,
        lastName: json['ln'] as string,
        nationState: json['ns'] as string,
        sponsor: json['s'] as string,
        make: json['mk'] as string,
        hometown: json['h'] as string,
        club: json['c'] as string,
        modelEngine: json['mo'] as string,
        tires: json['tr'] as string,
        email: json['a'] as string,
    };
}

export function controlLogEntryFromJson(json: Record<string, unknown>): ControlLogEntry {
    return {
        orderId: json['o'] as number,
        timestamp: json['t'] as Date,
        corner: json['cor'] as string,
        car1: json['c1'] as string,
        isCar1Highlighted: json['c1h'] as boolean,
        car2: json['c2'] as string,
        isCar2Highlighted: json['c2h'] as boolean,
        note: json['n'] as string,
        status: json['s'] as string,
        penaltyAction: json['a'] as string,
        otherNotes: json['on'] as string,
    };
}

export function carControlLogsFromJson(json: Record<string, unknown>): CarControlLogs {
    return {
        carNumber: json['cn'] as string,
        controlLogEntries: (json['entries'] as Record<string, unknown>[]).map(controlLogEntryFromJson),
    };
}

export function sessionStatePatchFromJson(json: Record<string, unknown>): SessionStatePatch {
    return {
        eventId: json['eventId'] as number | null,
        eventName: json['eventName'] as string,
        sessionId: json['sessionId'] as number | null,
        sessionName: json['sessionName'] as string,
        lapsToGo: json['lapsToGo'] as number | null,
        timeToGo: json['timeToGo'] as string,
        localTimeOfDay: json['localTimeOfDay'] as string,
        runningRaceTime: json['runningRaceTime'] as string,
        isPracticeQualifying: json['isPracticeQualifying'] as boolean | null,
        sessionStartTime: json['sessionStartTime'] as Date | null,
        sessionEndTime: json['sessionEndTime'] as Date | null,
        localTimeZoneOffset: json['localTimeZoneOffset'] as number | null,
        isLive: json['isLive'] as boolean | null,
        eventEntries: json['eventEntries'] != null ? (json['eventEntries'] as Record<string, unknown>[]).map(eventEntryFromJson) : null,
        carPositions: json['carPositions'] != null ? (json['carPositions'] as Record<string, unknown>[]).map(carPositionFromJson) : null,
        currentFlag: json['currentFlag'] as Flags | null,
        flagDurations: json['flagDurations'] != null ? (json['flagDurations'] as Record<string, unknown>[]).map(flagDurationFromJson) : null,
        greenTimeMs: json['greenTimeMs'] as number | null,
        greenLaps: json['greenLaps'] as number | null,
        yellowTimeMs: json['yellowTimeMs'] as number | null,
        yellowLaps: json['yellowLaps'] as number | null,
        numberOfYellows: json['numberOfYellows'] as number | null,
        redTimeMs: json['redTimeMs'] as number | null,
        averageRaceSpeed: json['averageRaceSpeed'] as string,
        leadChanges: json['leadChanges'] as number | null,
        sections: json['sections'] != null ? (json['sections'] as Record<string, unknown>[]).map(sectionFromJson) : null,
        classColors: json['classColors'] as { [key: string]: string; },
        announcements: json['announcements'] != null ? (json['announcements'] as Record<string, unknown>[]).map(announcementFromJson) : null,
        lastUpdated: json['lastUpdated'] as Date | null,
        classOrder: json['classOrder'] as { [key: string]: string; },
        isSimulation: json['isSimulation'] as boolean | null,
        isArchived: json['isArchived'] as boolean | null,
        trackTempDegF: json['trackTempDegF'] as number | null,
        trackPrecipitationPerc: json['trackPrecipitationPerc'] as number | null,
    };
}

export function carPositionPatchFromJson(json: Record<string, unknown>): CarPositionPatch {
    return {
        eventId: json['eventId'] as string,
        sessionId: json['sessionId'] as string,
        number: json['number'] as string,
        transponderId: json['transponderId'] as number | null,
        class: json['class'] as string,
        bestTime: json['bestTime'] as string,
        bestLap: json['bestLap'] as number | null,
        isBestTime: json['isBestTime'] as boolean | null,
        isBestTimeClass: json['isBestTimeClass'] as boolean | null,
        inClassGap: json['inClassGap'] as string,
        inClassDifference: json['inClassDifference'] as string,
        overallGap: json['overallGap'] as string,
        overallDifference: json['overallDifference'] as string,
        totalTime: json['totalTime'] as string,
        lastLapTime: json['lastLapTime'] as string,
        lastLapCompleted: json['lastLapCompleted'] as number | null,
        pitStopCount: json['pitStopCount'] as number | null,
        lastLapPitted: json['lastLapPitted'] as number | null,
        lapsLedOverall: json['lapsLedOverall'] as number | null,
        lapsLedInClass: json['lapsLedInClass'] as number | null,
        overallPosition: json['overallPosition'] as number | null,
        classPosition: json['classPosition'] as number | null,
        overallStartingPosition: json['overallStartingPosition'] as number | null,
        overallPositionsGained: json['overallPositionsGained'] as number | null,
        inClassStartingPosition: json['inClassStartingPosition'] as number | null,
        inClassPositionsGained: json['inClassPositionsGained'] as number | null,
        isOverallMostPositionsGained: json['isOverallMostPositionsGained'] as boolean | null,
        isClassMostPositionsGained: json['isClassMostPositionsGained'] as boolean | null,
        penalityLaps: json['penalityLaps'] as number | null,
        penalityWarnings: json['penalityWarnings'] as number | null,
        blackFlags: json['blackFlags'] as number | null,
        isEnteredPit: json['isEnteredPit'] as boolean | null,
        isPitStartFinish: json['isPitStartFinish'] as boolean | null,
        isExitedPit: json['isExitedPit'] as boolean | null,
        isInPit: json['isInPit'] as boolean | null,
        lapIncludedPit: json['lapIncludedPit'] as boolean | null,
        lastLoopName: json['lastLoopName'] as string,
        isStale: json['isStale'] as boolean | null,
        trackFlag: json['trackFlag'] as Flags | null,
        localFlag: json['localFlag'] as Flags | null,
        lapHadLocalFlag: json['lapHadLocalFlag'] as boolean | null,
        completedSections: json['completedSections'] != null ? (json['completedSections'] as Record<string, unknown>[]).map(completedSectionFromJson) : null,
        projectedLapTimeMs: json['projectedLapTimeMs'] as number | null,
        lapStartTime: json['lapStartTime'] as string | null,
        driverName: json['driverName'] as string,
        driverId: json['driverId'] as string,
        inCarVideo: json['inCarVideo'] != null ? videoStatusFromJson(json['inCarVideo'] as Record<string, unknown>) : null,
        latitude: json['latitude'] as number | null,
        longitude: json['longitude'] as number | null,
        currentStatus: json['currentStatus'] as string,
        impactWarning: json['impactWarning'] as boolean | null,
        inClassFastestAveragePace: json['inClassFastestAveragePace'] as boolean | null,
        trackTempDegF: json['trackTempDegF'] as number | null,
        trackPrecipitationPerc: json['trackPrecipitationPerc'] as number | null,
    };
}

export function videoStatusFromJson(json: Record<string, unknown>): VideoStatus {
    return {
        videoSystemType: json['videoSystemType'] as VideoSystemType,
        videoDestination: videoDestinationFromJson(json['videoDestination'] as Record<string, unknown>),
    };
}

export function videoDestinationFromJson(json: Record<string, unknown>): VideoDestination {
    return {
        type: json['t'] as VideoDestinationType,
        url: json['u'] as string,
        hostName: json['h'] as string,
        port: json['p'] as number,
        parameters: json['pa'] as string,
    };
}

export function broadcasterConfigFromJson(json: Record<string, unknown>): BroadcasterConfig {
    return {
        companyName: json['c'] as string,
        url: json['u'] as string,
    };
}

export function eventScheduleFromJson(json: Record<string, unknown>): EventSchedule {
    return {
        name: json['n'] as string,
        entries: (json['s'] as Record<string, unknown>[]).map(eventScheduleEntryFromJson),
    };
}

export function eventScheduleEntryFromJson(json: Record<string, unknown>): EventScheduleEntry {
    return {
        dayOfEvent: json['d'] as Date,
        startTime: json['s'] as Date,
        endTime: json['e'] as Date,
        name: json['n'] as string,
    };
}

