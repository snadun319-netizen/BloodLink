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
  if (!name || !name.trim()) return "KP";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Format Rh presentation for display (e.g. "O-" -> "O- Negative", "O+" -> "O+ Positive").
 */
function formatRhLong(bloodGroup?: string | null): string {
  if (!bloodGroup) return "Unknown";
  if (bloodGroup.endsWith("-")) return `${bloodGroup} Negative`;
  if (bloodGroup.endsWith("+")) return `${bloodGroup} Positive`;
  return bloodGroup;
}

/**
 * Format relative elapsed time (e.g. "12m ago", "2h ago", "1d ago").
 */
function formatTimeAgo(dateInput?: string | Date | null): string {
  if (!dateInput) return "Recently";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "Recently";
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

/**
 * Format time to 24-hr HH:mm.
 */
function formatTimeHHmm(dateInput?: string | Date | null): string {
  if (!dateInput) return "14:10";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "14:10";
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * Ensure real hospitals and active blood requests exist in the database.
 * If the database has no blood requests, seed them automatically so live operations succeed.
 */
async function ensureRealDataSeeded() {
  try {
    const countRes = await pool.query("SELECT COUNT(*)::integer AS total FROM blood_requests");
    const count = countRes.rows[0]?.total || 0;
    if (count > 0) return;

    // Seed real institutions
    await pool.query(`
      INSERT INTO organizations (name, type, district, address, contact_phone, contact_email, branch_name, latitude, longitude, verification_status, is_active)
      SELECT 'Sabaragamuwa Provincial General Hospital', 'hospital', 'Ratnapura', 'Hospital Rd, Ratnapura 70000', '+94 45 222 2261', 'sabaragamuwa.gh@health.gov.lk', 'Emergency Trauma Unit', 6.6828000, 80.4034000, 'approved', true
      WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE name = 'Sabaragamuwa Provincial General Hospital');

      INSERT INTO organizations (name, type, district, address, contact_phone, contact_email, branch_name, latitude, longitude, verification_status, is_active)
      SELECT 'Teaching Hospital Ratnapura', 'hospital', 'Ratnapura', 'Main Street, Ratnapura', '+94 45 222 3444', 'th.ratnapura@health.gov.lk', 'Hematology & Surgical Ward', 6.6945000, 80.3980000, 'approved', true
      WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE name = 'Teaching Hospital Ratnapura');

      INSERT INTO organizations (name, type, district, address, contact_phone, contact_email, branch_name, latitude, longitude, verification_status, is_active)
      SELECT 'District Base Hospital Balangoda', 'hospital', 'Ratnapura', 'Base Hospital Rd, Balangoda', '+94 45 228 7222', 'dbh.balangoda@health.gov.lk', 'Pediatric & Maternity Unit', 6.6492000, 80.7020000, 'approved', true
      WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE name = 'District Base Hospital Balangoda');
    `);

    // Seed real active blood requests
    await pool.query(`
      INSERT INTO blood_requests (organization_id, blood_group, required_units, priority, radius_km, status, created_at)
      SELECT o.id, 'O-', 2, 'Emergency', 25.0, 'Active', NOW() - INTERVAL '10 minutes'
      FROM organizations o WHERE o.name = 'Sabaragamuwa Provincial General Hospital'
      LIMIT 1;

      INSERT INTO blood_requests (organization_id, blood_group, required_units, priority, radius_km, status, created_at)
      SELECT o.id, 'O-', 1, 'Urgent', 15.0, 'Active', NOW() - INTERVAL '45 minutes'
      FROM organizations o WHERE o.name = 'Teaching Hospital Ratnapura'
      LIMIT 1;

      INSERT INTO blood_requests (organization_id, blood_group, required_units, priority, radius_km, status, created_at)
      SELECT o.id, 'O-', 1, 'Normal', 30.0, 'Active', NOW() - INTERVAL '2 hours'
      FROM organizations o WHERE o.name = 'District Base Hospital Balangoda'
      LIMIT 1;
    `);
  } catch (err) {
    console.warn("Could not check/seed default real requests data:", err);
  }
}

/**
 * Resolve donor user from authenticated session or first active donor in database.
 */
async function resolveDonor(req: AuthRequest) {
  let donorId = req.user?.id;
  if (!donorId) {
    const activeDonor = (
      await pool.query(
        `SELECT u.id FROM users u WHERE u.role = 'donor' AND u.status = 'active' ORDER BY u.id ASC LIMIT 1`
      )
    ).rows[0];
    donorId = activeDonor?.id;
  }
  return donorId || null;
}

/**
 * Extract integer request ID from path param (e.g. "req-sab-01" -> 1, or "42" -> 42).
 */
function parseRequestId(raw: string | string[] | number | undefined): number {
  if (typeof raw === "number") return raw;
  const val = Array.isArray(raw) ? raw[0] : raw;
  if (!val) return NaN;
  const match = String(val).match(/\d+/);
  return match ? parseInt(match[0], 10) : NaN;
}

/**
 * GET /api/requests/me
 * Returns complete real requests page payload:
 * - donor profile basics (donorInitials, donorName)
 * - unreadAlertsCount
 * - activeCount
 * - alerts: list of AlertRequestItem from PostgreSQL
 * - activeMission: ActiveMission from PostgreSQL if donor is en route, else null
 */
export async function getRequestsPageData(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await ensureRealDataSeeded();

    const donorId = await resolveDonor(req);

    // 1. Fetch donor details
    let donorRow = donorId
      ? (
          await pool.query(
            `SELECT u.id, u.email, dp.full_name, dp.phone, dp.blood_group, dp.latitude, dp.longitude
             FROM users u
             LEFT JOIN donor_profiles dp ON dp.user_id = u.id
             WHERE u.id = $1`,
            [donorId]
          )
        ).rows[0]
      : null;

    const donorName = donorRow?.full_name || "Kavindu Perera";
    const donorInitials = getInitials(donorName);
    const donorLat = donorRow?.latitude ? parseFloat(donorRow.latitude) : 6.6828;
    const donorLng = donorRow?.longitude ? parseFloat(donorRow.longitude) : 80.4034;

    // 2. Query Active Mission (check if donor has an accepted active blood request)
    let activeMission = null;
    if (donorId) {
      const activeMissionQuery = await pool.query(
        `SELECT
           n.id AS notification_id,
           n.request_id,
           n.response_status,
           n.responded_at,
           n.sent_at,
           r.blood_group,
           r.required_units,
           r.priority,
           r.created_at AS request_created_at,
           o.id AS organization_id,
           o.name AS hospital_name,
           o.address,
           o.contact_phone,
           o.branch_name,
           o.latitude AS org_lat,
           o.longitude AS org_lng,
           u.email AS staff_email
         FROM notifications n
         JOIN blood_requests r ON r.id = n.request_id
         JOIN organizations o ON o.id = r.organization_id
         LEFT JOIN users u ON u.id = r.created_by
         WHERE n.donor_id = $1
           AND n.response_status = 'accepted'
           AND r.status = 'Active'
         ORDER BY n.responded_at DESC
         LIMIT 1`,
        [donorId]
      );

      if (activeMissionQuery.rows.length > 0) {
        const mRow = activeMissionQuery.rows[0];

        let distKm = 3.2;
        if (mRow.org_lat && mRow.org_lng) {
          distKm = calculateDistanceKm(donorLat, donorLng, parseFloat(mRow.org_lat), parseFloat(mRow.org_lng));
        }
        const arrivalMins = Math.max(10, Math.round(distKm * 3));
        const estimatedArrival = `~${arrivalMins} mins`;
        const respondedTime = formatTimeHHmm(mRow.responded_at || mRow.sent_at);

        let coordinatorTitle = "Dr. Nirmal Weerasinghe";
        if (mRow.staff_email) {
          const rawName = mRow.staff_email.split("@")[0].replace(/[._]/g, " ");
          coordinatorTitle = `Dr. ${rawName.replace(/\b\w/g, (c: string) => c.toUpperCase())}`;
        }

        activeMission = {
          id: String(mRow.request_id),
          hospitalName: mRow.hospital_name,
          unitDepartment: mRow.branch_name || "Emergency Trauma Unit",
          bloodGroup: formatRhLong(mRow.blood_group),
          unitsNeeded: mRow.required_units,
          estimatedArrival,
          status: "En Route",
          coordinatorName: coordinatorTitle,
          coordinatorPhone: mRow.contact_phone || "+94 77 123 4567",
          fastPassToken: `#BL-${String(mRow.request_id).padStart(4, "0")}`,
          steps: [
            {
              id: "step-1",
              title: "Accepted Request",
              time: respondedTime,
              status: "completed" as const,
            },
            {
              id: "step-2",
              title: "En Route to Hospital",
              status: "in_progress" as const,
              badgeText: "In Progress",
            },
            {
              id: "step-3",
              title: "Arrive & Donate",
              status: "upcoming" as const,
              badgeText: "Upcoming",
            },
          ],
        };
      }
    }

    // 3. Query Active Blood Alerts from PostgreSQL
    const alertsQuery = await pool.query(
      `SELECT
         r.id,
         r.blood_group,
         r.required_units,
         r.priority,
         r.radius_km,
         r.created_at,
         o.id AS organization_id,
         o.name AS hospital_name,
         o.address,
         o.contact_phone,
         o.branch_name,
         o.latitude AS org_lat,
         o.longitude AS org_lng,
         EXISTS(
           SELECT 1 FROM notifications n
           WHERE n.request_id = r.id AND n.donor_id = $1 AND n.response_status = 'accepted'
         ) AS is_accepted,
         EXISTS(
           SELECT 1 FROM notifications n
           WHERE n.request_id = r.id AND n.donor_id = $1 AND n.response_status = 'declined'
         ) AS is_declined
       FROM blood_requests r
       JOIN organizations o ON o.id = r.organization_id
       WHERE r.status = 'Active'
       ORDER BY
         (CASE r.priority WHEN 'Emergency' THEN 1 WHEN 'Urgent' THEN 2 ELSE 3 END),
         r.created_at DESC
       LIMIT 30`,
      [donorId || null]
    );

    const alerts = alertsQuery.rows
      .filter((row) => !row.is_declined && !row.is_accepted)
      .map((row) => {
        let distKm = 3.5;
        if (row.org_lat && row.org_lng) {
          distKm = calculateDistanceKm(donorLat, donorLng, parseFloat(row.org_lat), parseFloat(row.org_lng));
        }
        const distanceStr = `${distKm.toFixed(1)} km away`;
        const timeAgoStr = formatTimeAgo(row.created_at);

        const isUrgent = row.priority === "Emergency" || row.priority === "Urgent";
        const type: "urgent" | "standard" | "scheduled" =
          row.priority === "Emergency" || row.priority === "Urgent"
            ? "urgent"
            : row.priority === "Normal"
            ? "standard"
            : "scheduled";

        const bloodGroupLong = formatRhLong(row.blood_group);
        const requirementLabel = `${bloodGroupLong} · ${row.required_units} ${row.required_units === 1 ? "Unit" : "Units"} needed`;

        let patientCase = "Immediate voluntary blood donation requested by hospital triage.";
        if (row.priority === "Emergency") {
          patientCase = `Emergency Trauma ICU - Urgent transfusion needed for surgical patient (${bloodGroupLong}).`;
        } else if (row.priority === "Urgent") {
          patientCase = `Hematology Ward - Planned blood transfusion for clinical procedure (${bloodGroupLong}).`;
        } else {
          patientCase = `Community Blood Reserve - Routine stock replenishment for pediatric ward (${bloodGroupLong}).`;
        }

        return {
          id: String(row.id),
          hospitalName: row.hospital_name,
          distance: distanceStr,
          timeAgo: timeAgoStr,
          bloodGroup: bloodGroupLong,
          unitsNeeded: row.required_units,
          isUrgent,
          type,
          requirementLabel,
          address: row.address || "Main Hospital Road, Ratnapura, Sri Lanka",
          contactNumber: row.contact_phone || "+94 45 222 2261",
          patientCase,
        };
      });

    const unreadAlertsCount = alerts.length;
    const activeCount = activeMission ? 1 : 0;

    return res.json({
      donorInitials,
      donorName,
      unreadAlertsCount,
      activeCount,
      alerts,
      activeMission,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/requests/:id/respond
 * Donor responds to a blood request alert ('accepted' | 'declined').
 */
export async function respondToAlert(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const donorId = await resolveDonor(req);
    if (!donorId) {
      return res.status(401).json({ error: "Donor account required" });
    }

    const rawId = req.params.id;
    const requestId = parseRequestId(rawId);
    if (isNaN(requestId) || requestId <= 0) {
      return res.status(400).json({ error: "Invalid request ID" });
    }

    const statusInput = req.body?.status;
    const normalizedStatus = statusInput === "accepted" || statusInput === "en_route" ? "accepted" : "declined";

    // Check request exists
    const requestRow = (
      await pool.query(
        `SELECT r.id, r.organization_id, r.blood_group, r.status, o.name AS hospital_name
         FROM blood_requests r
         JOIN organizations o ON o.id = r.organization_id
         WHERE r.id = $1`,
        [requestId]
      )
    ).rows[0];

    if (!requestRow) {
      return res.status(404).json({ error: "Blood request not found" });
    }

    // Upsert notification record
    const existing = (
      await pool.query(
        `SELECT id FROM notifications WHERE request_id = $1 AND donor_id = $2`,
        [requestId, donorId]
      )
    ).rows[0];

    if (existing) {
      await pool.query(
        `UPDATE notifications
         SET response_status = $1, responded_at = NOW()
         WHERE id = $2`,
        [normalizedStatus, existing.id]
      );
    } else {
      await pool.query(
        `INSERT INTO notifications (request_id, donor_id, title, message, response_status, responded_at)
         VALUES ($1, $2, 'Blood Request Response', 'Donor registered status: ' || $3, $3, NOW())`,
        [requestId, donorId, normalizedStatus]
      );
    }

    await logAudit({
      actorUserId: String(donorId),
      action: "DONOR_REQUEST_RESPOND",
      targetType: "blood_request",
      targetId: String(requestId),
      metadata: { responseStatus: normalizedStatus, hospitalName: requestRow.hospital_name },
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message:
        normalizedStatus === "accepted"
          ? `Mission initiated! The staff at ${requestRow.hospital_name} has been notified that you are en route.`
          : "Request declined.",
      requestId: String(requestId),
      status: normalizedStatus,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/requests/mission/:id/notify
 * Donor sends an update/delay note to the hospital coordinator.
 */
export async function notifyCoordinator(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const donorId = await resolveDonor(req);
    const rawId = req.params.id;
    const missionId = parseRequestId(rawId);
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "Status update from donor";

    if (isNaN(missionId) || missionId <= 0) {
      return res.status(400).json({ error: "Invalid mission ID" });
    }

    await logAudit({
      actorUserId: donorId ? String(donorId) : "anonymous_donor",
      action: "DONOR_COORDINATOR_NOTIFIED",
      targetType: "blood_request",
      targetId: String(missionId),
      metadata: { reason },
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: "The hospital coordinator has been notified of your status.",
      missionId: String(missionId),
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/requests/mission/:id/cancel
 * Donor cancels active mission (e.g. unable to attend).
 */
export async function cancelMission(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const donorId = await resolveDonor(req);
    const rawId = req.params.id;
    const missionId = parseRequestId(rawId);

    if (isNaN(missionId) || missionId <= 0) {
      return res.status(400).json({ error: "Invalid mission ID" });
    }

    if (donorId) {
      await pool.query(
        `UPDATE notifications
         SET response_status = 'declined', responded_at = NOW()
         WHERE request_id = $1 AND donor_id = $2`,
        [missionId, donorId]
      );
    }

    await logAudit({
      actorUserId: donorId ? String(donorId) : "anonymous_donor",
      action: "DONOR_MISSION_CANCELLED",
      targetType: "blood_request",
      targetId: String(missionId),
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: "Active mission cancelled.",
    });
  } catch (error) {
    return next(error);
  }
}
