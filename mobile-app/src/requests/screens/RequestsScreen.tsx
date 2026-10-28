// src/requests/screens/RequestsScreen.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import DonorBottomNav, { DonorTab } from '../../components/DonorBottomNav';
import {
  RequestsHeader,
  RequestsTabs,
  AlertRequestCard,
  DonationRecommendationCard,
  ActiveMissionCard,
  MissionProgressCard,
  FastPassTokenCard,
  NotifyCoordinatorModal,
  RequestDetailModal,
} from '../components';
import { useBloodRequests } from '../hooks/useBloodRequests';
import { RequestTabType } from '../types/requests';

interface RequestsScreenProps {
  initialTab?: RequestTabType;
  onNavigateTab?: (tab: DonorTab) => void;
  onNavigateToProfile?: () => void;
}

export const RequestsScreen: React.FC<RequestsScreenProps> = ({
  initialTab = 'alerts',
  onNavigateTab,
  onNavigateToProfile,
}) => {
  const {
    activeTab,
    setActiveTab,
    data,
    loading,
    refreshing,
    refresh,
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
  } = useBloodRequests(initialTab);

  const handleTabPress = (tab: DonorTab) => {
    if (tab !== 'Requests' && onNavigateTab) {
      onNavigateTab(tab);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      {/* Screen Header */}
      <RequestsHeader
        initials={data?.donorInitials || 'KP'}
        onAvatarPress={onNavigateToProfile}
      />

      {/* Segmented Control Switcher */}
      <RequestsTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        alertsCount={data?.unreadAlertsCount ?? 3}
        activeCount={data?.activeCount ?? 1}
      />

      {/* Main Content Area */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#BA1328" />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor="#BA1328"
              colors={['#BA1328']}
            />
          }
        >
          {activeTab === 'alerts' ? (
            /* ================= WINDOW 1: NEW ALERTS ================= */
            <View style={styles.alertsContainer}>
              {data?.alerts.map((item) => (
                <AlertRequestCard
                  key={item.id}
                  item={item}
                  onPress={handleOpenDetails}
                />
              ))}

              {/* Bottom Reminder Note */}
              <DonationRecommendationCard />
            </View>
          ) : (
            /* ================= WINDOW 2: ACTIVE MISSION ================= */
            <View style={styles.activeContainer}>
              {data?.activeMission ? (
                <>
                  {/* Top Dispatch Mission Card */}
                  <ActiveMissionCard
                    mission={data.activeMission}
                    onDirectionsPress={handleOpenDirections}
                    onCoordinatorPress={() => setIsCoordinatorModalOpen(true)}
                  />

                  {/* Mission Progress Vertical Stepper */}
                  <MissionProgressCard steps={data.activeMission.steps} />

                  {/* Fast Pass Token Card */}
                  <FastPassTokenCard token={data.activeMission.fastPassToken} />

                  {/* Unable to make it? Notify Coordinator footer */}
                  <View style={styles.footerLinkContainer}>
                    <Text style={styles.footerLinkText}>Unable to make it? </Text>
                    <TouchableOpacity
                      onPress={() => setIsCoordinatorModalOpen(true)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                    >
                      <Text style={styles.notifyLinkText}>Notify Coordinator</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <View style={styles.emptyMissionCard}>
                  <View style={styles.emptyIconCircle}>
                    <Ionicons name="shield-checkmark-outline" size={38} color="#94A3B8" />
                  </View>
                  <Text style={styles.emptyMissionTitle}>No Active Mission</Text>
                  <Text style={styles.emptyMissionDesc}>
                    When you accept an urgent blood request alert, your dispatch mission and real-time hospital coordinator details will appear here.
                  </Text>
                  <TouchableOpacity
                    style={styles.browseButton}
                    onPress={() => setActiveTab('alerts')}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.browseButtonText}>Browse Available Alerts</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* Bottom Navigation Bar */}
      <DonorBottomNav activeTab="Requests" onSelect={handleTabPress} />

      {/* Detail / Respond Modal */}
      <RequestDetailModal
        visible={isDetailModalOpen}
        request={selectedRequest}
        onClose={handleCloseDetails}
        onRespond={handleRespondToRequest}
      />

      {/* Notify Coordinator Modal */}
      <NotifyCoordinatorModal
        visible={isCoordinatorModalOpen}
        coordinatorName={data?.activeMission?.coordinatorName}
        coordinatorPhone={data?.activeMission?.coordinatorPhone}
        onClose={() => setIsCoordinatorModalOpen(false)}
        onSubmit={handleSendCoordinatorNotification}
        onCall={handleCallCoordinator}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertsContainer: {
    flex: 1,
  },
  activeContainer: {
    flex: 1,
  },
  footerLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  footerLinkText: {
    fontSize: 13.5,
    color: '#475569',
    fontWeight: '500',
  },
  notifyLinkText: {
    fontSize: 13.5,
    color: '#BA1328',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  emptyMissionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyMissionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  emptyMissionDesc: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  browseButton: {
    backgroundColor: '#BA1328',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 10,
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
export default RequestsScreen;
