import { createContext, useContext } from 'react';
import type { Api } from '../api';
import type { BloodRequest, Institution, Staff, Stock } from '../types';

export interface BankData { institution: Institution; stocks: Stock[]; requests: BloodRequest[]; staff: Staff[] }
export interface BankWorkspace {
  api: Api; data: BankData; busy: boolean; revision: number;
  mutate: <T = unknown>(path: string, body: unknown, message: string, method?: string) => Promise<T>;
}
export const BankContext = createContext<BankWorkspace | null>(null);
export function useBank() { const value = useContext(BankContext); if (!value) throw new Error('Institution workspace is missing'); return value; }
export const requestCode = (id: number) => `BLR-${String(id).padStart(5, '0')}`;
export function requestState(r: BloodRequest) { return r.status==='Active' && r.expires_at && Date.parse(r.expires_at)<=Date.now() ? 'Cancelled' : r.status !== 'Active' ? r.status : r.approval_status === 'Approved' ? 'Active' : r.approval_status; }
