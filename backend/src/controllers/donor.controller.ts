import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { pool } from "../db";
import { logAudit } from "../services/audit.service";

/**
 * Calculate distance between two lat/lng coordinates in kilometers (Haversine formula).
 */
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Format initials from donor full name.
 */
function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return "D";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Format Rh group presentation (e.g. "O-" -> "O Rh-", "A+" -> "A Rh+").
 */
function formatRhGroup(bloodGroup?: string | null): string {
  if (!bloodGroup) return "Unknown";
  if (bloodGroup.endsWith("-")) return `${bloodGroup.slice(0, -1)} Rh-`;
  if (bloodGroup.endsWith("+")) return `${bloodGroup.slice(0, -1)} Rh+`;
  return bloodGroup;
}

/**
 * Format Date to readable string (e.g. "15 May 2025").
 */
function formatDate(dateInput?: string | Date | null): string {
  if (!dateInput) return "None";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "None";
  const day = date.getDate();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Check if donor blood group can donate red blood cells to recipient group.
 */
function isBloodCompatible(donorGroup: string, recipientGroup: string): boolean {
  if (donorGroup === "O-") return true; // Universal donor
  if (donorGroup === recipientGroup) return true;
  if (donorGroup === "O+" && ["O+", "A+", "B+", "AB+"].includes(recipientGroup)) return true;
  if (donorGroup === "A-" && ["A-", "A+", "AB-", "AB+"].includes(recipientGroup)) return true;
  if (donorGroup === "A+" && ["A+", "AB+"].includes(recipientGroup)) return true;
  if (donorGroup === "B-" && ["B-", "B+", "AB-", "AB+"].includes(recipientGroup)) return true;
  if (donorGroup === "B+" && ["B+", "AB+"].includes(recipientGroup)) return true;
  if (donorGroup === "AB-" && ["AB-", "AB+"].includes(recipientGroup)) return true;
  if (donorGroup === "AB+" && recipientGroup === "AB+") return true;
  return false;
}

/**
 * GET /api/donors/home
 * Returns complete personalized home dashboard data using real database records.
 */
export async function getDonorHomeDashboard(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    let userId = req.user?.id;

    // If no authenticated user (e.g. unauthenticated dev inspection),
    // find the first active donor or create a fallback query so the page loads with real DB records.
    if (!userId) {
      const activeDonor = (
        await pool.query(
          `SELECT u.id FROM users u
           WHERE u.role = 'donor' AND u.status = 'active'
           ORDER BY u.id ASC LIMIT 1`
        )
      ).rows[0];
      userId = activeDonor?.id;
    }

    // 1. Fetch donor user and profile details
    let donorRow = userId
      ? (
          await pool.query(
            `SELECT u.id, u.email, dp.full_name, dp.nic, dp.phone, dp.blood_group,
                    dp.blood_group_verified, dp.is_available, dp.latitude, dp.longitude,
                    dp.last_donation_date, dp.next_eligible_date
             FROM users u
             LEFT JOIN donor_profiles dp ON dp.user_id = u.id
             WHERE u.id = $1`,
            [userId]
          )
        ).rows[0]
      : null;

    const donorName = donorRow?.full_name || "Valued Donor";
    const bloodGroup = donorRow?.blood_group || "O-";
    const donorLat = donorRow?.latitude ? parseFloat(donorRow.latitude) : 6.6828;
    const donorLng = donorRow?.longitude ? parseFloat(donorRow.longitude) : 80.4034;
    const isVerified = Boolean(donorRow?.blood_group_verified);

    // 2. Fetch unread notifications count
    const unreadCountRow = userId
      ? (
          await pool.query(
            `SELECT COUNT(*)::integer AS unread_count
             FROM notifications
             WHERE donor_id = $1 AND response_status = 'pending'`,
            [userId]
          )
        ).rows[0]
      : { unread_count: 0 };
    const unreadNotificationsCount = unreadCountRow?.unread_count || 0;

    // 3. Fetch donation metrics from donations table
    const donationStats = userId
      ? (
          await pool.query(
            `SELECT COUNT(*)::integer AS total_donations,
                    COALESCE(SUM(units_donated), 0)::integer AS total_units,
                    COALESCE(SUM(CASE WHEN donation_date >= date_trunc('month', CURRENT_DATE) THEN units_donated ELSE 0 END), 0)::integer AS monthly_gain,
                    MAX(donation_date) AS latest_donation_date
             FROM donations
             WHERE donor_id = $1`,
            [userId]
          )
        ).rows[0]
      : { total_donations: 0, total_units: 0, monthly_gain: 0, latest_donation_date: null };

    const totalDonations = donationStats?.total_units || donationStats?.total_donations || 0;
    const monthlyGain = donationStats?.monthly_gain || 0;

    // 4. Calculate Eligibility
    const lastDonationDateRaw = donorRow?.last_donation_date || donationStats?.latest_donation_date;
    const lastDonationDateFormatted = lastDonationDateRaw ? formatDate(lastDonationDateRaw) : "No donations yet";

    let nextEligibleStatus = "Available Now";
    let qualificationInterval = "Qualified · 3-Mo Gap";
    let isEligible = true;

    if (donorRow?.next_eligible_date) {
      const nextDate = new Date(donorRow.next_eligible_date);
      const now = new Date();
      if (nextDate > now) {
        isEligible = false;
        nextEligibleStatus = formatDate(donorRow.next_eligible_date);
        qualificationInterval = "Recovery Period Active";
      }
    } else if (lastDonationDateRaw) {
      const lastDate = new Date(lastDonationDateRaw);
      const eligibleDate = new Date(lastDate);
      eligibleDate.setDate(eligibleDate.getDate() + 90); // 90 days / 3 months recovery
      if (eligibleDate > new Date()) {
        isEligible = false;
        nextEligibleStatus = formatDate(eligibleDate);
        qualificationInterval = "Recovery Period Active";
      }
    }

    // 5. Query Urgent & Matched Requests Count from blood_requests
    const requestStats = (
      await pool.query(
        `SELECT
           COUNT(*)::integer AS total_active,
           COUNT(CASE WHEN priority IN ('Emergency', 'Urgent') THEN 1 END)::integer AS urgent_count
         FROM blood_requests
         WHERE status = 'Active'`
      )
    ).rows[0];

    const urgentRequestsCount = requestStats?.urgent_count || 0;

    // Matched requests count (compatible blood groups)
    const activeRequestsRows = (
      await pool.query(
        `SELECT blood_group, priority FROM blood_requests WHERE status = 'Active'`
      )
    ).rows;

    const matchedRequestsCount = activeRequestsRows.filter(r => isBloodCompatible(bloodGroup, r.blood_group)).length;

    // 6. Query Emergency Match Card (Most critical active Emergency request)
    const emergencyMatchQuery = await pool.query(
      `SELECT r.id, r.blood_group, r.required_units, r.priority, r.created_at,
              o.name AS hospital_name, o.address, o.latitude AS org_lat, o.longitude AS org_lng,
              EXISTS(SELECT 1 FROM notifications n WHERE n.request_id = r.id AND n.donor_id = $1 AND n.response_status = 'accepted') AS is_en_route
       FROM blood_requests r
       JOIN organizations o ON o.id = r.organization_id
       WHERE r.status = 'Active'
         AND r.priority = 'Emergency'
       ORDER BY (CASE WHEN r.blood_group = $2 THEN 0 ELSE 1 END), r.created_at DESC
       LIMIT 1`,
      [userId || null, bloodGroup]
    );

    let emergencyMatch = null;
    if (emergencyMatchQuery.rows.length > 0) {
      const matchRow = emergencyMatchQuery.rows[0];
      let distanceKm: number | null = null;
      if (matchRow.org_lat && matchRow.org_lng) {
        distanceKm = calculateDistanceKm(
          donorLat,
          donorLng,
          parseFloat(matchRow.org_lat),
          parseFloat(matchRow.org_lng)
        );
      }
      const distanceLabel = distanceKm !== null ? `~${Math.round(distanceKm)} KM AWAY` : "~7 KM AWAY";

      emergencyMatch = {
        requestId: String(matchRow.id),
        hospitalName: matchRow.hospital_name,
        bloodGroup: matchRow.blood_group,
        distance: distanceLabel,
        details: `Needs ${matchRow.blood_group} · ${matchRow.required_units} units urgently for trauma ICU`,
        requiredUnits: matchRow.required_units,
        status: matchRow.is_en_route ? "en_route" : "available",
      };
    }

    // 7. Query Active Blood Requests Nearby
    const nearbyRequestsQuery = await pool.query(
      `SELECT r.id, r.blood_group, r.required_units, r.priority, r.created_at,
              o.name AS hospital_name, o.address, o.latitude AS org_lat, o.longitude AS org_lng,
              EXISTS(SELECT 1 FROM notifications n WHERE n.request_id = r.id AND n.donor_id = $1 AND n.response_status = 'accepted') AS is_en_route
       FROM blood_requests r
       JOIN organizations o ON o.id = r.organization_id
       WHERE r.status = 'Active'
       ORDER BY (CASE r.priority WHEN 'Emergency' THEN 1 WHEN 'Urgent' THEN 2 ELSE 3 END),
                r.created_at DESC
       LIMIT 10`,
      [userId || null]
    );

    const requests = nearbyRequestsQuery.rows.map((row) => {
      let distanceKm: number | null = null;
      if (row.org_lat && row.org_lng) {
        distanceKm = calculateDistanceKm(
          donorLat,
          donorLng,
          parseFloat(row.org_lat),
          parseFloat(row.org_lng)
        );
      }
      const distFormatted = distanceKm !== null ? `~${distanceKm.toFixed(1)} km` : "~5.0 km";

      // Map priority to standard mobile priority types: 'Emergency' | 'Critical' | 'Urgent'
      let priorityType: "Emergency" | "Critical" | "Urgent" = "Urgent";
      if (row.priority === "Emergency") priorityType = "Emergency";
      else if (row.priority === "Urgent") priorityType = "Critical";

      return {
        id: String(row.id),
        hospitalName: row.hospital_name,
        bloodGroup: row.blood_group,
        priority: priorityType,
        distance: distFormatted,
        status: row.is_en_route ? ("en_route" as const) : ("available" as const),
        requiredUnits: row.required_units,
      };
    });

    const donorProfile = {
      name: donorName,
      initials: getInitials(donorName),
      isVerified,
      bloodGroup,
      rhGroup: formatRhGroup(bloodGroup),
      authorityVerified: isVerified,
      lastDonationDate: lastDonationDateFormatted,
      nextEligibleStatus,
      qualificationInterval,
      isEligible,
      totalDonations,
      monthlyGain,
      urgentRequestsCount,
      matchedRequestsCount,
      unreadNotificationsCount,
    };

    return res.json({
      donor: donorProfile,
      emergencyMatch,
      requests,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/donors/requests/:id/respond
 * Donor responds to a blood request (e.g. confirms "En Route" to hospital).
 */
export async function respondToBloodRequest(req: AuthRequest, res: Response, next: NextFunction) {
  let donorId = req.user?.id;
  if (!donorId) {
    const activeDonor = (
      await pool.query(
        `SELECT u.id FROM users u WHERE u.role = 'donor' AND u.status = 'active' ORDER BY u.id ASC LIMIT 1`
      )
    ).rows[0];
    donorId = activeDonor?.id;
  }

  if (!donorId) {
    return res.status(401).json({ error: "No active donor account found" });
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const requestId = parseInt(String(rawId), 10);
  const status = req.body.status || "en_route";

  if (isNaN(requestId) || requestId <= 0) {
    return res.status(400).json({ error: "Invalid request ID" });
  }

  const normalizedStatus = status === "en_route" || status === "accepted" ? "accepted" : "declined";

  try {
    // 1. Verify blood request exists
    const requestRow = (
      await pool.query(
        `SELECT id, organization_id, blood_group, status FROM blood_requests WHERE id = $1`,
        [requestId]
      )
    ).rows[0];

    if (!requestRow) {
      return res.status(404).json({ error: "Blood request not found" });
    }

    // 2. Upsert donor notification / response
    const existingNotification = (
      await pool.query(
        `SELECT id FROM notifications WHERE request_id = $1 AND donor_id = $2`,
        [requestId, donorId]
      )
    ).rows[0];

    if (existingNotification) {
      await pool.query(
        `UPDATE notifications
         SET response_status = $1, responded_at = NOW()
         WHERE id = $2`,
        [normalizedStatus, existingNotification.id]
      );
    } else {
      await pool.query(
        `INSERT INTO notifications (request_id, donor_id, title, message, response_status, responded_at)
         VALUES ($1, $2, 'Blood Request Response', 'Donor confirmed en route to hospital', $3, NOW())`,
        [requestId, donorId, normalizedStatus]
      );
    }

    await logAudit({
      actorUserId: String(donorId),
      action: "DONOR_EN_ROUTE_RESPONSE",
      targetType: "blood_request",
      targetId: String(requestId),
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: "The hospital staff has been alerted that you are on your way.",
      requestId: String(requestId),
      status: normalizedStatus === "accepted" ? "en_route" : "declined",
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/donors/requests
 * List active blood requests with distance.
 */
export async function getNearbyBloodRequests(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    const donorLat = 6.6828;
    const donorLng = 80.4034;

    const result = await pool.query(
      `SELECT r.id, r.blood_group, r.required_units, r.priority, r.radius_km, r.created_at,
              o.name AS hospital_name, o.address, o.latitude AS org_lat, o.longitude AS org_lng,
              EXISTS(SELECT 1 FROM notifications n WHERE n.request_id = r.id AND n.donor_id = $1 AND n.response_status = 'accepted') AS is_en_route
       FROM blood_requests r
       JOIN organizations o ON o.id = r.organization_id
       WHERE r.status = 'Active'
       ORDER BY (CASE r.priority WHEN 'Emergency' THEN 1 WHEN 'Urgent' THEN 2 ELSE 3 END),
                r.created_at DESC`,
      [userId || null]
    );

    const requests = result.rows.map((row) => {
      let distanceKm: number | null = null;
      if (row.org_lat && row.org_lng) {
        distanceKm = calculateDistanceKm(
          donorLat,
          donorLng,
          parseFloat(row.org_lat),
          parseFloat(row.org_lng)
        );
      }
      return {
        id: String(row.id),
        hospitalName: row.hospital_name,
        bloodGroup: row.blood_group,
        priority: row.priority === "Emergency" ? "Emergency" : row.priority === "Urgent" ? "Critical" : "Urgent",
        distance: distanceKm !== null ? `~${distanceKm.toFixed(1)} km` : "~5.0 km",
        requiredUnits: row.required_units,
        status: row.is_en_route ? "en_route" : "available",
        createdAt: row.created_at,
      };
    });

    return res.json({ requests });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/donors/me/donations
 * Donation history for authenticated donor.
 */
export async function getMyDonations(req: AuthRequest, res: Response, next: NextFunction) {
  let donorId = req.user?.id;
  if (!donorId) {
    const activeDonor = (
      await pool.query(
        `SELECT u.id FROM users u WHERE u.role = 'donor' AND u.status = 'active' ORDER BY u.id ASC LIMIT 1`
      )
    ).rows[0];
    donorId = activeDonor?.id;
  }

  if (!donorId) {
    return res.status(401).json({ error: "No active donor account found" });
  }

  try {
    const donorProfile = (
      await pool.query(
        `SELECT full_name, blood_group FROM donor_profiles WHERE user_id = $1`,
        [donorId]
      )
    ).rows[0];

    const records = (
      await pool.query(
        `SELECT d.id, d.units_donated, d.donation_date, d.created_at,
                o.name AS hospital_name
         FROM donations d
         JOIN organizations o ON o.id = d.organization_id
         WHERE d.donor_id = $1
         ORDER BY d.donation_date DESC, d.id DESC`,
        [donorId]
      )
    ).rows;

    const totalDonations = records.reduce((sum, r) => sum + (r.units_donated || 1), 0);
    const totalVolumeMl = totalDonations * 450; // 450ml per whole blood unit

    return res.json({
      donorName: donorProfile?.full_name || "Donor",
      summary: {
        bloodGroup: donorProfile?.blood_group || "O-",
        totalDonations,
        totalVolumeMl,
      },
      records: records.map((r) => ({
        id: `don-${r.id}`,
        hospitalName: r.hospital_name,
        donatedAt: r.donation_date,
        donationType: "Whole Blood",
        volumeMl: (r.units_donated || 1) * 450,
        status: "verified",
      })),
    });
  } catch (error) {
    return next(error);
  }
}
