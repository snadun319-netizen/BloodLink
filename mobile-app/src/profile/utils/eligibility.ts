// src/utils/eligibility.ts
// Eligibility is a REMINDER / SUPPORT function, not medical clearance (proposal 11.5.5).
// Final eligibility is always decided by qualified blood-bank staff.

// Configurable policy value. Confirm the exact interval with the NBTS guideline / mentor.
export const DONATION_INTERVAL_DAYS = 120;

// Rough estimate used by the "Lives Saved" card (1 donation can help up to 3 patients).
export const PATIENTS_PER_DONATION = 3;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface EligibilityResult {
    eligible: boolean;
    nextEligibleDate: Date | null;
    daysRemaining: number;
}

export function getEligibility(
    lastDonationDate: string | null,
    now: Date = new Date(),
): EligibilityResult {
    if (!lastDonationDate) {
        return { eligible: true, nextEligibleDate: null, daysRemaining: 0 };
    }

    const next = new Date(lastDonationDate);
    next.setDate(next.getDate() + DONATION_INTERVAL_DAYS);

    const days = Math.ceil((next.getTime() - now.getTime()) / MS_PER_DAY);
    return {
        eligible: days <= 0,
        nextEligibleDate: next,
        daysRemaining: Math.max(days, 0),
    };
}

export function estimateLivesSaved(totalDonations: number): number {
    return totalDonations * PATIENTS_PER_DONATION;
}