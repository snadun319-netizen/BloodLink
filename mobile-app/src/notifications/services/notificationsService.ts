// src/notifications/services/notificationsService.ts
// API layer for the Notification tab.
//
// While the backend is not ready, USE_MOCK = true uses in-memory data.
// Set USE_MOCK = false when the endpoints exist.
//
// Expected REST endpoints (agree these with the backend owner):
//   GET   /notifications               -> AppNotification[]
//   PATCH /notifications/:id/read      -> {}
//   PATCH /notifications/read-all      -> {}
//
// TODO: when connecting to the real backend, replace `request` below with the shared
// client in src/services/api.ts so the logged-in user's token is attached automatically.

import { AppNotification } from '../types/notifications';

const USE_MOCK = true;
const API_BASE_URL = 'http://10.0.2.2:3000/api'; // Android emulator -> host machine

let authToken: string | null = null;
export function setNotificationsAuthToken(token: string | null) {
    authToken = token;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const ago = (minutes: number) => new Date(Date.now() - minutes * 60000).toISOString();

function buildMock(): AppNotification[] {
    return [
        {
            id: 'n-001',
            kind: 'critical_need',
            category: 'urgent',
            title: 'Critical O- Blood Alert Nearby',
            body:
                'Sabaragamuwa GH has an active requirement (4 units needed for emergency trauma ICU). Tap to view and coordinate transfer.',
            createdAt: ago(12),
            isRead: false,
            requestId: 'req-001',
            distanceKm: 2.4,
            location: 'Ratnapura',
        },
        {
            id: 'n-002',
            kind: 'lab_result',
            category: 'doctor',
            title: 'Post-Donation Screening Report',
            subtitle: 'Dr. Anura Senanayake · National Blood Center',
            createdAt: ago(120),
            isRead: false,
            labReport: {
                hemoglobin: '14.2 g/dL',
                infectiousDiseases: 'Negative',
                volumeMl: 450,
                allClear: true,
                doctorMessage:
                    'Thank you Kavindu. Your donation from 15 May was cleared and dispatched to Sabaragamuwa GH Pediatric Unit. Your next donation window has been unlocked.',
            },
        },
        {
            id: 'n-003',
            kind: 'health_advisory',
            category: 'doctor',
            title: 'Routine Wellness & Iron Level Check',
            subtitle: 'Dr. Priyantha Dissanayake · Ratnapura',
            body:
                'Pre-donation vitals looked optimal. We recommend maintaining regular hydration and high-iron dietary intake ahead of your next eligible window in August 2026.',
            createdAt: ago(300),
            isRead: true,
            eligibleInDays: 68,
        },
        {
            id: 'n-004',
            kind: 'community_impact',
            category: 'system',
            title: 'Lifesaver Tier 2 Unlocked!',
            body:
                '7 Donations completed · 21+ lives impacted across Sabaragamuwa Province. Your digital recognition badge has been pinned to your donor card.',
            createdAt: ago(26 * 60),
            isRead: false,
            honor: { title: 'Silver Lifesaver Honor', verifiedBy: 'NBC Sri Lanka' },
        },
        {
            id: 'n-005',
            kind: 'profile_synced',
            category: 'system',
            title: 'Donor Profile Synced',
            subtitle: 'National Registry ID: #LK-77402',
            body:
                'Your national blood bank donor book credentials were successfully updated and synchronized across all regional hospitals.',
            createdAt: ago(50 * 60),
            isRead: true,
        },
    ];
}

let mockStore: AppNotification[] = buildMock();

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
        Accept: 'application/json',
        ...(init.headers as Record<string, string> | undefined),
    };
    if (authToken) headers.Authorization = `Bearer ${authToken}`;

    const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
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

export async function fetchNotifications(): Promise<AppNotification[]> {
    const list = USE_MOCK ? (await wait(500), [...mockStore]) : await request<AppNotification[]>('/notifications');
    // Newest first
    return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function markNotificationRead(id: string): Promise<void> {
    if (USE_MOCK) {
        await wait(150);
        mockStore = mockStore.map((n) => (n.id === id ? { ...n, isRead: true } : n));
        return;
    }
    await request(`/notifications/${id}/read`, { method: 'PATCH' });
}

export async function markAllNotificationsRead(): Promise<void> {
    if (USE_MOCK) {
        await wait(200);
        mockStore = mockStore.map((n) => ({ ...n, isRead: true }));
        return;
    }
    await request('/notifications/read-all', { method: 'PATCH' });
}