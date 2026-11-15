// src/banks/types/banks.ts

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
export type StockStatus = 'Normal' | 'Low' | 'Critical';
export type StockDisplayStatus = 'GOOD' | 'LOW' | 'CRITICAL';
export type BankType = 'hospital' | 'bloodbank';

export interface BloodStockItem {
  bloodGroup: string;
  units: number;
  status: StockStatus | string;
  updatedAt: string;
}

export interface BloodBank {
  id: string;
  name: string;
  type: BankType | string;
  district: string | null;
  address: string | null;
  phone: string | null;
  department: string | null;
  latitude: number | null;
  longitude: number | null;
  distanceKm: number | null;
  stocks: BloodStockItem[];
}

export interface BloodBanksResponse {
  donorInitials: string;
  banks: BloodBank[];
}

export interface BankFilterOptions {
  query?: string;
  district?: string | null;
  bloodGroup?: string | null;
  stockStatus?: string | null;
}

