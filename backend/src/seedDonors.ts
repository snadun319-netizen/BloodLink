import { pool } from './db';
import { transaction } from './transaction';
import { BLOOD_GROUPS, validatePasswordStrength } from './middleware/validation.middleware';
import { hashPassword } from './services/password.service';
import { donationIntervalDays } from './services/coordination.service';

type Area = { city: string; province: string; latitude: number; longitude: number };
// Approximate town centres for synthetic profiles, not residential addresses.
const areas: Record<string, Area> = {
  Ratnapura: { city: 'Ratnapura', province: 'Sabaragamuwa', latitude: 6.6858, longitude: 80.4036 },
  Colombo: { city: 'Colombo', province: 'Western', latitude: 6.9027, longitude: 79.8612 },
  Kandy: { city: 'Kandy', province: 'Central', latitude: 7.2906, longitude: 80.6337 },
  Galle: { city: 'Galle', province: 'Southern', latitude: 6.0329, longitude: 80.2168 },
  Jaffna: { city: 'Jaffna', province: 'Northern', latitude: 9.6615, longitude: 80.0255 },
  Gampaha: { city: 'Gampaha', province: 'Western', latitude: 7.0917, longitude: 79.9948 },
  Kurunegala: { city: 'Kurunegala', province: 'North Western', latitude: 7.4863, longitude: 80.3647 },
  Badulla: { city: 'Badulla', province: 'Uva', latitude: 6.9934, longitude: 81.0550 },
  Matara: { city: 'Matara', province: 'Southern', latitude: 5.9549, longitude: 80.5550 },
  Anuradhapura: { city: 'Anuradhapura', province: 'North Central', latitude: 8.3114, longitude: 80.4037 },
};

export const donorScenarios = ['eligible', 'unavailable', 'suspended', 'unverified', 'recent', 'stale', 'withdrawn'] as const;
type Scenario = typeof donorScenarios[number];
const fixturePrefix = 'seed:donors:v1:';

export async function seedDonors(refresh = false) {
  if (process.env.NODE_ENV !== 'development') throw new Error('Test donors are allowed only in development');
  const password = process.env.TEST_DONOR_PASSWORD;
  if (!validatePasswordStrength(password).valid) throw new Error('Set a strong TEST_DONOR_PASSWORD for new test accounts');
  const passwordHash = await hashPassword(password!);
  const interval = donationIntervalDays();

  return transaction(async client => {
    await client.query('SELECT pg_advisory_xact_lock(178442363)');
    // Repair only the known erroneous development fixture, preserving later edits.
    // Ratnapura town centre: https://www.geonames.org/1228730/ratnapura.html
    const corrected = await client.query(`UPDATE organizations SET latitude=6.6858, longitude=80.4036
      WHERE name='Ratnapura Regional Blood Bank' AND type='bloodbank'
        AND latitude=6.836 AND longitude=87.984673 RETURNING id`);
    const banks = (await client.query("SELECT id,name,district,latitude,longitude FROM organizations WHERE type='bloodbank' ORDER BY id")).rows;
    const report: { email: string; bank: string | null; district: string; bloodGroup: string; scenario: string; created: boolean }[] = [];

    async function fillProfile(userId: number, area: Area, district: string, group: string, scenario: Scenario, label: string) {
      const existing = (await client.query('SELECT * FROM donor_profiles WHERE user_id=$1', [userId])).rows[0];
      if (!existing?.is_simulated) throw new Error('Refusing to modify a non-simulated donor');
      if (!refresh && String(existing.source_verification_status || '').startsWith(fixturePrefix)) return;
      const available = !['unavailable', 'withdrawn'].includes(scenario);
      const consent = scenario === 'withdrawn' ? 'withdrawn' : 'granted';
      // Distinct format-valid synthetic identifiers. Never contact these numbers.
      const nic = `1990001${String(userId).padStart(5, '0')}`;
      const phone = `+9470${String(userId).padStart(7, '0')}`;
      const offset = (userId % 7 + 1) * 0.002;
      await client.query(`UPDATE donor_profiles SET
        full_name=CASE WHEN full_name IS NULL OR full_name LIKE 'Test Donor %' THEN $2 ELSE full_name END,
        nic=COALESCE(NULLIF(nic,''),$3),phone=COALESCE(NULLIF(phone,''),$4),
        date_of_birth=COALESCE(date_of_birth,DATE '1990-01-01'),
        blood_group=COALESCE(blood_group,$5),district=COALESCE(NULLIF(district,''),$6),
        city=COALESCE(NULLIF(city,''),$7),province=COALESCE(NULLIF(province,''),$8),
        address=COALESCE(NULLIF(address,''),$9),latitude=COALESCE(latitude,$10),longitude=COALESCE(longitude,$11),
        is_available=$12,blood_group_verified=$13,consent_status=$14,consent_recorded_at=NOW(),
        availability_updated_at=NOW()-CASE WHEN $15 THEN INTERVAL '31 days' ELSE INTERVAL '0 days' END,
        last_donation_date=CASE WHEN $16 THEN CURRENT_DATE-7 ELSE CURRENT_DATE-($17::integer+30) END,
        next_eligible_date=CASE WHEN $16 THEN CURRENT_DATE+GREATEST(1,$17::integer-7) ELSE CURRENT_DATE-30 END,
        source_verification_status=$18,updated_at=NOW() WHERE user_id=$1`,
      [userId,label,nic,phone,group,district,area.city,area.province,
        `TEST ONLY - ${userId} Sample Lane, ${area.city}, ${district}, ${area.province} Province`,
        area.latitude+offset,area.longitude-offset,available,scenario!=='unverified',consent,
        scenario==='stale',scenario==='recent',interval,fixturePrefix+scenario]);
      await client.query("UPDATE users SET status=$2, updated_at=NOW() WHERE id=$1", [userId,scenario==='suspended'?'suspended':'active']);
    }

    // Enrich only explicitly simulated pre-existing donors, retaining credentials
    // and existing identifying/location details. Donors have no bank membership;
    // coordinates determine which requests they can receive.
    const existingDonors = (await client.query(`SELECT u.email,u.status,dp.* FROM users u JOIN donor_profiles dp ON dp.user_id=u.id
      WHERE u.role='donor' AND dp.is_simulated AND u.email NOT LIKE 'qa.bank.%@example.com' ORDER BY u.id`)).rows;
    for (const donor of existingDonors) {
      const area = areas[donor.district];
      if (!area) throw new Error(`No test location configured for existing donor district ${donor.district}`);
      const scenario = donor.status === 'suspended' ? 'suspended' : 'eligible';
      await fillProfile(donor.user_id,area,donor.district,donor.blood_group || 'O+',scenario,`QA ${area.city} Donor ${donor.user_id}`);
      report.push({ email: donor.email,bank: null,district: donor.district,bloodGroup: donor.blood_group || 'O+',scenario,created: false });
    }

    for (const bank of banks) {
      const districtArea = areas[bank.district];
      if (!districtArea || bank.latitude == null || bank.longitude == null) throw new Error(`Configure a test area and bank coordinates for ${bank.name}`);
      const area = { ...districtArea,latitude: Number(bank.latitude),longitude: Number(bank.longitude),
        city: bank.name === 'Balangoda Regional Blood Bank' ? 'Balangoda' : districtArea.city };
      const fixtures: { key: string; group: string; scenario: Scenario }[] = [
        ...BLOOD_GROUPS.map(group => ({ key: `eligible.${group.replace('+','pos').replace('-','neg').toLowerCase()}`,group,scenario: 'eligible' as const })),
        ...donorScenarios.filter(s => s !== 'eligible').map(scenario => ({ key: scenario,group: 'O+',scenario })),
      ];
      for (const fixture of fixtures) {
        const email = `qa.bank.${bank.id}.${fixture.key}@example.com`;
        const inserted = (await client.query(`INSERT INTO users(email,password_hash,role,status)
          VALUES($1,$2,'donor',$3) ON CONFLICT (email) DO NOTHING RETURNING id`,
        [email,passwordHash,fixture.scenario==='suspended'?'suspended':'active'])).rows[0];
        const user = inserted || (await client.query("SELECT id,role FROM users WHERE email=$1",[email])).rows[0];
        if (user.role && user.role !== 'donor') throw new Error('Test email belongs to a non-donor account');
        if (inserted) await client.query('INSERT INTO donor_profiles(user_id,is_simulated) VALUES($1,true)',[user.id]);
        await fillProfile(user.id,area,bank.district,fixture.group,fixture.scenario,`QA ${area.city} ${fixture.key}`);
        report.push({ email,bank: bank.name,district: bank.district,bloodGroup: fixture.group,scenario: fixture.scenario,created: !!inserted });
      }
    }
    return { banks: banks.length,created: report.filter(row => row.created).length,enriched: existingDonors.length,
      correctedBanks: corrected.rowCount || 0,donors: report };
  });
}

if (require.main === module) {
  seedDonors(process.argv.includes('--refresh')).then(result => {
    console.log(JSON.stringify(result,null,2));
  }).catch(error => {
    console.error('Donor seed failed:',error.code || error.message);
    process.exitCode=1;
  }).finally(() => pool.end());
}
