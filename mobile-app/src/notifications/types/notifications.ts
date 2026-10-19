// src/notifications/types/notifications.ts
export type NotificationKind =
    | 'critical_need' // urgent nearby blood request
    | 'lab_result' // post-donation screening report
    | 'health_advisory' // doctor's wellness advice + eligibility countdown
    | 'community_impact' // badges / milestones
    | 'profile_synced'; // system message

// Used by the filter chips: All / Doctor Reports / Urgent Alerts / System
export type NotificationCategory = 'urgent' | 'doctor' | 'system';

export interface LabReport {
    hemoglobin: string; // e.g. "14.2 g/dL"
    infectiousDiseases: string; // e.g. "Negative"
    volumeMl: number;
    allClear: boolean;
    doctorMessage: string;
    labPdfUrl?: string;
    doctorNoteUrl?: string;
}

export interface AppNotification {
    id: string;
    kind: NotificationKind;
    category: NotificationCategory;
    title: string;
    subtitle?: string;
    body?: string;
    createdAt: string; // ISO date-time
    isRead: boolean;

    // critical_need
    requestId?: string;
    distanceKm?: number;
    location?: string;

    // lab_result
    labReport?: LabReport;

    // health_advisory
    eligibleInDays?: number;
    guidelinesUrl?: string;

    // community_impact
    honor?: { title: string; verifiedBy: string };
}