// src/services/profileService.ts
// API layer for donor profile management.

import { api, ApiClientError } from '../../services/api';
import { BloodGroup, DonorProfile, EditableProfileFields, PickedFile, VerificationStatus } from '../types/profile';

// Keep a flag so the screen can still be demoed without a backend if needed.
// Default is false so logged-in donors load their real profile from the backend.
export const USE_MOCK = false;

// Backwards-compatibility stub (tokens are managed automatically by AuthContext and api.ts)
export function setAuthToken(_token: string | null) {}

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
    nicVerified: false,
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

const VALID_BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// --------------------------------------------------------------- public API
export async function fetchMyProfile(): Promise<DonorProfile> {
    if (USE_MOCK) {
        await wait(500);
        return { ...mockProfile };
    }

    const response = await api.authGet<{ user: any }>('/auth/me');
    const user = response.data?.user;

    if (!user) {
        throw new Error('Could not load your profile.');
    }

    const rawBloodGroup = user.bloodGroup;
    if (!rawBloodGroup || !VALID_BLOOD_GROUPS.includes(rawBloodGroup as BloodGroup)) {
        throw new Error('Your profile is incomplete');
    }

    // Map verification status using BOTH donor_profiles.blood_group_verified and donor_verifications.status
    let bloodGroupVerification: VerificationStatus = 'none';
    const status = user.verificationStatus;
    const isBloodGroupVerified = Boolean(user.bloodGroupVerified || user.blood_group_verified);

    if (isBloodGroupVerified || status === 'approved') {
        bloodGroupVerification = 'approved';
    } else if (status === 'pending') {
        bloodGroupVerification = 'pending';
    } else if (status === 'rejected') {
        bloodGroupVerification = 'rejected';
    } else {
        bloodGroupVerification = 'none';
    }

    return {
        id: String(user.id),
        fullName: user.fullName || 'Valued Donor',
        phone: user.phone || '',
        district: '', // District is empty for real users
        donorSince: user.createdAt ? user.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
        bloodGroup: rawBloodGroup as BloodGroup,
        isAvailable: user.isAvailable ?? true,
        totalDonations: 0, // Neutral default
        lastDonationDate: user.lastDonationDate ? user.lastDonationDate.split('T')[0] : null,
        lastDonationPlace: null, // Neutral default
        bloodGroupVerification,
        verifiedBy: undefined,
        verifiedAt: undefined,
        nicNumber: user.nic || '',
        nicVerified: false, // Database has no NIC verification
        document: null, // Keep null unless the backend provides one
    };
}

export async function updateMyProfile(fields: EditableProfileFields): Promise<DonorProfile> {
    if (USE_MOCK) {
        await wait(500);
        mockProfile = { ...mockProfile, ...fields };
        return { ...mockProfile };
    }
    throw new Error('This feature is not connected to the backend yet.');
}

export async function setMyAvailability(isAvailable: boolean): Promise<DonorProfile> {
    if (USE_MOCK) {
        await wait(300);
        mockProfile = { ...mockProfile, isAvailable };
        return { ...mockProfile };
    }
    throw new Error('This feature is not connected to the backend yet.');
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
    throw new Error('This feature is not connected to the backend yet.');
}
