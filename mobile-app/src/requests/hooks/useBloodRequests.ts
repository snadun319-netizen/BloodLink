// src/requests/hooks/useBloodRequests.ts
import { useState, useEffect, useCallback } from 'react';
import { Alert, Linking } from 'react-native';
import { RequestTabType, RequestsData, AlertRequestItem } from '../types/requests';
import {
  fetchRequestsData,
  respondToAlertRequest,
  notifyMissionCoordinator,
} from '../services/requestsService';

export function useBloodRequests(initialTab: RequestTabType = 'alerts') {
  const [activeTab, setActiveTab] = useState<RequestTabType>(initialTab);
  const [data, setData] = useState<RequestsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals state
  const [selectedRequest, setSelectedRequest] = useState<AlertRequestItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCoordinatorModalOpen, setIsCoordinatorModalOpen] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const result = await fetchRequestsData();
      setData(result);
    } catch {
      Alert.alert('Error', 'Unable to load blood requests at this moment.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenDetails = (request: AlertRequestItem) => {
    setSelectedRequest(request);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetails = () => {
    setIsDetailModalOpen(false);
  };

  const handleRespondToRequest = async (request: AlertRequestItem) => {
    await respondToAlertRequest(request.id, 'accepted');
    setIsDetailModalOpen(false);
    Alert.alert(
      'Mission Initiated',
      `Thank you for responding! You have been marked en route to ${request.hospitalName}.`,
      [
        {
          text: 'View Active Mission',
          onPress: () => setActiveTab('active'),
        },
      ]
    );
  };

  const handleOpenDirections = () => {
    const hospital = data?.activeMission?.hospitalName || 'Sabaragamuwa General Hospital';
    Alert.alert(
      'Navigation Route',
      `Opening GPS turn-by-turn directions to ${hospital}...`,
      [
        {
          text: 'Open Maps',
          onPress: () => {
            const query = encodeURIComponent(`${hospital}, Sri Lanka`);
            Linking.openURL(`https://maps.google.com/?q=${query}`).catch(() => {
              Alert.alert('Map Unavailable', 'Unable to launch map application.');
            });
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleCallCoordinator = () => {
    const phone = data?.activeMission?.coordinatorPhone || '+94 77 123 4567';
    Alert.alert(
      'Contact Coordinator',
      `Call Hospital Dispatch Coordinator at ${phone}?`,
      [
        {
          text: 'Call Now',
          onPress: () => Linking.openURL(`tel:${phone}`).catch(() => {}),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleSendCoordinatorNotification = async (reason: string) => {
    if (data?.activeMission) {
      await notifyMissionCoordinator(data.activeMission.id, reason);
      setIsCoordinatorModalOpen(false);
      Alert.alert('Notification Sent', 'The hospital coordinator has been notified of your status.');
    }
  };

  return {
    activeTab,
    setActiveTab,
    data,
    loading,
    refreshing,
    reload: () => loadData(false),
    refresh: () => loadData(true),
    selectedRequest,
    isDetailModalOpen,
    isCoordinatorModalOpen,
    setIsCoordinatorModalOpen,
    handleOpenDetails,
    handleCloseDetails,
    handleRespondToRequest,
    handleOpenDirections,
    handleCallCoordinator,
    handleSendCoordinatorNotification,
  };
}

export type BloodRequestsState = ReturnType<typeof useBloodRequests>;
