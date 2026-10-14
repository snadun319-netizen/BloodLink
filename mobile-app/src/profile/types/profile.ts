// src/types/profile.ts
// Data shapes for the Donor Profile Management feature.

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

// Matches the pending / approved / rejected workflow in the proposal (Section 12.2)
export type VerificationStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface VerificationDocument {
    id: string;
    fileName: string;
    sizeBytes: number;
    status: VerificationStatus;
    rejectionReason?: string;
    uploadedAt: string; // ISO date
}

export interface DonorProfile {
    id: string;
    fullName: string;
    phone: string;
    district: string; // coarse location only (location privacy, Section 11.5.4)
    donorSince: string; // ISO date
    bloodGroup: BloodGroup;
    isAvailable: boolean; // donor availability status

    totalDonations: number;
    lastDonationDate: string | null; // ISO date
    lastDonationPlace: string | null;

    bloodGroupVerification: VerificationStatus;
    verifiedBy?: string;
    verifiedAt?: string; // ISO date

    nicNumber: string;
    nicVerified: boolean;

    document: VerificationDocument | null;
}

// Fields a donor is allowed to edit. Blood group is NOT editable here
// because it must go through the verification workflow.
export type EditableProfileFields = Pick<DonorProfile, 'fullName' | 'phone' | 'district'>;

export interface PickedFile {
    uri: string;
    name: string;
    size: number;
    mimeType: string;
}