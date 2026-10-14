import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import {
  Ionicons,
  Feather,
} from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DonorBottomNav, { DonorTab } from '../components/DonorBottomNav';

// TypeScript interfaces for dummy data
export interface EmergencyMatchData {
  hospitalName: string;
  bloodGroup: string;
  distance: string;
  details: string;
  requiredUnits: number;
}

export interface BloodRequestItem {
  id: string;
  hospitalName: string;
  bloodGroup: string;
  priority: 'Emergency' | 'Critical' | 'Urgent';
  distance: string;
  status: 'available' | 'en_route';
}

export interface DonorProfileData {
  name: string;
  initials: string;
  isVerified: boolean;
  bloodGroup: string;
  rhGroup: string;
  authorityVerified: boolean;
  lastDonationDate: string;
  nextEligibleStatus: string;
  qualificationInterval: string;
  totalDonations: number;
  monthlyGain: number;
  urgentRequestsCount: number;
  matchedRequestsCount: number;
}

// Dummy initial data
const DUMMY_DONOR: DonorProfileData = {
  name: 'Kavindu Perera',
  initials: 'KP',
  isVerified: true,
  bloodGroup: 'O-',
  rhGroup: 'O Rh-',
  authorityVerified: true,
  lastDonationDate: '15 May 2025',
  nextEligibleStatus: 'Available Now',
  qualificationInterval: 'Qualified · 3-Mo Gap',
  totalDonations: 7,
  monthlyGain: 1,
  urgentRequestsCount: 6,
  matchedRequestsCount: 2,
};

const DUMMY_EMERGENCY_MATCH: EmergencyMatchData = {
  hospitalName: 'Sabaragamuwa GH',
  bloodGroup: 'O-',
  distance: '~7 KM AWAY',
  details: 'Needs O- · 5 units urgently for trauma ICU',
  requiredUnits: 5,
};

const DUMMY_REQUESTS: BloodRequestItem[] = [
  {
    id: 'req-1',
    hospitalName: 'Sabaragamuwa GH',
    bloodGroup: 'O-',
    priority: 'Emergency',
    distance: '~7 km',
    status: 'available',
  },
  {
    id: 'req-2',
    hospitalName: 'Teaching Hospital Ratnapura',
    bloodGroup: 'O-',
    priority: 'Critical',
    distance: '~5.7 km',
    status: 'available',
  },
  {
    id: 'req-3',
    hospitalName: 'District Base Hospital',
    bloodGroup: 'O-',
    priority: 'Emergency',
    distance: '~3.2 km',
    status: 'en_route',
  },
];

interface HomeScreenProps {
  initialTab?: DonorTab;
  onNavigateToRequests?: () => void;
  onNavigateToBanks?: () => void;
  onNavigateToHistory?: () => void;
  onNavigateToProfile?: () => void;
  onLogout?: () => void;
}

type TabKey = DonorTab;

export const HomeScreen: React.FC<HomeScreenProps> = ({
  initialTab = 'Home',
  onNavigateToRequests,
  onNavigateToBanks,
  onNavigateToHistory,
  onNavigateToProfile,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [showEmergencyCard, setShowEmergencyCard] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<BloodRequestItem | null>(null);
  const [responseModalVisible, setResponseModalVisible] = useState(false);
  const [emergencyModalVisible, setEmergencyModalVisible] = useState(false);
  const [requestsList, setRequestsList] = useState<BloodRequestItem[]>(DUMMY_REQUESTS);

  const handleRespondToRequest = (item: BloodRequestItem) => {
    setSelectedRequest(item);
    setResponseModalVisible(true);
  };

  const handleConfirmEnRoute = (requestId: string) => {
    setRequestsList((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: 'en_route' } : r))
    );
    setResponseModalVisible(false);
    setEmergencyModalVisible(false);
    Alert.alert(
      'En Route Confirmed',
      'The hospital staff has been alerted that you are on your way. Thank you for saving lives!',
      [{ text: 'OK' }]
    );
  };

  const handleTabPress = (tab: TabKey) => {
    setActiveTab(tab);
    if (tab === 'Requests' && onNavigateToRequests) onNavigateToRequests();
    if (tab === 'Banks' && onNavigateToBanks) onNavigateToBanks();
    if (tab === 'History' && onNavigateToHistory) onNavigateToHistory();
    if (tab === 'Profile' && onNavigateToProfile) onNavigateToProfile();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* TOP HEADER */}
      <View style={styles.headerContainer}>
        <View style={styles.headerLeft}>
          <Text style={styles.welcomeSubtext}>Welcome back</Text>
          <View style={styles.userNameRow}>
            <Text style={styles.userNameText}>{DUMMY_DONOR.name}</Text>
            {DUMMY_DONOR.isVerified && (
              <View style={styles.verifiedBadgeContainer}>
                <Ionicons name="checkmark-circle" size={20} color="#0284C7" />
              </View>
            )}
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.notificationBellBtn}
            accessibilityRole="button"
            accessibilityLabel="Notifications, 5 unread"
            activeOpacity={0.75}
            onPress={() => Alert.alert('Notifications', 'You have 5 unread blood requests and announcements.')}
          >
            <Ionicons name="notifications-outline" size={21} color="#334155" />
            <View style={styles.notificationDot} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.userAvatarBtn}
            accessibilityRole="button"
            accessibilityLabel="Open your profile"
            activeOpacity={0.8}
            onPress={() => handleTabPress('Profile')}
          >
            <Text style={styles.avatarInitialsText}>{DUMMY_DONOR.initials}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* MAIN SCROLLABLE CONTENT */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. EMERGENCY MATCH ALERT CARD */}
        {showEmergencyCard && (
          <View style={styles.emergencyCard}>
            {/* Decorative Background Circles */}
            <View style={styles.bgDecorativeCircleOne} />
            <View style={styles.bgDecorativeCircleTwo} />

            {/* Top Badges Row */}
            <View style={styles.emergencyTopRow}>
              <View style={styles.emergencyPillBadge}>
                <View style={styles.pulsingWhiteDot} />
                <Text style={styles.emergencyPillText}>EMERGENCY MATCH</Text>
                <Ionicons name="location-sharp" size={11} color="#FFFFFF" style={styles.pinIcon} />
                <Text style={styles.emergencyPillText}>{DUMMY_EMERGENCY_MATCH.distance}</Text>
              </View>

              <View style={styles.bloodTypeNeededBadge}>
                <Text style={styles.bloodTypeNeededText}>{DUMMY_EMERGENCY_MATCH.bloodGroup}</Text>
                <Text style={styles.neededLabelText}>NEEDED</Text>
              </View>
            </View>

            {/* Hospital Name & Urgent Subtitle */}
            <Text style={styles.emergencyHospitalName}>
              {DUMMY_EMERGENCY_MATCH.hospitalName}
            </Text>
            <View style={styles.emergencyDetailsRow}>
              <View style={styles.amberWarningDot} />
              <Text style={styles.emergencyDetailsText}>
                {DUMMY_EMERGENCY_MATCH.details}
              </Text>
            </View>

            {/* Actions Row */}
            <View style={styles.emergencyActionsRow}>
              <TouchableOpacity
                style={styles.respondNowButton}
                accessibilityRole="button"
                activeOpacity={0.9}
                onPress={() => setEmergencyModalVisible(true)}
              >
                <Text style={styles.respondNowButtonText}>Respond Now</Text>
                <Ionicons name="arrow-forward" size={16} color="#BA1328" style={styles.arrowIcon} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dismissEmergencyBtn}
                accessibilityRole="button"
                accessibilityLabel="Dismiss emergency request"
                activeOpacity={0.7}
                onPress={() => setShowEmergencyCard(false)}
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 2. DONATION ELIGIBILITY (DARK CARD) */}
        <View style={styles.eligibilityCard}>
          {/* Top Eligibility Status */}
          <View style={styles.eligibilityTopRow}>
            <View style={styles.eligibilityLabelRow}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#10B981" />
              <Text style={styles.eligibilityLabelText}>DONATION ELIGIBILITY</Text>
            </View>

            <View style={styles.qualifiedBadge}>
              <View style={styles.greenQualifiedDot} />
              <Text style={styles.qualifiedBadgeText}>
                {DUMMY_DONOR.qualificationInterval}
              </Text>
            </View>
          </View>

          {/* Heading and Description */}
          <Text style={styles.eligibleHeading}>Eligible to Donate Blood</Text>
          <Text style={styles.eligibleSubtitle}>
            Recovery period fulfilled. Your units can save lives today.
          </Text>

          {/* Donor Blood Group Box */}
          <View style={styles.donorGroupBox}>
            <View style={styles.donorBloodBadgeWrapper}>
              <View style={styles.donorBloodBadge}>
                <Text style={styles.donorBloodBadgeText}>{DUMMY_DONOR.bloodGroup}</Text>
              </View>
              {DUMMY_DONOR.authorityVerified && (
                <View style={styles.badgeCheckCircle}>
                  <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                </View>
              )}
            </View>

            <View style={styles.donorGroupInfo}>
              <View style={styles.donorGroupNameRow}>
                <Text style={styles.donorGroupNameText}>Universal Donor Group</Text>
                <View style={styles.rhPillBadge}>
                  <Text style={styles.rhPillText}>{DUMMY_DONOR.rhGroup}</Text>
                </View>
              </View>

              <View style={styles.authorityVerifiedRow}>
                <Ionicons name="checkmark-circle" size={13} color="#10B981" />
                <Text style={styles.authorityVerifiedText}>
                  Verified by Health Authority
                </Text>
              </View>
            </View>
          </View>

          {/* Date Information Grid */}
          <View style={styles.eligibilityDateRow}>
            <View style={styles.lastDonationBox}>
              <Text style={styles.dateLabelMuted}>LAST DONATION</Text>
              <View style={styles.dateValueRow}>
                <View style={styles.grayDot} />
                <Text style={styles.dateValueTextWhite}>
                  {DUMMY_DONOR.lastDonationDate}
                </Text>
              </View>
            </View>

            <View style={styles.nextEligibleBox}>
              <Text style={styles.nextDateLabelGreen}>NEXT ELIGIBLE DATE</Text>
              <View style={styles.dateValueRow}>
                <View style={styles.brightGreenDot} />
                <Text style={styles.nextDateValueGreen}>
                  {DUMMY_DONOR.nextEligibleStatus}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 3. METRIC STATS CARDS (SIDE-BY-SIDE GRID) */}
        <View style={styles.statsGridRow}>
          {/* Left Card: Total Donations */}
          <View style={styles.statCardPink}>
            <View style={styles.statCardTopRow}>
              <View style={styles.waterDropIconCircle}>
                <Ionicons name="water" size={17} color="#E11D48" />
              </View>
              <View style={styles.lifesaverBadge}>
                <Text style={styles.lifesaverBadgeText}>LIFESAVER</Text>
              </View>
            </View>

            <View style={styles.metricRow}>
              <Text style={styles.metricNumberLarge}>{DUMMY_DONOR.totalDonations}</Text>
              <Text style={styles.metricUnitsMuted}>units given</Text>
            </View>

            <Text style={styles.statCardTitle}>Total Donations</Text>

            <View style={styles.statCardBottomRow}>
              <View style={styles.trendRow}>
                <Feather name="trending-up" size={13} color="#10B981" />
                <Text style={styles.trendText}>+{DUMMY_DONOR.monthlyGain} this mo</Text>
              </View>

              <View style={styles.carouselDotsRow}>
                <View style={[styles.carouselDot, styles.carouselDotActive]} />
                <View style={[styles.carouselDot, styles.carouselDotActive]} />
                <View style={[styles.carouselDot, styles.carouselDotActive]} />
                <View style={[styles.carouselDot, styles.carouselDotInactive]} />
              </View>
            </View>
          </View>

          {/* Right Card: Urgent Requests */}
          <View style={styles.statCardAmber}>
            <View style={styles.statCardTopRow}>
              <View style={styles.warningIconCircle}>
                <Ionicons name="warning-outline" size={17} color="#D97706" />
              </View>
              <View style={styles.activeLiveBadge}>
                <View style={styles.amberLiveDot} />
                <Text style={styles.activeLiveBadgeText}>Active Live</Text>
              </View>
            </View>

            <View style={styles.metricRow}>
              <Text style={styles.metricNumberLarge}>
                {DUMMY_DONOR.urgentRequestsCount}
              </Text>
              <Text style={styles.metricMatchedAmber}>
                {DUMMY_DONOR.matchedRequestsCount} matched
              </Text>
            </View>

            <Text style={styles.statCardTitle}>Urgent Requests</Text>

            <View style={styles.statCardBottomRow}>
              <View style={styles.nearYouRow}>
                <Ionicons name="location-outline" size={13} color="#D97706" />
                <Text style={styles.nearYouText}>Near you (&lt;10km)</Text>
              </View>

              <View style={styles.amberSolidIndicator} />
            </View>
          </View>
        </View>

        {/* 4. ACTIVE BLOOD REQUESTS NEARBY SECTION */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitleText}>Active Blood Requests Nearby</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => Alert.alert('Nearby Requests', 'Showing all 6 active verified blood requests within 25km radius.')}
          >
            <Text style={styles.seeAllLinkText}>See all (6)</Text>
          </TouchableOpacity>
        </View>

        {/* REQUESTS LIST */}
        <View style={styles.requestsListContainer}>
          {requestsList.map((item) => {
            const isEnRoute = item.status === 'en_route';
            const isCritical = item.priority === 'Critical';

            return (
              <View key={item.id} style={styles.requestCard}>
                {/* Left Blood Group Badge */}
                <View style={styles.requestBloodBadge}>
                  <Text style={styles.requestBloodText}>{item.bloodGroup}</Text>
                </View>

                {/* Center Details */}
                <View style={styles.requestInfoCenter}>
                  <Text style={styles.requestHospitalTitle}>
                    {item.hospitalName}
                  </Text>
                  <View style={styles.requestTagsRow}>
                    <View
                      style={[
                        styles.priorityPill,
                        isCritical ? styles.priorityPillCritical : styles.priorityPillEmergency,
                      ]}
                    >
                      <Text
                        style={[
                          styles.priorityText,
                          isCritical ? styles.priorityTextCritical : styles.priorityTextEmergency,
                        ]}
                      >
                        {item.priority}
                      </Text>
                    </View>
                    <Text style={styles.distanceMutedText}>{item.distance}</Text>
                  </View>
                </View>

                {/* Right Action */}
                <View style={styles.requestActionRight}>
                  {isEnRoute ? (
                    <View style={styles.enRouteBadge}>
                      <View style={styles.enRouteGreenDot} />
                      <Text style={styles.enRouteText}>EN ROUTE</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.respondLinkBtn}
                      accessibilityRole="button"
                      accessibilityLabel={`Respond to ${item.hospitalName}`}
                      activeOpacity={0.7}
                      onPress={() => handleRespondToRequest(item)}
                    >
                      <Text style={styles.respondLinkText}>Respond</Text>
                      <Ionicons name="chevron-forward" size={14} color="#C5162E" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>

      </ScrollView>

      <DonorBottomNav activeTab={activeTab} onSelect={handleTabPress} />

      {/* MODAL: EMERGENCY DONATION CONFIRMATION */}
      <Modal
        visible={emergencyModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEmergencyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalEmergencyBadge}>
                <Text style={styles.modalEmergencyBadgeText}>EMERGENCY MATCH</Text>
              </View>
              <TouchableOpacity
                onPress={() => setEmergencyModalVisible(false)}
                style={styles.modalCloseBtn}
                accessibilityRole="button"
                accessibilityLabel="Close request details"
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalHospitalTitle}>
              {DUMMY_EMERGENCY_MATCH.hospitalName}
            </Text>
            <Text style={styles.modalDescription}>
              Trauma ICU requires 5 urgent units of O- blood. Your registered profile matches the exact criteria.
            </Text>

            <View style={styles.modalInfoBox}>
              <View style={styles.modalInfoItem}>
                <Ionicons name="location" size={16} color="#C5162E" />
                <Text style={styles.modalInfoText}>Distance: ~7 km away</Text>
              </View>
              <View style={styles.modalInfoItem}>
                <Ionicons name="water" size={16} color="#C5162E" />
                <Text style={styles.modalInfoText}>Target Group: O- (Universal Donor)</Text>
              </View>
              <View style={styles.modalInfoItem}>
                <Ionicons name="shield-checkmark" size={16} color="#10B981" />
                <Text style={styles.modalInfoText}>Donor Eligibility: Qualified</Text>
              </View>
            </View>

            <View style={styles.modalActionButtons}>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                accessibilityRole="button"
                activeOpacity={0.85}
                onPress={() => handleConfirmEnRoute('req-1')}
              >
                <Text style={styles.modalConfirmBtnText}>Confirm Donation &amp; Go En Route</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCancelBtn}
                accessibilityRole="button"
                activeOpacity={0.8}
                onPress={() => setEmergencyModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>Decline for Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: STANDARD BLOOD REQUEST RESPONSE */}
      <Modal
        visible={responseModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setResponseModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalHeaderRow}>
              <View
                style={[
                  styles.priorityPill,
                  selectedRequest?.priority === 'Critical'
                    ? styles.priorityPillCritical
                    : styles.priorityPillEmergency,
                ]}
              >
                <Text
                  style={[
                    styles.priorityText,
                    selectedRequest?.priority === 'Critical'
                      ? styles.priorityTextCritical
                      : styles.priorityTextEmergency,
                  ]}
                >
                  {selectedRequest?.priority} REQUEST
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setResponseModalVisible(false)}
                style={styles.modalCloseBtn}
                accessibilityRole="button"
                accessibilityLabel="Close request details"
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalHospitalTitle}>
              {selectedRequest?.hospitalName}
            </Text>
            <Text style={styles.modalDescription}>
              The hospital requires blood donation for patients under immediate care.
            </Text>

            <View style={styles.modalInfoBox}>
              <View style={styles.modalInfoItem}>
                <Ionicons name="location" size={16} color="#C5162E" />
                <Text style={styles.modalInfoText}>Distance: {selectedRequest?.distance}</Text>
              </View>
              <View style={styles.modalInfoItem}>
                <Ionicons name="water" size={16} color="#C5162E" />
                <Text style={styles.modalInfoText}>Blood Type: {selectedRequest?.bloodGroup}</Text>
              </View>
            </View>

            <View style={styles.modalActionButtons}>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                accessibilityRole="button"
                activeOpacity={0.85}
                onPress={() => selectedRequest && handleConfirmEnRoute(selectedRequest.id)}
              >
                <Text style={styles.modalConfirmBtnText}>Accept &amp; Mark as En Route</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCancelBtn}
                accessibilityRole="button"
                activeOpacity={0.8}
                onPress={() => setResponseModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  headerLeft: {
    flex: 1,
  },
  welcomeSubtext: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    paddingRight: 4,
  },
  userNameText: {
    fontSize: 21,
    fontWeight: '600',
    color: '#0F172A',
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  verifiedBadgeContainer: {
    marginLeft: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  notificationBellBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  userAvatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#B91C1C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialsText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 24,
  },

  /* 1. EMERGENCY MATCH CARD */
  emergencyCard: {
    marginHorizontal: 18,
    marginTop: 4,
    borderRadius: 24,
    backgroundColor: '#B91C1C',
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  bgDecorativeCircleOne: {
    position: 'absolute',
    top: -40,
    right: -20,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
  },
  bgDecorativeCircleTwo: {
    position: 'absolute',
    bottom: -60,
    right: 40,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
  },
  emergencyTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  emergencyPillBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.24)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    flexWrap: 'wrap',
    rowGap: 4,
    maxWidth: '77%',
  },
  pulsingWhiteDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    marginRight: 6,
  },
  pinIcon: {
    marginLeft: 8,
    marginRight: 2,
  },
  emergencyPillText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  bloodTypeNeededBadge: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bloodTypeNeededText: {
    color: '#B91C1C',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  neededLabelText: {
    color: '#0F172A',
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  emergencyHospitalName: {
    fontSize: 21,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  emergencyDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  amberWarningDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FBBF24',
    marginRight: 6,
  },
  emergencyDetailsText: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    lineHeight: 19,
  },
  emergencyActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
  },
  respondNowButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  respondNowButtonText: {
    color: '#B91C1C',
    fontSize: 15,
    fontWeight: '700',
  },
  arrowIcon: {
    marginLeft: 6,
  },
  dismissEmergencyBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* 2. DONATION ELIGIBILITY CARD (DARK) */
  eligibilityCard: {
    marginHorizontal: 18,
    marginTop: 14,
    borderRadius: 24,
    backgroundColor: '#09111E',
    padding: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  eligibilityTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    rowGap: 8,
    columnGap: 8,
  },
  eligibilityLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eligibilityLabelText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginLeft: 6,
  },
  qualifiedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  greenQualifiedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  qualifiedBadgeText: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: '700',
  },
  eligibleHeading: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '600',
    marginTop: 14,
    letterSpacing: -0.2,
    lineHeight: 26,
  },
  eligibleSubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  donorGroupBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 12,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  donorBloodBadgeWrapper: {
    position: 'relative',
  },
  donorBloodBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFF1F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donorBloodBadgeText: {
    color: '#E11D48',
    fontSize: 18,
    fontWeight: '700',
  },
  badgeCheckCircle: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: '#09111E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donorGroupInfo: {
    marginLeft: 12,
    flex: 1,
  },
  donorGroupNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    rowGap: 5,
  },
  donorGroupNameText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  rhPillBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    marginLeft: 8,
  },
  rhPillText: {
    color: '#C5162E',
    fontSize: 10,
    fontWeight: '700',
  },
  authorityVerifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  authorityVerifiedText: {
    color: '#10B981',
    fontSize: 11.5,
    fontWeight: '600',
    marginLeft: 4,
  },
  eligibilityDateRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  lastDonationBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    padding: 12,
  },
  dateLabelMuted: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dateValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  grayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#64748B',
    marginRight: 6,
  },
  dateValueTextWhite: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
  },
  nextEligibleBox: {
    flex: 1,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderRadius: 12,
    padding: 12,
  },
  nextDateLabelGreen: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  brightGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  nextDateValueGreen: {
    color: '#34D399',
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
  },

  /* 3. METRIC STATS CARDS */
  statsGridRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 18,
    marginTop: 14,
  },
  statCardPink: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#FFE4E6',
    borderRadius: 20,
    padding: 12,
    minWidth: 0,
  },
  statCardAmber: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#FEF08A',
    borderRadius: 20,
    padding: 12,
    minWidth: 0,
  },
  statCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  waterDropIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lifesaverBadge: {
    backgroundColor: '#FFE4E6',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  lifesaverBadgeText: {
    color: '#BE123C',
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  warningIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeLiveBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  amberLiveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#D97706',
    marginRight: 4,
  },
  activeLiveBadgeText: {
    color: '#B45309',
    fontSize: 9.5,
    fontWeight: '700',
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 12,
  },
  metricNumberLarge: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 32,
  },
  metricUnitsMuted: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 4,
    marginBottom: 3,
    fontWeight: '500',
  },
  metricMatchedAmber: {
    fontSize: 12,
    color: '#92400E',
    marginLeft: 4,
    marginBottom: 3,
    fontWeight: '700',
  },
  statCardTitle: {
    color: '#0F172A',
    fontSize: 13.5,
    fontWeight: '700',
    marginTop: 2,
  },
  statCardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    flexWrap: 'wrap',
    gap: 6,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendText: {
    color: '#087B52',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 3,
  },
  carouselDotsRow: {
    flexDirection: 'row',
    gap: 3.5,
    alignItems: 'center',
  },
  carouselDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  carouselDotActive: {
    backgroundColor: '#E11D48',
  },
  carouselDotInactive: {
    backgroundColor: '#CBD5E1',
  },
  nearYouRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nearYouText: {
    color: '#92400E',
    fontSize: 10.5,
    fontWeight: '700',
    marginLeft: 2,
  },
  amberSolidIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
  },

  /* 4. ACTIVE BLOOD REQUESTS SECTION */
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 18,
    marginTop: 24,
    marginBottom: 12,
    gap: 10,
  },
  sectionTitleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    letterSpacing: -0.2,
    lineHeight: 22,
    flex: 1,
  },
  seeAllLinkText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#C5162E',
  },
  requestsListContainer: {
    marginHorizontal: 18,
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestBloodBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF1F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestBloodText: {
    color: '#E11D48',
    fontSize: 16,
    fontWeight: '700',
  },
  requestInfoCenter: {
    flex: 1,
    marginLeft: 10,
    marginRight: 6,
    minWidth: 0,
  },
  requestHospitalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    lineHeight: 20,
  },
  requestTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
    rowGap: 5,
  },
  priorityPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priorityPillEmergency: {
    backgroundColor: '#FFE4E6',
  },
  priorityPillCritical: {
    backgroundColor: '#FEF3C7',
  },
  priorityText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  priorityTextEmergency: {
    color: '#E11D48',
  },
  priorityTextCritical: {
    color: '#92400E',
  },
  distanceMutedText: {
    color: '#64748B',
    fontSize: 12,
    marginLeft: 8,
    fontWeight: '500',
  },
  requestActionRight: {
    alignItems: 'flex-end',
  },
  respondLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    minHeight: 44,
  },
  respondLinkText: {
    color: '#C5162E',
    fontSize: 13.5,
    fontWeight: '700',
    marginRight: 2,
  },
  enRouteBadge: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  enRouteGreenDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
    marginRight: 5,
  },
  enRouteText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },

  /* MODALS */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContentCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 36,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalEmergencyBadge: {
    backgroundColor: '#FFE4E6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  modalEmergencyBadgeText: {
    color: '#E11D48',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  modalCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHospitalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 14,
  },
  modalDescription: {
    fontSize: 13.5,
    color: '#64748B',
    marginTop: 6,
    lineHeight: 20,
  },
  modalInfoBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    marginTop: 16,
    gap: 8,
  },
  modalInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalInfoText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  modalActionButtons: {
    marginTop: 20,
    gap: 10,
  },
  modalConfirmBtn: {
    backgroundColor: '#C5162E',
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  modalCancelBtn: {
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  modalCancelBtnText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '700',
  },
});
