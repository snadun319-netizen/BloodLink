import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { pool } from '../db';

// Public institution locations and stock only; donor coordinates remain on the server.
export async function getBloodBanks(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const donor = req.user?.id ? (await pool.query(
      'SELECT full_name, latitude, longitude FROM donor_profiles WHERE user_id = $1', [req.user.id],
    )).rows[0] : null;
    const result = await pool.query(`
      SELECT o.id, o.name, o.type, o.district, o.address, o.contact_phone, o.branch_name,
        o.latitude, o.longitude,
        COALESCE((SELECT json_agg(json_build_object(
          'bloodGroup', s.blood_group, 'units', s.available_units,
          'status', s.status, 'updatedAt', s.updated_at
        ) ORDER BY s.blood_group) FROM blood_stocks s WHERE s.organization_id = o.id), '[]') AS stocks
      FROM organizations o
      WHERE o.verification_status = 'approved' AND o.is_active = true
      ORDER BY o.name
    `);
    const banks = result.rows.map(row => {
      let distanceKm: number | null = null;
      if (donor?.latitude != null && donor?.longitude != null && row.latitude != null && row.longitude != null) {
        const radians = (n: number) => n * Math.PI / 180;
        const lat1 = Number(donor.latitude), lat2 = Number(row.latitude);
        const a = Math.sin(radians(lat2 - lat1) / 2) ** 2
          + Math.cos(radians(lat1)) * Math.cos(radians(lat2))
          * Math.sin(radians(Number(row.longitude) - Number(donor.longitude)) / 2) ** 2;
        distanceKm = Math.round(6371 * 2 * Math.asin(Math.min(1, Math.sqrt(a))) * 10) / 10;
      }
      return {
        id: String(row.id), name: row.name, type: row.type, district: row.district,
        address: row.address, phone: row.contact_phone, department: row.branch_name,
        latitude: row.latitude == null ? null : Number(row.latitude),
        longitude: row.longitude == null ? null : Number(row.longitude), distanceKm, stocks: row.stocks,
      };
    }).sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity) || a.name.localeCompare(b.name));
    const parts = String(donor?.full_name || '').trim().split(/\s+/).filter(Boolean);
    const donorInitials = parts.length ? (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() : 'D';
    res.json({ donorInitials, banks });
  } catch (error) { next(error); }
}
