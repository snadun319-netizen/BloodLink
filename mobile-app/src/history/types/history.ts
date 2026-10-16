// src/history/types/history.ts
export type DonationStatus = 'verified' | 'pending';

export interface DonationRecord {
    id: string;
    hospitalName: string;
    donatedAt: string; // ISO date
    donationType: string; // e.g. "Whole Blood"
    volumeMl: number; // e.g. 450
    note: string; // e.g. "Emergency Ward call"
    status: DonationStatus; // verified by the blood bank / hospital
    certificateUrl?: string; // link to the donation certificate (when available)
}

export interface HistorySummary {
    bloodGroup: string;
    totalDonations: number;
    totalVolumeMl: number;
}

export interface DonationHistoryData {
    donorName: string;
    summary: HistorySummary;
    records: DonationRecord[];
}