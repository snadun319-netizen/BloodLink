import { GROUPS } from './types';
import type { Organization, Staff, Audit, Verification, Details } from './types';

// Synthetic preview only. Every Api instance receives a fresh, isolated data set.
export function createDemo() {
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
    latitude: null, longitude: null, registration_evidence_url: null,
    verification_status: i === 4 || i === 6 ? 'pending' : i === 8 ? 'rejected' : 'approved',
    is_active: i !== 7, created_at: date(i * 20 + 2), staff_count: i === 4 || i === 6 || i === 8 ? 0 : 1,
    total_units: 0, critical_groups: 0, active_requests: 0,
  }));
  let staff: Staff[] = organizations.filter(b => b.staff_count).map(b => ({
    id: b.id + 20, email: b.contact_email!, role: 'bloodbank_staff', organization_id: b.id,
    organization_name: b.name, organization_status: b.verification_status, organization_active: b.is_active,
    status: b.id === 6 ? 'suspended' : 'active', created_at: b.created_at,
  }));
  let verifications: Verification[] = [{ id: 50, donor_email: 'demo.donor@example.com', claimed_blood_group: 'O+', document_url: 'uploads/demo-blood-group.pdf', created_at: date(9) }];
  let logs: Audit[] = [
    { id: 80, action: 'ORGANIZATION_CREATED', target_type: 'organization', target_id: 5, actor_email: 'admin@example.com', metadata: { organizationName: names[4][0] }, created_at: date(2) },
    { id: 79, action: 'STAFF_APPROVED', target_type: 'user', target_id: 21, actor_email: 'admin@example.com', metadata: { email: 'coordinator1@example.com' }, created_at: date(3) },
    { id: 78, action: 'ORGANIZATION_APPROVED', target_type: 'organization', target_id: 4, actor_email: 'admin@example.com', metadata: { organizationName: names[3][0] }, created_at: date(5) },
  ];
  const stocks = new Map<number, Details['stock']>();
  organizations.filter(b => b.verification_status === 'approved').forEach(b => {
    const rows = GROUPS.map((group, i) => { const units = (b.id * 17 + i * 13) % 80 + 1; return { blood_group: group, available_units: units, status: units < 5 ? 'Critical' : units < 20 ? 'Low' : 'Normal', updated_at: date(1) }; });
    stocks.set(b.id, rows); b.total_units = rows.reduce((n, r) => n + r.available_units, 0); b.critical_groups = rows.filter(r => r.status === 'Critical').length;
  });
  function log(action: string, type: string, id: number, metadata: Record<string, unknown>) {
    logs = [{ id: nextId++, action, target_type: type, target_id: id, metadata, actor_email: 'admin@example.com', created_at: new Date().toISOString() }, ...logs];
  }
  return async (path: string, method: string, input?: unknown): Promise<unknown> => {
    const body = (input || {}) as Record<string, any>;
    const parts = path.split('/');
    const id = Number(parts[3]);
    if (method === 'GET') {
      if (path === '/admin/organizations') return { organizations: structuredClone(organizations.map(b => ({ ...b, staff_count: staff.filter(s => s.organization_id === b.id).length }))) };
      if (path === '/admin/staff') return { staff: structuredClone(staff.map(s => { const b = organizations.find(b => b.id === s.organization_id)!; return { ...s, organization_name: b.name, organization_active: b.is_active, organization_status: b.verification_status }; })) };
      if (path.startsWith('/admin/audit-logs')) return { logs: structuredClone(logs) };
      if (path === '/donors/admin/pending') return { verifications: structuredClone(verifications) };
      if (path === '/admin/network-overview') {
        const active = organizations.filter(b => b.verification_status === 'approved' && b.is_active);
        return { total_banks: organizations.length, active_banks: active.length, pending_banks: organizations.filter(b => b.verification_status === 'pending').length,
          critical_groups: active.reduce((n, b) => n + b.critical_groups, 0), active_requests: 0,
          stock: GROUPS.map(group => ({ blood_group: group, units: active.reduce((n, b) => n + (stocks.get(b.id)?.find(s => s.blood_group === group)?.available_units || 0), 0) })) };
      }
      if (path.startsWith('/admin/organizations/')) return { organization: structuredClone(organizations.find(b => b.id === id)), stock: stocks.get(id) || [], staff: structuredClone(staff.filter(s => s.organization_id === id)), requests: [] };
    }
    if (path === '/admin/organizations' && method === 'POST') {
      const bank = { id: nextId++, name: body.name, type: body.type, district: body.district || null, address: body.address || null,
        contact_phone: body.contactPhone || null, contact_email: body.contactEmail || null, latitude: body.latitude || null, longitude: body.longitude || null,
        registration_evidence_url: body.registrationEvidenceUrl || null, verification_status: 'pending', is_active: true, created_at: new Date().toISOString(), staff_count: 0, total_units: 0, critical_groups: 0, active_requests: 0 } as Organization;
      organizations = [bank, ...organizations]; log('ORGANIZATION_CREATED', 'organization', bank.id, { organizationName: bank.name }); return { organization: bank };
    }
    if (path === '/admin/staff' && method === 'POST') {
      const bank = organizations.find(b => b.id === Number(body.organizationId));
      if (!bank || bank.verification_status !== 'approved' || !bank.is_active) throw new Error('Institution must be approved and active.');
      if (staff.some(s => s.email === body.email)) throw new Error('Email already registered.');
      const member = { id: nextId++, email: body.email, role: body.role, organization_id: bank.id, organization_name: bank.name, organization_status: 'approved', organization_active: true, status: 'active', created_at: new Date().toISOString() } as Staff;
      staff = [member, ...staff]; log('STAFF_CREATED', 'user', member.id, { email: member.email, organizationName: bank.name }); return { user: member };
    }
    if (path.startsWith('/admin/organizations/')) {
      const bank = organizations.find(b => b.id === id); if (!bank) throw new Error('Institution not found.');
      if (path.endsWith('/access')) { bank.is_active = body.isActive; log(body.isActive ? 'ORGANIZATION_REACTIVATED' : 'ORGANIZATION_SUSPENDED', 'organization', id, { organizationName: bank.name }); }
      else { Object.assign(bank, { name: body.name, district: body.district, address: body.address, contact_phone: body.contactPhone, contact_email: body.contactEmail, latitude: body.latitude, longitude: body.longitude, registration_evidence_url: body.registrationEvidenceUrl }); log('ORGANIZATION_UPDATED', 'organization', id, { organizationName: bank.name }); }
      return { organization: bank };
    }
    if (path.startsWith('/organizations/admin/')) {
      const bank = organizations.find(b => b.id === id); if (!bank || bank.verification_status !== 'pending') throw new Error('Registration already processed.');
      bank.verification_status = path.endsWith('/approve') ? 'approved' : 'rejected';
      log(path.endsWith('/approve') ? 'ORGANIZATION_APPROVED' : 'ORGANIZATION_REJECTED', 'organization', id, { organizationName: bank.name }); return { organization: bank };
    }
    if (path.startsWith('/admin/users/')) {
      const user = staff.find(s => s.id === id); if (!user) throw new Error('Staff account not found.');
      const bank = organizations.find(b => b.id === user.organization_id)!;
      if (body.status === 'active' && (!bank.is_active || bank.verification_status !== 'approved')) throw new Error('Institution must be approved and active.');
      user.status = body.status; log(body.status === 'active' ? 'USER_ACTIVATED' : 'USER_SUSPENDED', 'user', id, { email: user.email }); return { user };
    }
    if (path.startsWith('/donors/admin/')) {
      verifications = verifications.filter(v => v.id !== id); log(path.endsWith('/approve') ? 'DONOR_VERIFICATION_APPROVED' : 'DONOR_VERIFICATION_REJECTED', 'donor_verification', id, { reason: body.reason || null }); return {};
    }
    throw new Error('This action is unavailable in demo mode.');
  };
}
