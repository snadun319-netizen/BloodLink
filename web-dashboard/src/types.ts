export interface Organization {
  id: number; name: string; type: 'bloodbank' | 'hospital'; district: string | null;
  address: string | null; contact_phone: string | null; contact_email: string | null;
  latitude: string | null; longitude: string | null; registration_evidence_url: string | null;
  branch_name: string | null; parent_organization_id: number | null; parent_name: string | null; account_email: string | null;
  verification_status: 'pending' | 'approved' | 'rejected'; is_active: boolean;
  created_at: string; staff_count: number; total_units: number; critical_groups: number; active_requests: number;
}
export interface Staff {
  id: number; email: string; role: 'bloodbank_staff' | 'hospital_staff'; organization_id: number;
  organization_name: string; organization_status: string; organization_active: boolean;
  status: 'active' | 'suspended'; created_at: string;
  is_bank_account?: boolean; must_change_password?: boolean;
}
export interface BankAccount extends Omit<Staff, 'organization_id' | 'organization_name' | 'organization_status' | 'organization_active'> {
  organization_id: number | null;
  organization_name: string | null; organization_status: string | null; organization_active: boolean | null;
}
export interface AccountCredentials { email: string; password: string }
export interface Verification {
  id: number; donor_email: string; claimed_blood_group: string; document_url: string; created_at: string;
}
export interface Overview {
  total_banks: number; active_banks: number; pending_banks: number; critical_groups: number; active_requests: number;
  stock: { blood_group: string; units: number }[];
}
export interface Details {
  organization: Organization;
  stock: { blood_group: string; available_units: number; status: string; updated_at: string }[];
  staff: Staff[];
  requests: { id: number; blood_group: string; required_units: number; priority: string; created_at: string }[];
}
export interface Snapshot { organizations: Organization[]; accounts: BankAccount[]; verifications: Verification[]; overview: Overview }
export function bankCode(bank: Pick<Organization, 'id'>) { return `BL-${String(bank.id).padStart(4, '0')}`; }
export const GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
export const DISTRICTS = ['Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle', 'Gampaha', 'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle', 'Kilinochchi', 'Kurunegala', 'Mannar', 'Matale', 'Matara', 'Monaragala', 'Mullaitivu', 'Nuwara Eliya', 'Polonnaruwa', 'Puttalam', 'Ratnapura', 'Trincomalee', 'Vavuniya'];
export function bankStatus(bank: Organization) { return bank.verification_status === 'approved' ? (bank.is_active ? 'active' : 'suspended') : bank.verification_status; }
