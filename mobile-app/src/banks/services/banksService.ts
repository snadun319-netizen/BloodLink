// src/banks/services/banksService.ts
import { api } from '../../services/api';
import { BloodBanksResponse } from '../types/banks';

/**
 * Fetches blood banks and donor initials from the backend.
 * Uses the authenticated GET helper in src/services/api.ts.
 */
export async function fetchBloodBanks(): Promise<BloodBanksResponse> {
  const response = await api.authGet<BloodBanksResponse>('/donors/banks');
  const payload = response.data;

  if (!payload || !Array.isArray(payload.banks)) {
    throw new Error('Invalid response received from blood banks service.');
  }

  return {
    donorInitials: typeof payload.donorInitials === 'string' && payload.donorInitials.trim()
      ? payload.donorInitials.trim().toUpperCase()
      : 'D',
    banks: payload.banks,
  };
}

