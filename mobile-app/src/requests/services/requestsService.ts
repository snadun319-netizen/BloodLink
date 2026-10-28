// src/requests/services/requestsService.ts
// Service layer for Blood Requests feature connected to real backend API

import { api } from '../../services/api';
import { RequestsData } from '../types/requests';

/**
 * Fetch real blood requests page data from backend:
 * - Donor profile summary
 * - Active alert requests (real PostgreSQL blood_requests with distance & elapsed time)
 * - Active dispatch mission (real en-route status, hospital coordinator, fast pass token)
 */
export async function fetchRequestsData(): Promise<RequestsData> {
  const response = await api.authGet<RequestsData>('/requests/me');
  return response.data;
}

/**
 * Register donor response to a real blood request (e.g. accepted / en route).
 */
export async function respondToAlertRequest(
  requestId: string,
  status: 'accepted' | 'declined'
): Promise<{ success: boolean; message: string }> {
  const response = await api.authPost<{ success: boolean; message: string }>(
    `/requests/${requestId}/respond`,
    { status }
  );
  return response.data;
}

/**
 * Send delay / status notification to hospital dispatch coordinator.
 */
export async function notifyMissionCoordinator(
  missionId: string,
  reason: string
): Promise<{ success: boolean; message: string }> {
  const response = await api.authPost<{ success: boolean; message: string }>(
    `/requests/mission/${missionId}/notify`,
    { reason }
  );
  return response.data;
}

/**
 * Cancel active mission if donor is unable to attend.
 */
export async function cancelMission(
  missionId: string
): Promise<{ success: boolean; message: string }> {
  const response = await api.authPost<{ success: boolean; message: string }>(
    `/requests/mission/${missionId}/cancel`,
    {}
  );
  return response.data;
}
