import { createContext, useContext } from 'react';
import type { Snapshot, AccountCredentials } from './types';
import type { Api } from './api';
export interface DashboardContext {
  data: Snapshot; api: Api; busy: boolean;
  credentials: Record<number, AccountCredentials>;
  rememberCredentials: (id: number, credentials: AccountCredentials) => void;
  forgetCredentials: (id: number) => void;
  mutate: <T = unknown>(path: string, body: unknown, message: string, method?: string) => Promise<T>;
}
export const Dashboard = createContext<DashboardContext | null>(null);
export function useDashboard() {
  const context = useContext(Dashboard);
  if (!context) throw new Error('Dashboard context is missing');
  return context;
}
