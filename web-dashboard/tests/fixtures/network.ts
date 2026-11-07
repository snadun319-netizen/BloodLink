import { GROUPS } from '../../src/types';
import type { Organization, BankAccount, Verification, Details } from '../../src/types';

// Synthetic records for the isolated browser test server only.
export function createTestData() {
  const now = new Date('2026-10-17T04:00:00Z').getTime();
  const date = (hours: number) => new Date(now - hours * 3600000).toISOString();
  let nextId = 100;
  const names = [
    ['National Blood Centre', 'Colombo'], ['Teaching Hospital Blood Bank', 'Kandy'],
    ['Karapitiya Blood Bank', 'Galle'], ['Sabaragamuwa Blood Bank', 'Ratnapura'],
    ['Jaffna Regional Blood Bank', 'Jaffna'], ['Kurunegala Blood Bank', 'Kurunegala'],
    ['Batticaloa Blood Bank', 'Batticaloa'], ['Badulla Regional Blood Bank', 'Badulla'],
    ['Gampaha District Blood Bank', 'Gampaha'],
  ];
  let organizations: Organization[] = names.map(([name, district], i) => ({
    id: i + 1, name, district, type: 'bloodbank', address: `${district}, Sri Lanka`,
    contact_phone: `+9411200000${i}`, contact_email: `coordinator${i + 1}@example.com`,
    latitude: null, longitude: null, registration_evidence_url: null, branch_name: null, parent_organization_id: null, parent_name: null, account_email: null,
    verification_status: i === 4 || i === 6 ? 'pending' : i === 8 ? 'rejected' : 'approved',
    is_active: i !== 7, created_at: date(i * 20 + 2), staff_count: i === 4 || i === 6 || i === 8 ? 0 : 1,
    total_units: 0, critical_groups: 0, active_requests: 0,
  }));
  let staff: BankAccount[] = organizations.filter(b => b.staff_count).map(b => ({
    id: b.id + 20, email: b.contact_email!, role: 'bloodbank_staff', organization_id: b.id,
    organization_name: b.name, organization_status: b.verification_status, organization_active: b.is_active,
    status: b.id === 6 ? 'suspended' : 'active', created_at: b.created_at,
  }));
  let verifications: Verification[] = [{ id: 50, donor_email: 'demo.donor@example.com', claimed_blood_group: 'O+', document_url: 'uploads/demo-blood-group.pdf', created_at: date(9) }];
  const stocks = new Map<number, Details['stock']>();
  organizations.filter(b => b.verification_status === 'approved').forEach(b => {
    const rows = GROUPS.map((group, i) => { const units = (b.id * 17 + i * 13) % 80 + 1; return { blood_group: group, available_units: units, status: units < 5 ? 'Critical' : units < 20 ? 'Low' : 'Normal', updated_at: date(1) }; });
    stocks.set(b.id, rows); b.total_units = rows.reduce((n, r) => n + r.available_units, 0); b.critical_groups = rows.filter(r => r.status === 'Critical').length;
  });
  return async (path: string, method: string, input?: unknown): Promise<unknown> => {
    const body = (input || {}) as Record<string, any>;
    const id = Number(path.split('/')[3]);
    const memberRows = () => staff.map(member => {
      const bank = organizations.find(bank => bank.id === member.organization_id);
      return { ...member, organization_name: bank?.name || null, organization_active: bank?.is_active ?? null, organization_status: bank?.verification_status || null };
    });
    if (method === 'GET') {
      if (path === '/admin/organizations') return { organizations: structuredClone(organizations.map(bank => ({ ...bank,
        parent_name: organizations.find(parent => parent.id === bank.parent_organization_id)?.name || null,
        account_email: staff.find(member => member.organization_id === bank.id && member.is_bank_account)?.email || null,
        staff_count: staff.filter(member => member.organization_id === bank.id).length,
      }))) };
      if (path === '/admin/bank-accounts') return { accounts: structuredClone(memberRows().filter(member => member.is_bank_account)) };
      if (path === '/admin/blood-requests') return { requests: [] };
      if (path === '/donors/admin/pending') return { verifications: structuredClone(verifications) };
      if (path === '/admin/network-overview') {
        const active = organizations.filter(bank => bank.verification_status === 'approved' && bank.is_active);
        return { total_banks: organizations.length, active_banks: active.length, pending_banks: organizations.filter(bank => bank.verification_status === 'pending').length,
          critical_groups: active.reduce((sum, bank) => sum + bank.critical_groups, 0), active_requests: 0,
          stock: GROUPS.map(group => ({ blood_group: group, units: active.reduce((sum, bank) => sum + (stocks.get(bank.id)?.find(stock => stock.blood_group === group)?.available_units || 0), 0) })) };
      }
      if (path.startsWith('/admin/organizations/')) return { organization: structuredClone(organizations.find(bank => bank.id === id)), stock: stocks.get(id) || [], staff: structuredClone(memberRows().filter(member => member.organization_id === id)), requests: [] };
    }
    if (path === '/admin/bank-accounts' && method === 'POST') {
      if (staff.some(member => member.email === body.accountEmail)) throw new Error('Email already registered.');
      const member = { id: nextId++, email: body.accountEmail, role: 'bloodbank_staff', organization_id: null, organization_name: null,
        organization_status: null, organization_active: null, status: 'active', created_at: new Date().toISOString(), is_bank_account: true, must_change_password: true } as BankAccount;
      staff = [member, ...staff]; return { user: member };
    }
    function selectedAccount() {
      const account = staff.find(member => member.id === Number(body.accountId) && member.is_bank_account);
      if (!account || account.organization_id !== null || account.status !== 'active') throw new Error('Select an active, unassigned account.');
      return account;
    }
    if (path === '/admin/blood-banks' && method === 'POST') {
      const member = selectedAccount();
      const bank = { id: nextId++, name: body.name, type: 'bloodbank', district: body.district, address: body.address,
        contact_phone: body.contactPhone || null, contact_email: body.contactEmail || null, latitude: body.latitude, longitude: body.longitude,
        registration_evidence_url: body.registrationEvidenceUrl || null, branch_name: body.branchName || null, parent_organization_id: Number(body.parentOrganizationId) || null,
        parent_name: null, account_email: member.email, verification_status: 'approved', is_active: true, created_at: new Date().toISOString(),
        staff_count: 1, total_units: 0, critical_groups: 0, active_requests: 0 } as Organization;
      member.organization_id = bank.id;
      organizations = [bank, ...organizations]; return { organization: bank, user: member };
    }
    if (path.startsWith('/admin/blood-banks/') && path.endsWith('/account') && method === 'POST') {
      const bank = organizations.find(bank => bank.id === id);
      if (!bank || !bank.is_active || bank.verification_status !== 'approved') throw new Error('Bank must be approved and active.');
      if (staff.some(member => member.organization_id === id && member.is_bank_account)) throw new Error('Bank already has a primary account.');
      const member = selectedAccount(); member.organization_id = id; return { user: member };
    }
    if (path.startsWith('/admin/organizations/')) {
      const bank = organizations.find(bank => bank.id === id); if (!bank) throw new Error('Institution not found.');
      if (path.endsWith('/access')) bank.is_active = body.isActive;
      else Object.assign(bank, { name: body.name, district: body.district, address: body.address, contact_phone: body.contactPhone, contact_email: body.contactEmail,
        latitude: body.latitude, longitude: body.longitude, registration_evidence_url: body.registrationEvidenceUrl, branch_name: body.branchName || null, parent_organization_id: Number(body.parentOrganizationId) || null });
      return { organization: bank };
    }
    if (path.startsWith('/organizations/admin/')) {
      const bank = organizations.find(bank => bank.id === id); if (!bank || bank.verification_status !== 'pending') throw new Error('Registration already processed.');
      bank.verification_status = path.endsWith('/approve') ? 'approved' : 'rejected'; return { organization: bank };
    }
    if (path.startsWith('/admin/users/')) {
      const member = staff.find(member => member.id === id); if (!member) throw new Error('Account not found.');
      member.status = body.status; return { user: member };
    }
    if (path.startsWith('/donors/admin/')) { verifications = verifications.filter(item => item.id !== id); return {}; }
    throw new Error('Unsupported test API request: ' + method + ' ' + path);
  };
}
