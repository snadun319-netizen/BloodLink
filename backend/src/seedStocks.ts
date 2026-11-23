import { pool } from './db';
import { BLOOD_GROUPS } from './middleware/validation.middleware';
import { transaction } from './transaction';

// Sample inventory only; never run as a migration or when onboarding a real bank.
export async function seedStocks(): Promise<void> {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Sample blood stock is allowed only in development');
  }

  const result = await transaction(async client => {
    await client.query('SELECT pg_advisory_xact_lock(178442362)');
    const banks = (await client.query("SELECT id FROM organizations WHERE type = 'bloodbank' ORDER BY id")).rows;
    const safeUnits = [34, 14, 28, 12, 16, 10, 52, 18];
    let inserted = 0;

    for (const [bankIndex, bank] of banks.entries()) {
      for (const [groupIndex, group] of BLOOD_GROUPS.entries()) {
        // Rotate shortages so each bank has four safe, two low and two critical
        // groups. Positive groups generally have larger safe sample quantities.
        const level = (groupIndex + bankIndex) % BLOOD_GROUPS.length;
        const variation = (bankIndex * 3 + groupIndex) % 5;
        const units = level < 2 ? 1 + variation % 2
          : level < 4 ? 4 + variation
          : safeUnits[groupIndex] + bankIndex % 4 * 3;
        const status = units <= 2 ? 'Critical' : units < 10 ? 'Low' : 'Normal';
        const row = await client.query(`
          INSERT INTO blood_stocks (organization_id, blood_group, available_units, status)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (organization_id, blood_group) DO NOTHING
          RETURNING id
        `, [bank.id, group, units, status]);
        inserted += row.rowCount ?? 0;
      }
    }
    return { banks: banks.length, inserted };
  });
  console.log(`Sample stock seed completed: ${result.inserted} records added across ${result.banks} blood banks. Existing stock was preserved.`);
}

if (require.main === module) {
  seedStocks().catch(error => {
    console.error('Stock seed failed:', error.code || error.message);
    process.exitCode = 1;
  }).finally(() => pool.end());
}
