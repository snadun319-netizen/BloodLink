import { createContext, useContext } from 'react';
import type { Snapshot } from './types';
import type { Api } from './api';
export interface DashboardContext {
  data: Snapshot; api: Api; busy: boolean;
  mutate: (path: string, body: unknown, message: string, method?: string) => Promise<void>;
}
export const Dashboard = createContext<DashboardContext | null>(null);
export function useDashboard() {
  const context = useContext(Dashboard);
  if (!context) throw new Error('Dashboard context is missing');
  return context;
}
