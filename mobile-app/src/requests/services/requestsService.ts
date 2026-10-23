// src/requests/services/requestsService.ts
// Service layer for Blood Requests feature (dummy data & API abstraction for group project)

import { RequestsData, AlertRequestItem, ActiveMission } from '../types/requests';

const USE_MOCK = true;
const API_BASE_URL = 'http://10.0.2.2:3000/api';

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const mockRequestsData: RequestsData = {
  donorInitials: 'KP',
  donorName: 'Kavindu Perera',
  unreadAlertsCount: 3,
  activeCount: 1,
  alerts: [
    {
      id: 'req-sab-01',
      hospitalName: 'Sabaragamuwa General Hospital',
      distance: '3.2 km away',
      timeAgo: '10m ago',
      bloodGroup: 'O- Negative',
      unitsNeeded: 2,
      isUrgent: true,
      type: 'urgent',
      requirementLabel: 'O- Negative · 2 Units needed',
      address: 'Hospital Rd, Ratnapura 70000',
      contactNumber: '+94 45 222 2261',
      patientCase: 'Emergency Trauma ICU - Urgent transfusion needed for surgical patient.',
    },
    {
      id: 'req-rat-02',
      hospitalName: 'Teaching Hospital Ratnapura',
      distance: '4.5 km away',
      timeAgo: '45m ago',
      bloodGroup: 'O- Negative',
      unitsNeeded: 1,
      isUrgent: false,
      type: 'standard',
      requirementLabel: 'O- Negative · 1 Unit needed',
      address: 'Main Street, Ratnapura',
      contactNumber: '+94 45 222 3444',
      patientCase: 'Hematology Ward - Planned blood transfusion for elective surgery.',
    },
    {
      id: 'req-dbh-03',
      hospitalName: 'District Base Hospital',
      distance: '8.0 km away',
      timeAgo: '2h ago',
      bloodGroup: 'O- Negative',
      unitsNeeded: 1,
      isUrgent: false,
      type: 'scheduled',
      requirementLabel: 'O- Negative · Scheduled Drive',
      address: 'Base Hospital Rd, Balangoda',
      contactNumber: '+94 45 228 7222',
      patientCase: 'Community Blood Drive - Reserve replenishment for pediatric ward.',
    },
  ],
  activeMission: {
    id: 'mission-active-01',
    hospitalName: 'Sabaragamuwa General Hospital',
    unitDepartment: 'Emergency Trauma Unit',
    bloodGroup: 'O- Negative',
    unitsNeeded: 1,
    estimatedArrival: '~15 mins',
    status: 'En Route',
    coordinatorName: 'Dr. Nirmal Weerasinghe',
    coordinatorPhone: '+94 77 123 4567',
    fastPassToken: '#BL-8921',
    steps: [
      {
        id: 'step-1',
        title: 'Accepted Request',
        time: '14:10',
        status: 'completed',
      },
      {
        id: 'step-2',
        title: 'En Route to Hospital',
        status: 'in_progress',
        badgeText: 'In Progress',
      },
      {
        id: 'step-3',
        title: 'Arrive & Donate',
        status: 'upcoming',
        badgeText: 'Upcoming',
      },
    ],
  },
};

export async function fetchRequestsData(): Promise<RequestsData> {
  if (USE_MOCK) {
    await wait(250);
    return JSON.parse(JSON.stringify(mockRequestsData));
  }

  const response = await fetch(`${API_BASE_URL}/requests/me`);
  if (!response.ok) {
    throw new Error('Failed to fetch requests data');
  }
  return response.json();
}

export async function respondToAlertRequest(
  _requestId: string,
  _status: 'accepted' | 'declined'
): Promise<{ success: boolean; message: string }> {
  if (USE_MOCK) {
    await wait(200);
    return { success: true, message: 'Response registered successfully' };
  }
  return { success: true, message: 'Done' };
}

export async function notifyMissionCoordinator(
  _missionId: string,
  _reason: string
): Promise<{ success: boolean; message: string }> {
  if (USE_MOCK) {
    await wait(200);
    return { success: true, message: 'Coordinator has been notified' };
  }
  return { success: true, message: 'Done' };
}
