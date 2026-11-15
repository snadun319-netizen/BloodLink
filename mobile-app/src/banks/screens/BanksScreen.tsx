// src/banks/screens/BanksScreen.tsx
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DonorBottomNav, { DonorTab } from '../../components/DonorBottomNav';
import { useTheme } from '../../profile/theme';
import { BloodBanksState } from '../hooks/useBloodBanks';
import { BloodBank, BloodGroup, StockDisplayStatus } from '../types/banks';
import {
  filterBanks,
  formatDistanceKm,
  formatStockUpdated,
  getBankTypeLabel,
  getCriticalStockGroup,
  getDistinctDistricts,
  getNearestBank,
  getNewestStockDate,
  getStockColorTheme,
  getStockStatusLabel,
  sortStocksByUrgency,
} from '../utils/banksFormat';

interface Props {
  state: BloodBanksState;
  onBack?: () => void;
  onNavigateTab?: (tab: DonorTab) => void;
  onNavigateToProfile?: () => void;
}

const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const STOCK_STATUSES: StockDisplayStatus[] = ['CRITICAL', 'LOW', 'GOOD'];

export default function BanksScreen({
  state,
  onNavigateTab,
  onNavigateToProfile,
}: Props) {
  const { colors } = useTheme();
  const { banks, donorInitials, loading, refreshing, error, refresh, reload } = state;

  // Filter & Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [filterBloodGroup, setFilterBloodGroup] = useState<string | null>(null);
  const [filterStockStatus, setFilterStockStatus] = useState<string | null>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Temporary filter modal state
  const [tempBloodGroup, setTempBloodGroup] = useState<string | null>(null);
  const [tempStockStatus, setTempStockStatus] = useState<string | null>(null);

  const districts = useMemo(() => getDistinctDistricts(banks), [banks]);

  const filteredBanks = useMemo(() => {
    return filterBanks(banks, {
      query: searchQuery,
      district: selectedDistrict,
      bloodGroup: filterBloodGroup,
      stockStatus: filterStockStatus,
    });
  }, [banks, searchQuery, selectedDistrict, filterBloodGroup, filterStockStatus]);

  // The nearest bank is the first bank in the filtered list (or all banks if none filtered)
  const nearestBank = useMemo(() => {
    return getNearestBank(filteredBanks) || getNearestBank(banks);
  }, [filteredBanks, banks]);

  const nearestStocks = useMemo(() => {
    if (!nearestBank || !nearestBank.stocks) return [];
    return sortStocksByUrgency(nearestBank.stocks).slice(0, 4);
  }, [nearestBank]);

  const newestStockDate = useMemo(() => {
    if (!nearestBank || !nearestBank.stocks) return null;
    return getNewestStockDate(nearestBank.stocks);
  }, [nearestBank]);

  const nearestCriticalGroup = useMemo(() => {
    if (!nearestBank || !nearestBank.stocks) return null;
    return getCriticalStockGroup(nearestBank.stocks);
  }, [nearestBank]);

  const isFilterActive = Boolean(filterBloodGroup || filterStockStatus);

  const handleOpenFilter = () => {
    setTempBloodGroup(filterBloodGroup);
    setTempStockStatus(filterStockStatus);
    setFilterModalVisible(true);
  };

  const handleApplyFilter = () => {
    setFilterBloodGroup(tempBloodGroup);
    setFilterStockStatus(tempStockStatus);
    setFilterModalVisible(false);
  };

  const handleClearFilter = () => {
    setTempBloodGroup(null);
    setTempStockStatus(null);
    setFilterBloodGroup(null);
    setFilterStockStatus(null);
    setSelectedDistrict(null);
    setSearchQuery('');
    setFilterModalVisible(false);
  };

  const handleCall = (phone?: string | null) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    Linking.openURL(`tel:${cleanPhone}`);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* ─── 1. TOP HEADER ──────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Blood Banks</Text>
        </View>

        <TouchableOpacity
          style={styles.avatarButton}
          accessibilityRole="button"
          accessibilityLabel="Open donor profile"
          activeOpacity={0.8}
          onPress={onNavigateToProfile}
        >
          <Text style={styles.avatarText}>{donorInitials}</Text>
        </TouchableOpacity>
      </View>

      {/* ─── 2. SUBHEADER (Network Status & District Indicator) ────────── */}
      <View style={styles.subheaderRow}>
        <View style={styles.networkBadgeCol}>
          <View style={styles.networkTitleRow}>
            <View style={styles.greenPulseDot} />
            <Text style={styles.networkTitle}>NATIONAL BLOOD NETWORK</Text>
          </View>
          <Text style={styles.networkSubtitle}>Showing nearest certified centers</Text>
        </View>

        <View style={styles.districtIndicatorPill}>
          <Ionicons name="location-outline" size={13} color="#0284C7" />
          <Text style={styles.districtIndicatorText} numberOfLines={1}>
            {selectedDistrict || nearestBank?.district || 'Islandwide'}
          </Text>
        </View>
      </View>

      {/* ─── 3. SEARCH BOX & FILTER BUTTON ──────────────────────────────── */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search-outline" size={18} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search bank, district, address..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.searchClearBtn}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.filterButton, isFilterActive && styles.filterButtonActive]}
          onPress={handleOpenFilter}
          accessibilityRole="button"
          accessibilityLabel="Open filters"
          activeOpacity={0.75}
        >
          <Text style={[styles.filterButtonText, isFilterActive && styles.filterButtonTextActive]}>
            Filter
          </Text>
          {isFilterActive && <View style={styles.filterDot} />}
        </TouchableOpacity>
      </View>

      {/* ─── 4. DISTRICT CHIPS ──────────────────────────────────────────── */}
      {districts.length > 0 && (
        <View style={styles.districtChipsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.districtChipsScroll}
          >
            <TouchableOpacity
              style={[
                styles.districtChip,
                selectedDistrict === null && styles.districtChipSelected,
              ]}
              onPress={() => setSelectedDistrict(null)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.districtChipText,
                  selectedDistrict === null && styles.districtChipTextSelected,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>

            {districts.map((district) => {
              const isSelected = selectedDistrict?.toLowerCase() === district.toLowerCase();
              return (
                <TouchableOpacity
                  key={district}
                  style={[styles.districtChip, isSelected && styles.districtChipSelected]}
                  onPress={() => {
                    setSelectedDistrict(isSelected ? null : district);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.districtChipText,
                      isSelected && styles.districtChipTextSelected,
                    ]}
                  >
                    {district}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ─── MAIN SCROLLABLE CONTENT ────────────────────────────────────── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            colors={['#C5162E']}
            tintColor="#C5162E"
          />
        }
      >
        {/* Loading state */}
        {loading && !refreshing && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#C5162E" />
            <Text style={styles.loadingText}>Locating blood banks & stock levels...</Text>
          </View>
        )}

        {/* Error state */}
        {!loading && error && banks.length === 0 && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={42} color="#DC2626" />
            <Text style={styles.errorTitle}>Unable to Load Blood Banks</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={reload} activeOpacity={0.8}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Content when ready */}
        {!loading && (!error || banks.length > 0) && (
          <>
            {/* ─── 5. MAP CARD (STATIC STYLED PLACEHOLDER) ──────────────── */}
            {nearestBank && (
              <View style={styles.mapCardContainer}>
                {/* Visual Map Canvas Placeholder */}
                <View style={styles.mapCanvas}>
                  {/* Grid / Road Lines */}
                  <View style={styles.mapGridLineH1} />
                  <View style={styles.mapGridLineH2} />
                  <View style={styles.mapGridLineV1} />
                  <View style={styles.mapGridLineV2} />
                  <View style={styles.mapMainRoad} />
                  <View style={styles.mapSecondaryRoad} />
                  <View style={styles.mapRiverLine} />

                  {/* Center Pulse Pin */}
                  <View style={styles.centerPinHalo} />
                  <View style={styles.centerPinCircle}>
                    <Ionicons name="add" size={14} color="#FFFFFF" />
                  </View>

                  {/* Secondary Pins */}
                  <View style={styles.topRightPinCircle}>
                    <Ionicons name="add" size={11} color="#FFFFFF" />
                  </View>
                  <View style={styles.bottomLeftPinCircle}>
                    <Ionicons name="add" size={11} color="#FFFFFF" />
                  </View>

                  {/* Top-left Badge: "N Blood Banks Nearby" */}
                  <View style={styles.mapNearbyBadge}>
                    <View style={styles.redBadgeDot} />
                    <Text style={styles.mapNearbyBadgeText}>
                      {banks.length} Blood Banks Nearby
                    </Text>
                  </View>

                  {/* Top-right Zoom Controls */}
                  <View style={styles.mapZoomControls}>
                    <View style={styles.mapZoomBtn}>
                      <Ionicons name="add" size={16} color="#475569" />
                    </View>
                    <View style={styles.mapZoomDivider} />
                    <View style={styles.mapZoomBtn}>
                      <Ionicons name="remove" size={16} color="#475569" />
                    </View>
                  </View>

                  {/* Bottom Overlay Card inside Map */}
                  <View style={styles.mapBottomCard}>
                    <View style={styles.mapBottomCardLeft}>
                      <View style={styles.mapBottomCardTitleRow}>
                        <View style={styles.redCardDot} />
                        <Text style={styles.mapBottomCardName} numberOfLines={1}>
                          {nearestBank.name}
                        </Text>
                      </View>
                      {nearestBank.distanceKm != null && (
                        <Text style={styles.mapBottomCardDistance}>
                          {formatDistanceKm(nearestBank.distanceKm)}
                        </Text>
                      )}
                    </View>

                    {nearestCriticalGroup && (
                      <View style={styles.criticalNeedPill}>
                        <Text style={styles.criticalNeedPillTitle}>Critical Need</Text>
                        <Text style={styles.criticalNeedPillGroup}>({nearestCriticalGroup})</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            )}

            {/* ─── 6. STOCK LEVELS AT NEAREST CENTER ────────────────────── */}
            {nearestBank && (
              <View style={styles.stockSection}>
                <View style={styles.stockSectionHeader}>
                  <Text style={styles.stockSectionTitle}>Stock Levels at Nearest Center</Text>
                  <Text style={styles.stockUpdatedLabel}>
                    {formatStockUpdated(newestStockDate)}
                  </Text>
                </View>

                {nearestStocks.length > 0 ? (
                  <View style={styles.stockCardsRow}>
                    {nearestStocks.map((stock) => {
                      const theme = getStockColorTheme(stock.status, stock.units);
                      const displayStatus = getStockStatusLabel(stock.status, stock.units);
                      return (
                        <View
                          key={stock.bloodGroup}
                          style={[
                            styles.stockCard,
                            {
                              backgroundColor: theme.cardBg,
                              borderColor: theme.cardBorder,
                            },
                          ]}
                        >
                          <Text style={styles.stockCardGroup}>{stock.bloodGroup}</Text>
                          <Text style={styles.stockCardUnits}>{stock.units} u</Text>
                          <View
                            style={[
                              styles.stockCardBadge,
                              { backgroundColor: theme.badgeBg },
                            ]}
                          >
                            <Text style={styles.stockCardBadgeText}>{displayStatus}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.noStocksCard}>
                    <Text style={styles.noStocksText}>No stock data reported for this center</Text>
                  </View>
                )}
              </View>
            )}

            {/* ─── 7. VERIFIED BLOOD BANKS LIST ─────────────────────────── */}
            <View style={styles.banksListSection}>
              <View style={styles.banksListHeader}>
                <Text style={styles.banksListTitle}>
                  Verified Blood Banks ({filteredBanks.length})
                </Text>
                {isFilterActive || searchQuery ? (
                  <TouchableOpacity onPress={handleClearFilter} activeOpacity={0.7}>
                    <Text style={styles.viewAllBtnText}>Reset Filters</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {filteredBanks.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                  <Ionicons name="search-outline" size={40} color="#94A3B8" />
                  <Text style={styles.emptyStateTitle}>No blood banks found</Text>
                  <Text style={styles.emptyStateSubtitle}>
                    Try adjusting your search query, district, or stock status filter.
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyResetButton}
                    onPress={handleClearFilter}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.emptyResetButtonText}>Clear All Filters</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                filteredBanks.map((bank) => {
                  const typeLabel = getBankTypeLabel(bank.type);
                  const distanceLabel = bank.distanceKm != null ? `${bank.distanceKm} km` : null;
                  const locationLine = [bank.department, bank.address].filter(Boolean).join(' • ');

                  return (
                    <View key={bank.id} style={styles.bankCard}>
                      {/* Top Row: Type Tag + Distance & Phone Button */}
                      <View style={styles.bankCardTopRow}>
                        <View style={styles.bankMetaRow}>
                          <View style={styles.bankTypeBadge}>
                            <Text style={styles.bankTypeBadgeText}>{typeLabel}</Text>
                          </View>
                          {distanceLabel && (
                            <Text style={styles.bankDistanceText}>• {distanceLabel}</Text>
                          )}
                        </View>

                        <TouchableOpacity
                          style={[
                            styles.phoneButton,
                            !bank.phone && styles.phoneButtonDisabled,
                          ]}
                          onPress={() => handleCall(bank.phone)}
                          disabled={!bank.phone}
                          accessibilityRole="button"
                          accessibilityLabel={
                            bank.phone ? `Call ${bank.name} at ${bank.phone}` : 'No phone number'
                          }
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name="call"
                            size={16}
                            color={bank.phone ? '#087B52' : '#94A3B8'}
                          />
                        </TouchableOpacity>
                      </View>

                      {/* Bank Name */}
                      <Text style={styles.bankNameText}>{bank.name}</Text>

                      {/* Location / Department (No opening hours or services) */}
                      {locationLine.length > 0 && (
                        <Text style={styles.bankLocationText} numberOfLines={2}>
                          {locationLine}
                        </Text>
                      )}

                      {/* Stocks Row */}
                      {bank.stocks && bank.stocks.length > 0 && (
                        <View style={styles.bankStocksRow}>
                          <Text style={styles.bankStocksLabel}>Stocks:</Text>
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.bankStocksScroll}
                          >
                            {sortStocksByUrgency(bank.stocks).map((st) => {
                              const displayStatus = getStockStatusLabel(st.status, st.units);
                              const isCritical = displayStatus === 'CRITICAL';
                              const isLow = displayStatus === 'LOW';

                              return (
                                <View
                                  key={st.bloodGroup}
                                  style={[
                                    styles.bankStockChip,
                                    isCritical && styles.bankStockChipCritical,
                                    isLow && styles.bankStockChipLow,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.bankStockChipText,
                                      isCritical && styles.bankStockChipTextCritical,
                                      isLow && styles.bankStockChipTextLow,
                                    ]}
                                  >
                                    {st.bloodGroup} : {st.units}u{isCritical ? ' (Critical)' : ''}
                                  </Text>
                                </View>
                              );
                            })}
                          </ScrollView>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* ─── 8. BOTTOM NAVIGATION BAR ───────────────────────────────────── */}
      <DonorBottomNav
        activeTab="Banks"
        onSelect={(tab) => {
          if (onNavigateTab) {
            onNavigateTab(tab);
          }
        }}
      />

      {/* ─── 9. FILTER BOTTOM SHEET MODAL ───────────────────────────────── */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setFilterModalVisible(false)}
        >
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalDragHandle} />

            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Filter Blood Banks</Text>
              <TouchableOpacity
                onPress={() => setFilterModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#475569" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
              {/* Blood Group Filter */}
              <Text style={styles.filterSectionTitle}>Blood Group</Text>
              <View style={styles.modalFilterChipsWrap}>
                <TouchableOpacity
                  style={[
                    styles.modalFilterChip,
                    tempBloodGroup === null && styles.modalFilterChipActive,
                  ]}
                  onPress={() => setTempBloodGroup(null)}
                >
                  <Text
                    style={[
                      styles.modalFilterChipText,
                      tempBloodGroup === null && styles.modalFilterChipTextActive,
                    ]}
                  >
                    All Groups
                  </Text>
                </TouchableOpacity>

                {BLOOD_GROUPS.map((bg) => {
                  const active = tempBloodGroup === bg;
                  return (
                    <TouchableOpacity
                      key={bg}
                      style={[styles.modalFilterChip, active && styles.modalFilterChipActive]}
                      onPress={() => setTempBloodGroup(active ? null : bg)}
                    >
                      <Text
                        style={[
                          styles.modalFilterChipText,
                          active && styles.modalFilterChipTextActive,
                        ]}
                      >
                        {bg}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Stock Status Filter */}
              <Text style={[styles.filterSectionTitle, { marginTop: 18 }]}>Stock Status</Text>
              <View style={styles.modalFilterChipsWrap}>
                <TouchableOpacity
                  style={[
                    styles.modalFilterChip,
                    tempStockStatus === null && styles.modalFilterChipActive,
                  ]}
                  onPress={() => setTempStockStatus(null)}
                >
                  <Text
                    style={[
                      styles.modalFilterChipText,
                      tempStockStatus === null && styles.modalFilterChipTextActive,
                    ]}
                  >
                    All Levels
                  </Text>
                </TouchableOpacity>

                {STOCK_STATUSES.map((st) => {
                  const active = tempStockStatus === st;
                  return (
                    <TouchableOpacity
                      key={st}
                      style={[styles.modalFilterChip, active && styles.modalFilterChipActive]}
                      onPress={() => setTempStockStatus(active ? null : st)}
                    >
                      <Text
                        style={[
                          styles.modalFilterChipText,
                          active && styles.modalFilterChipTextActive,
                        ]}
                      >
                        {st}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalClearBtn}
                onPress={handleClearFilter}
                activeOpacity={0.7}
              >
                <Text style={styles.modalClearBtnText}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalApplyBtn}
                onPress={handleApplyFilter}
                activeOpacity={0.85}
              >
                <Text style={styles.modalApplyBtnText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 6,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  avatarButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#C5162E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C5162E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subheaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 10,
  },
  networkBadgeCol: {
    flex: 1,
  },
  networkTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  greenPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  networkTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  networkSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  districtIndicatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  districtIndicatorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0369A1',
    maxWidth: 110,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 10,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 0,
  },
  searchClearBtn: {
    padding: 4,
  },
  filterButton: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FFE4E6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  filterButtonActive: {
    backgroundColor: '#C5162E',
    borderColor: '#C5162E',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#C5162E',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  filterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  districtChipsContainer: {
    marginBottom: 10,
  },
  districtChipsScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  districtChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  districtChipSelected: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  districtChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  districtChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  errorBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginVertical: 12,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 8,
  },
  errorMessage: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#C5162E',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  // Map card static styled placeholder
  mapCardContainer: {
    height: 185,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  mapCanvas: {
    flex: 1,
    backgroundColor: '#E8EEF5',
    position: 'relative',
  },
  mapGridLineH1: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  mapGridLineH2: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  mapGridLineV1: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '30%',
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  mapGridLineV2: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '68%',
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  mapMainRoad: {
    position: 'absolute',
    top: -20,
    left: '48%',
    width: 8,
    height: 220,
    backgroundColor: '#FED7AA',
    transform: [{ rotate: '4deg' }],
  },
  mapSecondaryRoad: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: '#FEF08A',
    transform: [{ rotate: '-3deg' }],
  },
  mapRiverLine: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#BAE6FD',
  },
  centerPinHalo: {
    position: 'absolute',
    top: 55,
    left: '43%',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(220, 38, 38, 0.25)',
  },
  centerPinCircle: {
    position: 'absolute',
    top: 59,
    left: '44.5%',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#DC2626',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  topRightPinCircle: {
    position: 'absolute',
    top: 40,
    right: '32%',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#DC2626',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomLeftPinCircle: {
    position: 'absolute',
    bottom: 68,
    left: '26%',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapNearbyBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  redBadgeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#DC2626',
  },
  mapNearbyBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  mapZoomControls: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  mapZoomBtn: {
    width: 30,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapZoomDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  mapBottomCard: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  mapBottomCardLeft: {
    flex: 1,
    marginRight: 8,
  },
  mapBottomCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  redCardDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DC2626',
  },
  mapBottomCardName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  mapBottomCardDistance: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    marginLeft: 12,
  },
  criticalNeedPill: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  criticalNeedPillTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
  },
  criticalNeedPillGroup: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
  },
  // Stock levels section
  stockSection: {
    marginBottom: 20,
  },
  stockSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  stockSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  stockUpdatedLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  stockCardsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stockCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockCardGroup: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  stockCardUnits: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  stockCardBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stockCardBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  noStocksCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  noStocksText: {
    fontSize: 12,
    color: '#64748B',
  },
  // Verified banks list section
  banksListSection: {
    marginBottom: 20,
  },
  banksListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  banksListTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  viewAllBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C5162E',
  },
  emptyStateContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 10,
  },
  emptyStateSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  emptyResetButton: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  emptyResetButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  bankCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEF0F6',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  bankCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  bankMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  bankTypeBadge: {
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  bankTypeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#C5162E',
    letterSpacing: 0.4,
  },
  bankDistanceText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  phoneButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E6F7F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneButtonDisabled: {
    backgroundColor: '#F1F5F9',
    opacity: 0.6,
  },
  bankNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 4,
  },
  bankLocationText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  bankStocksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  bankStocksLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  bankStocksScroll: {
    gap: 6,
  },
  bankStockChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bankStockChipCritical: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  bankStockChipLow: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  bankStockChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  bankStockChipTextCritical: {
    color: '#DC2626',
    fontWeight: '700',
  },
  bankStockChipTextLow: {
    color: '#D97706',
    fontWeight: '700',
  },
  // Bottom sheet modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 24,
    maxHeight: '75%',
  },
  modalDragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalBody: {
    marginBottom: 16,
  },
  filterSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  modalFilterChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalFilterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalFilterChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  modalFilterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  modalFilterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalClearBtn: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalClearBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  modalApplyBtn: {
    flex: 2,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#C5162E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalApplyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
