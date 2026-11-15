// src/banks/utils/banksFormat.ts
import { BloodBank, BloodStockItem, BankFilterOptions, StockDisplayStatus } from '../types/banks';

export interface StockColors {
  badgeBg: string;
  badgeText: string;
  cardBg: string;
  cardBorder: string;
  accent: string;
}

/**
 * Format database organization type ('bloodbank' | 'hospital') to tag label.
 * Must come strictly from API `type` field (e.g. "BLOOD BANK" or "HOSPITAL").
 */
export function getBankTypeLabel(type?: string | null): string {
  if (!type) return 'BLOOD BANK';
  const normalized = type.trim().toLowerCase();
  if (normalized === 'bloodbank' || normalized === 'blood_bank') {
    return 'BLOOD BANK';
  }
  if (normalized === 'hospital') {
    return 'HOSPITAL';
  }
  return type.toUpperCase();
}

/**
 * Normal (10+ units), Low (3-9), Critical (0-2).
 * In the UI show Normal as "GOOD".
 */
export function getStockStatusLabel(status?: string | null, units?: number): StockDisplayStatus {
  if (status) {
    const s = status.trim().toLowerCase();
    if (s === 'critical') return 'CRITICAL';
    if (s === 'low') return 'LOW';
    if (s === 'normal' || s === 'good') return 'GOOD';
  }

  if (typeof units === 'number' && !isNaN(units)) {
    if (units <= 2) return 'CRITICAL';
    if (units <= 9) return 'LOW';
    return 'GOOD';
  }

  return 'GOOD';
}

/**
 * Visual styling theme based on stock status.
 */
export function getStockColorTheme(status?: string | null, units?: number): StockColors {
  const label = getStockStatusLabel(status, units);
  switch (label) {
    case 'CRITICAL':
      return {
        badgeBg: '#DC2626',
        badgeText: '#FFFFFF',
        cardBg: '#FEF2F2',
        cardBorder: '#FECACA',
        accent: '#DC2626',
      };
    case 'LOW':
      return {
        badgeBg: '#D97706',
        badgeText: '#FFFFFF',
        cardBg: '#FFFBEB',
        cardBorder: '#FDE68A',
        accent: '#D97706',
      };
    case 'GOOD':
    default:
      return {
        badgeBg: '#059669',
        badgeText: '#FFFFFF',
        cardBg: '#ECFDF5',
        cardBorder: '#A7F3D0',
        accent: '#059669',
      };
  }
}

/**
 * Relative time ago format, e.g. "5m ago", "2h ago", "1d ago", "just now".
 */
export function timeAgo(dateString?: string | null, now: Date = new Date()): string {
  if (!dateString) return 'recently';
  const target = new Date(dateString);
  if (isNaN(target.getTime())) return 'recently';

  const elapsedSeconds = Math.max(0, Math.floor((now.getTime() - target.getTime()) / 1000));
  if (elapsedSeconds < 60) return 'just now';

  const minutes = Math.floor(elapsedSeconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

/**
 * Formats "Updated X ago".
 */
export function formatStockUpdated(dateString?: string | null, now: Date = new Date()): string {
  if (!dateString) return 'Updated recently';
  const rel = timeAgo(dateString, now);
  return rel === 'just now' ? 'Updated just now' : `Updated ${rel}`;
}

/**
 * Sort stocks so most critical come first:
 * Critical (0) -> Low (1) -> Good/Normal (2).
 * Within the same level, least units first.
 */
export function sortStocksByUrgency(stocks: BloodStockItem[] = []): BloodStockItem[] {
  const getRank = (item: BloodStockItem): number => {
    const label = getStockStatusLabel(item.status, item.units);
    if (label === 'CRITICAL') return 0;
    if (label === 'LOW') return 1;
    return 2;
  };

  return [...stocks].sort((a, b) => {
    const rankDiff = getRank(a) - getRank(b);
    if (rankDiff !== 0) return rankDiff;
    const unitsDiff = (a.units ?? 0) - (b.units ?? 0);
    if (unitsDiff !== 0) return unitsDiff;
    return a.bloodGroup.localeCompare(b.bloodGroup);
  });
}

/**
 * Returns the first blood group in critical need, or null if none.
 */
export function getCriticalStockGroup(stocks: BloodStockItem[] = []): string | null {
  const critical = stocks.find(
    (s) => getStockStatusLabel(s.status, s.units) === 'CRITICAL'
  );
  return critical ? critical.bloodGroup : null;
}

/**
 * Returns the most recent updatedAt timestamp string from a list of stocks.
 */
export function getNewestStockDate(stocks: BloodStockItem[] = []): string | null {
  let newest: Date | null = null;
  let newestStr: string | null = null;

  for (const s of stocks) {
    if (!s.updatedAt) continue;
    const d = new Date(s.updatedAt);
    if (!isNaN(d.getTime())) {
      if (!newest || d > newest) {
        newest = d;
        newestStr = s.updatedAt;
      }
    }
  }

  return newestStr;
}

/**
 * Formats distance, or returns null when distanceKm is null or undefined.
 */
export function formatDistanceKm(distanceKm?: number | null): string | null {
  if (distanceKm == null || isNaN(distanceKm)) return null;
  return `${distanceKm} km away`;
}

/**
 * Extract distinct district values from blood banks (sorted alphabetically).
 */
export function getDistinctDistricts(banks: BloodBank[] = []): string[] {
  const set = new Set<string>();
  for (const b of banks) {
    if (b.district && b.district.trim().length > 0) {
      set.add(b.district.trim());
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

/**
 * Get nearest bank. If distances are available, sorts nearest first;
 * if distance is null, sorts by name.
 */
export function getNearestBank(banks: BloodBank[] = []): BloodBank | null {
  if (!banks || banks.length === 0) return null;
  const sorted = [...banks].sort((a, b) => {
    const distA = a.distanceKm ?? Infinity;
    const distB = b.distanceKm ?? Infinity;
    if (distA !== distB) return distA - distB;
    return a.name.localeCompare(b.name);
  });
  return sorted[0] || null;
}

/**
 * Filters banks by search query, district, blood group, and stock status.
 */
export function filterBanks(banks: BloodBank[] = [], options: BankFilterOptions = {}): BloodBank[] {
  const query = options.query?.trim().toLowerCase();
  const district = options.district?.trim().toLowerCase();
  const bloodGroup = options.bloodGroup?.trim().toUpperCase();
  const stockStatus = options.stockStatus?.trim().toUpperCase();

  return banks.filter((bank) => {
    // 1. Text search: bank name, district, address
    if (query) {
      const matchName = bank.name.toLowerCase().includes(query);
      const matchDistrict = (bank.district || '').toLowerCase().includes(query);
      const matchAddress = (bank.address || '').toLowerCase().includes(query);
      const matchDept = (bank.department || '').toLowerCase().includes(query);
      if (!matchName && !matchDistrict && !matchAddress && !matchDept) {
        return false;
      }
    }

    // 2. District filter
    if (district && district !== 'all') {
      const bankDist = (bank.district || '').toLowerCase();
      if (bankDist !== district) {
        return false;
      }
    }

    // 3. Blood group filter
    if (bloodGroup && bloodGroup !== 'ALL') {
      const hasGroup = (bank.stocks || []).some(
        (s) => s.bloodGroup.toUpperCase() === bloodGroup
      );
      if (!hasGroup) return false;
    }

    // 4. Stock status filter ('CRITICAL' | 'LOW' | 'GOOD' / 'NORMAL')
    if (stockStatus && stockStatus !== 'ALL') {
      const targetLabel = stockStatus === 'NORMAL' ? 'GOOD' : stockStatus;
      const hasStatus = (bank.stocks || []).some(
        (s) => getStockStatusLabel(s.status, s.units) === targetLabel
      );
      if (!hasStatus) return false;
    }

    return true;
  });
}

