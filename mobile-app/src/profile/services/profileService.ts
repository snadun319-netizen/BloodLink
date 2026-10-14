// src/services/profileService.ts
// API layer for donor profile management.
//
// While the backend is not ready, USE_MOCK = true returns in-memory data.
// When the backend team finishes the endpoints, set USE_MOCK = false.
//
// Expected REST endpoints (agree these with the backend owner):
//   GET    /donors/me                         -> DonorProfile
//   PATCH  /donors/me                         -> DonorProfile   (fullName, phone, district)
//   PATCH  /donors/me/availability            -> DonorProfile   ({ isAvailable })
//   POST   /donors/me/verification-documents  -> DonorProfile   (multipart form, field "document")

import { DonorProfile, EditableProfileFields, PickedFile } from '../types/profile';

const USE_MOCK = true;

// Android emulator reaches the host machine through 10.0.2.2.
// For a real device use your computer's LAN IP, or the deployed URL.
const API_BASE_URL = 'http://10.0.2.2:3000/api';

// TODO: replace with the real token from the Authentication module (JWT, secure storage).
let authToken: string | null = null;
export function setAuthToken(token: string | null) {
    authToken = token;
}

// ---------------------------------------------------------------- mock data
let mockProfile: DonorProfile = {
    id: 'donor-001',
    fullName: 'Kavindu Perera',
    phone: '+94 77 123 4567',
    district: 'Ratnapura',
    donorSince: '2022-12-01',
    bloodGroup: 'O-',
    isAvailable: true,
    totalDonations: 7,
    lastDonationDate: '2024-02-15',
    lastDonationPlace: 'Ratnapura Base',
    bloodGroupVerification: 'approved',
    verifiedBy: 'National Blood Bank',
    verifiedAt: '2022-12-10',
    nicNumber: '199812345678V',
    nicVerified: true,
    document: {
        id: 'doc-001',
        fileName: 'blood_report_dec22.pdf',
        sizeBytes: 1.2 * 1024 * 1024,
        status: 'rejected',
        rejectionReason:
            'Uploaded document was illegible or expired. Please upload a clear photo or PDF issued within the last 6 months.',
        uploadedAt: '2022-12-05',
    },
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// ------------------------------------------------------------- real client
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

// --------------------------------------------------------------- public API
export async function fetchMyProfile(): Promise<DonorProfile> {
    if (USE_MOCK) {
        await wait(500);
        return { ...mockProfile };
    }
    return request<DonorProfile>('/donors/me');
}

export async function updateMyProfile(fields: EditableProfileFields): Promise<DonorProfile> {
    if (USE_MOCK) {
        await wait(500);
        mockProfile = { ...mockProfile, ...fields };
        return { ...mockProfile };
    }
    return request<DonorProfile>('/donors/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
    });
}

export async function setMyAvailability(isAvailable: boolean): Promise<DonorProfile> {
    if (USE_MOCK) {
        await wait(300);
        mockProfile = { ...mockProfile, isAvailable };
        return { ...mockProfile };
    }
    return request<DonorProfile>('/donors/me/availability', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable }),
    });
}

export async function uploadVerificationDocument(file: PickedFile): Promise<DonorProfile> {
    if (USE_MOCK) {
        await wait(900);
        mockProfile = {
            ...mockProfile,
            bloodGroupVerification:
                mockProfile.bloodGroupVerification === 'approved' ? 'approved' : 'pending',
            document: {
                id: `doc-${Date.now()}`,
                fileName: file.name,
                sizeBytes: file.size,
                status: 'pending',
                uploadedAt: new Date().toISOString(),
            },
        };
        return { ...mockProfile };
    }

    const form = new FormData();
    // React Native's FormData accepts { uri, name, type } for files.
    form.append('document', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
    return request<DonorProfile>('/donors/me/verification-documents', {
        method: 'POST',
        body: form,
    });
}