// src/requests/types/requests.ts

export type RequestTabType = 'alerts' | 'active';

export interface AlertRequestItem {
  id: string;
  hospitalName: string;
  distance: string;
  timeAgo: string;
  bloodGroup: string;
  unitsNeeded: number;
  isUrgent?: boolean;
  type: 'urgent' | 'standard' | 'scheduled';
  requirementLabel?: string;
  address?: string;
  contactNumber?: string;
  patientCase?: string;
}

export type MissionStepStatus = 'completed' | 'in_progress' | 'upcoming';

export interface MissionStep {
  id: string;
  title: string;
  time?: string;
  status: MissionStepStatus;
  badgeText?: string;
}

export interface ActiveMission {
  id: string;
  hospitalName: string;
  unitDepartment: string;
  bloodGroup: string;
  unitsNeeded: number;
  estimatedArrival: string;
  status: string;
  coordinatorName: string;
  coordinatorPhone: string;
  fastPassToken: string;
  steps: MissionStep[];
}

export interface RequestsData {
  donorInitials: string;
  donorName: string;
  unreadAlertsCount: number;
  activeCount: number;
  alerts: AlertRequestItem[];
  activeMission: ActiveMission | null;
}
