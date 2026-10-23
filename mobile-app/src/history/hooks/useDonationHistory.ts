// src/history/hooks/useDonationHistory.ts
import { useCallback, useEffect, useState } from 'react';
import { fetchDonationHistory } from '../services/historyService';
import { DonationHistoryData } from '../types/history';

export function useDonationHistory() {
  const [data, setData] = useState<DonationHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh: boolean) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setData(await fetchDonationHistory());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your donation history.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  return {
    data,
    loading,
    refreshing,
    error,
    reload: () => load(false),
    refresh: () => load(true),
  };
}

export type HistoryState = ReturnType<typeof useDonationHistory>;