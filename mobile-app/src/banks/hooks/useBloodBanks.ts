// src/banks/hooks/useBloodBanks.ts
import { useCallback, useEffect, useState } from 'react';
import { fetchBloodBanks } from '../services/banksService';
import { BloodBank } from '../types/banks';

export function useBloodBanks() {
  const [banks, setBanks] = useState<BloodBank[]>([]);
  const [donorInitials, setDonorInitials] = useState<string>('D');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh: boolean) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await fetchBloodBanks();
      setBanks(data.banks);
      setDonorInitials(data.donorInitials || 'D');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load blood banks.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const refresh = useCallback(async () => {
    await load(true);
  }, [load]);

  return {
    loading,
    error,
    refresh,
    banks,
    donorInitials,
    refreshing,
    reload: () => load(false),
  };
}

export type BloodBanksState = ReturnType<typeof useBloodBanks>;

