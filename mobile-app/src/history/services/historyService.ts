// src/history/services/historyService.ts
// API layer for the Donation History feature.
//
// While the backend is not ready, USE_MOCK = true returns in-memory data.
// Set USE_MOCK = false when the endpoints exist.
//
// Expected REST endpoints (agree these with the backend owner):
//   GET /donors/me/donations        -> DonationHistoryData
//   GET /donors/me/donation-record  -> { url: string }   (official donor record PDF)
//
// TODO: when connecting to the real backend, replace `request` below with the shared
// client in src/services/api.ts so the logged-in user's token is attached automatically.

import { DonationHistoryData } from '../types/history';

const USE_MOCK = true;
const API_BASE_URL = 'http://10.0.2.2:3000/api'; // Android emulator -> host machine

let authToken: string | null = null;
export function setHistoryAuthToken(token: string | null) {
    authToken = token;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const mockData: DonationHistoryData = {
    donorName: 'Kavindu Perera',
    summary: { bloodGroup: 'O-', totalDonations: 4, totalVolumeMl: 1800 },
    records: [
        {
            id: 'don-003',
            hospitalName: 'Sabaragamuwa General Hospital',
            donatedAt: '2024-05-15',
            donationType: 'Whole Blood',
            volumeMl: 450,
            note: 'Emergency Ward call',
            status: 'verified',
        },
        {
            id: 'don-002',
            hospitalName: 'Teaching Hospital Ratnapura',
            donatedAt: '2023-11-10',
            donationType: 'Whole Blood',
            volumeMl: 450,
            note: 'Routine scheduled drive',
            status: 'verified',
        },
        {
            id: 'don-001',
            hospitalName: 'National Blood Center Colombo',
            donatedAt: '2023-05-22',
            donationType: 'Whole Blood',
            volumeMl: 450,
            note: 'Voluntary center donor',
            status: 'verified',
        },
    ],
};

async function request<T>(path: string): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (authToken) headers.Authorization = `Bearer ${authToken}`;

    const response = await fetch(`${API_BASE_URL}${path}`, { headers });
    if (!response.ok) {
        let message = `Request failed (${response.status})`;
        try {
            const body = await response.json();
            if (body?.message) message = body.message;
        } catch {
            /* keep default message */
        }
        throw new Error(message);
    }
    return (await response.json()) as T;
}

export async function fetchDonationHistory(): Promise<DonationHistoryData> {
    const data = USE_MOCK
        ? (await wait(500), mockData)
        : await request<DonationHistoryData>('/donors/me/donations');

    // Newest donation first
    const records = [...data.records].sort(
        (a, b) => new Date(b.donatedAt).getTime() - new Date(a.donatedAt).getTime(),
    );
    return { ...data, records };
}

// Returns a URL to the official donor record PDF, or null when not available yet.
export async function fetchDonorRecordUrl(): Promise<string | null> {
    if (USE_MOCK) {
        await wait(300);
        return null;
    }
    const result = await request<{ url: string }>('/donors/me/donation-record');
    return result.url ?? null;
}