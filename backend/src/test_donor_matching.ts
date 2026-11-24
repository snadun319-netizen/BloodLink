import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const configured = process.env.TEST_DATABASE_URL || process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;
if (!configured) throw new Error('Set TEST_DATABASE_URL to a PostgreSQL account with CREATEDB permission');
const url = new URL(configured);
if (!process.env.TEST_DATABASE_URL && !['localhost','127.0.0.1','[::1]'].includes(url.hostname)) throw new Error('Remote tests require explicit TEST_DATABASE_URL');
const databaseName = 'bloodlink_matching_' + crypto.randomBytes(8).toString('hex');
const admin = new Pool({ connectionString: configured,connectionTimeoutMillis: 5000 });
let created = false, db: Pool | undefined, server: http.Server | undefined;
const bankFixtures = [
  ['Ratnapura','Ratnapura',6.836,87.984673],
  ['Balangoda','Ratnapura',6.653,80.702],
  ['Colombo','Colombo',6.9027,79.8612],
  ['Kandy','Kandy',7.2906,80.6337],
  ['Galle','Galle',6.0329,80.2168],
  ['Jaffna','Jaffna',9.6615,80.0255],
] as const;

async function main() {
  await admin.query(`CREATE DATABASE "${databaseName}"`); created = true;
  url.pathname = '/' + databaseName;
  process.env.DATABASE_URL = url.toString();
  process.env.NODE_ENV = 'development';
  process.env.SEED_DEMO_DATA = 'false';
  process.env.TEST_DONOR_PASSWORD = 'MatchingTest123!';
  process.env.RATE_LIMIT_STORE = 'memory';
  process.env.PUSH_TRANSPORT = 'disabled';
  process.env.EMAIL_TRANSPORT = 'console';
  process.env.JWT_ACCESS_SECRET = crypto.randomBytes(48).toString('hex');
  process.env.JWT_REFRESH_SECRET = crypto.randomBytes(48).toString('hex');
  db = (await import('./db')).pool;
  const { runMigrations } = await import('./migrate');
  const { transaction } = await import('./transaction');
  const { seedDonors } = await import('./seedDonors');
  const { BLOOD_GROUPS } = await import('./middleware/validation.middleware');
  const { dispatchMatches,matchedRequests,assertRequestMatch,requestCoverage } = await import('./services/coordination.service');
  await runMigrations(true);
  await runMigrations();
  for (const [city,district,latitude,longitude] of bankFixtures) {
    await db.query(`INSERT INTO organizations(name,type,district,latitude,longitude,verification_status)
      VALUES($1,'bloodbank',$2,$3,$4,'approved')`,[`${city} Regional Blood Bank`,district,latitude,longitude]);
  }
  const legacy = (await db.query("INSERT INTO users(email,password_hash,role) VALUES('existing.test@example.com','preserved-test-hash','donor') RETURNING id")).rows[0];
  await db.query("INSERT INTO donor_profiles(user_id,full_name,blood_group,district,is_simulated) VALUES($1,'Test Donor 1','O+','Ratnapura',true)",[legacy.id]);
  const real = (await db.query("INSERT INTO users(email,password_hash,role) VALUES('untouched@example.com','untouched-hash','donor') RETURNING id")).rows[0];
  await db.query("INSERT INTO donor_profiles(user_id,full_name,district) VALUES($1,'Untouched Donor','Jaffna')",[real.id]);
  const realBefore = (await db.query('SELECT * FROM donor_profiles WHERE user_id=$1',[real.id])).rows;
  const seeded = await seedDonors();
  assert.equal(seeded.created,84);
  assert.equal(seeded.enriched,1);
  assert.equal(seeded.correctedBanks,1);
  assert.deepEqual((await db.query('SELECT * FROM donor_profiles WHERE user_id=$1',[real.id])).rows,realBefore);
  assert.equal((await db.query('SELECT password_hash FROM users WHERE id=$1',[legacy.id])).rows[0].password_hash,'preserved-test-hash');
  const incomplete = (await db.query(`SELECT user_id FROM donor_profiles WHERE is_simulated AND
    (full_name IS NULL OR nic IS NULL OR phone IS NULL OR date_of_birth IS NULL OR address IS NULL OR city IS NULL
      OR province IS NULL OR district IS NULL OR latitude IS NULL OR longitude IS NULL)`)).rows;
  assert.equal(incomplete.length,0);
  const snapshot = (await db.query('SELECT * FROM donor_profiles ORDER BY id')).rows;
  assert.equal((await seedDonors()).created,0);
  assert.deepEqual((await db.query('SELECT * FROM donor_profiles ORDER BY id')).rows,snapshot);
  process.env.NODE_ENV = 'production';
  await assert.rejects(()=>seedDonors(),/only in development/);
  process.env.NODE_ENV = 'development';
  console.log('PASS: complete fixtures, preserved existing credentials and real profiles, repeatability and development guard');

  const banks = (await db.query("SELECT * FROM organizations WHERE type='bloodbank' ORDER BY id")).rows;
  const donors = (await db.query("SELECT u.id,u.email,u.status,dp.* FROM users u JOIN donor_profiles dp ON dp.user_id=u.id WHERE dp.is_simulated")).rows;
  const donorFor = (bank: any,key: string) => donors.find(d => d.email===`qa.bank.${bank.id}.${key}@example.com`)!;
  const requests = new Map<string,number>();
  for (const bank of banks) {
    for (const group of BLOOD_GROUPS) {
      const request: { id: number } = (await db.query(`INSERT INTO blood_requests(organization_id,blood_group,required_units,priority,radius_km,status,approval_status,is_simulated,expires_at)
        VALUES($1,$2,2,'Emergency',20,'Active','Approved',true,NOW()+INTERVAL '1 day') RETURNING id`,[bank.id,group])).rows[0];
      requests.set(`${bank.id}:${group}`,request.id);
      await transaction(client=>dispatchMatches(client,request.id));
      const key = 'eligible.' + group.replace('+','pos').replace('-','neg').toLowerCase();
      const local = donorFor(bank,key);
      const notified: number[] = (await db.query('SELECT donor_id FROM notifications WHERE request_id=$1',[request.id])).rows.map(row=>row.donor_id);
      assert.ok(notified.includes(local.user_id),`${bank.name} ${group} reaches a local eligible donor`);
      assert.ok((await matchedRequests(String(local.user_id))).some(row=>row.id===request.id));
      for (const other of banks.filter(other=>other.id!==bank.id)) {
        const remote = donorFor(other,key);
        assert.ok(!notified.includes(remote.user_id),`${bank.name} excludes donor near ${other.name}`);
        assert.ok(!(await matchedRequests(String(remote.user_id))).some(row=>row.id===request.id));
      }
    }
    const requestId = requests.get(`${bank.id}:O+`)!;
    for (const scenario of ['unavailable','suspended','unverified','recent','stale','withdrawn']) {
      const donor = donorFor(bank,scenario);
      assert.equal((await db.query('SELECT id FROM notifications WHERE request_id=$1 AND donor_id=$2',[requestId,donor.user_id])).rowCount,0,scenario);
      assert.equal((await matchedRequests(String(donor.user_id))).length,0,scenario);
    }
  }
  assert.equal((await db.query('SELECT COUNT(*)::integer AS n FROM push_delivery_jobs')).rows[0].n,0);
  console.log('PASS: all eight blood groups at all six banks; other cities and six ineligible scenarios excluded from alerts and notifications');

  const ratnapura = banks[0],jaffna = banks[5];
  const local = donorFor(ratnapura,'eligible.opos'),remote = donorFor(jaffna,'eligible.opos');
  const requestId = requests.get(`${ratnapura.id}:O+`)!;
  await transaction(client=>assertRequestMatch(client,String(local.user_id),requestId));
  await assert.rejects(()=>transaction(client=>assertRequestMatch(client,String(remote.user_id),requestId)),/matching blood group, location/);
  const original = (await db.query('SELECT * FROM donor_profiles WHERE user_id=$1',[local.user_id])).rows[0];
  // A nearby boundary probe (about 1–3 km) isolates radius from district labels.
  await db.query('UPDATE blood_requests SET radius_km=0.01 WHERE id=$1',[requestId]);
  assert.ok(!(await matchedRequests(String(local.user_id))).some(row=>row.id===requestId));
  await db.query('UPDATE blood_requests SET radius_km=20 WHERE id=$1',[requestId]);
  await db.query("UPDATE donor_profiles SET district='Jaffna' WHERE user_id=$1",[local.user_id]);
  assert.ok((await matchedRequests(String(local.user_id))).some(row=>row.id===requestId),'coordinates, not district text, determine reach');
  await db.query('UPDATE donor_profiles SET latitude=NULL,longitude=NULL WHERE user_id=$1',[local.user_id]);
  assert.ok(!(await matchedRequests(String(local.user_id))).some(row=>row.id===requestId));
  await db.query('UPDATE donor_profiles SET district=$2,latitude=$3,longitude=$4 WHERE user_id=$1',[local.user_id,original.district,original.latitude,original.longitude]);
  await db.query("UPDATE blood_requests SET approval_status='Pending' WHERE id=$1",[requestId]);
  assert.ok(!(await matchedRequests(String(local.user_id))).some(row=>row.id===requestId));
  assert.equal(await transaction(client=>dispatchMatches(client,requestId)),0);
  await db.query("UPDATE blood_requests SET approval_status='Approved',expires_at=NOW()-INTERVAL '1 second' WHERE id=$1",[requestId]);
  assert.ok(!(await matchedRequests(String(local.user_id))).some(row=>row.id===requestId));
  await db.query("UPDATE blood_requests SET expires_at=NOW()+INTERVAL '1 day' WHERE id=$1",[requestId]);
  const coverage = await requestCoverage(requestId);
  assert.equal(coverage.bands[0].candidates,2,'only the local eligible O+ fixture and enriched legacy donor are within 10 km');
  console.log('PASS: radius, missing coordinates, district independence, approval, expiry and coverage');

  const { createApp } = await import('./app');
  server = http.createServer(createApp());
  await new Promise<void>(resolve=>server!.listen(0,'127.0.0.1',resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  async function api(endpoint: string,body?: object,token?: string) {
    const response = await fetch(base+endpoint,{ method: body?'POST':'GET',
      headers: { 'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{}) },
      ...(body?{body:JSON.stringify(body)}:{}) });
    return { status: response.status,data: await response.json() as any };
  }
  async function login(email: string) {
    const response = await api('/api/auth/login',{email,password:process.env.TEST_DONOR_PASSWORD});
    assert.equal(response.status,200);
    return response.data.accessToken as string;
  }
  const localToken = await login(local.email),remoteToken = await login(remote.email);
  const profile = await api('/api/donors/me',undefined,localToken);
  assert.ok(profile.data.address && profile.data.city && profile.data.province && profile.data.isSimulated);
  assert.ok((await api('/api/donors/requests',undefined,localToken)).data.requests.some((r:any)=>r.id===String(requestId)));
  assert.ok(!(await api('/api/donors/requests',undefined,remoteToken)).data.requests.some((r:any)=>r.id===String(requestId)));
  assert.ok(!(await api('/api/notifications',undefined,remoteToken)).data.some((n:any)=>n.requestId===String(requestId)));
  assert.equal((await api(`/api/requests/${requestId}/respond`,{status:'accepted'},remoteToken)).status,409);
  assert.equal((await api(`/api/requests/${requestId}/respond`,{status:'accepted'},localToken)).status,200);
  const mission = (await api('/api/requests/me',undefined,localToken)).data.activeMission;
  assert.deepEqual(mission.location,{latitude:Number(ratnapura.latitude),longitude:Number(ratnapura.longitude)},'Directions use the accepted request bank coordinates');
  const unavailable = donorFor(ratnapura,'unavailable');
  const unavailableToken = await login(unavailable.email);
  assert.equal((await api('/api/donors/requests',undefined,unavailableToken)).data.requests.length,0);
  assert.equal((await api(`/api/requests/${requestId}/respond`,{status:'accepted'},unavailableToken)).status,409);
  assert.equal((await api('/api/auth/login',{email:donorFor(ratnapura,'suspended').email,password:process.env.TEST_DONOR_PASSWORD})).status,403);
  console.log('PASS: HTTP login, profile details, local request visibility, distant inbox exclusion, local acceptance, distant/unavailable rejection and suspended login');
  console.log('All donor matching integration checks passed.');
}

main().catch(error=>{console.error('Matching test failed:',error);process.exitCode=1;}).finally(async()=>{
  if (server) await new Promise<void>(resolve=>server!.close(()=>resolve()));
  await db?.end();
  if (created) await admin.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`);
  await admin.end();
});
