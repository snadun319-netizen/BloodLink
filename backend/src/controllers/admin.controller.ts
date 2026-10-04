import { Request, Response } from "express";
import { pool } from "../db";
import { logAudit } from "../services/audit.service";

export async function listUsers(req: Request, res: Response) {
  const { role, status } = req.query;

  try {
    let query = `SELECT id, email, role, organization_id, status, created_at FROM users WHERE 1=1`;
    const params: string[] = [];

    if (role) {
      params.push(role as string);
      query += ` AND role = $${params.length}`;
    }

    if (status) {
      params.push(status as string);
      query += ` AND status = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, params);
    return res.status(200).json({ users: result.rows });
  } catch (err) {
    console.error("List users error:", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}

export async function updateUserStatus(req: Request, res: Response) {
  const { id } = req.params;
  const { status } = req.body;
  const adminId = (req as any).user.id;

  const allowedStatuses = ["active", "suspended"];
  if (!status || !allowedStatuses.includes(status)) {
    return res
      .status(400)
      .json({ error: "Status must be 'active' or 'suspended'" });
  }

  if (id === adminId) {
    return res.status(403).json({ error: "You cannot change your own status" });
  }

  try {
    const result = await pool.query(
      `UPDATE users SET status = $1 WHERE id = $2 RETURNING id, email, role, status`,
      [status, id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    await logAudit({
      actorUserId: adminId,
      action: status === "active" ? "USER_ACTIVATED" : "USER_SUSPENDED",
      targetType: "user",
      targetId: id as string,
      metadata: { email: result.rows[0].email, role: result.rows[0].role },
    });

    return res.status(200).json({ user: result.rows[0] });
  } catch (err) {
    console.error("Update user status error:", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}

export async function getDashboardStats(req: Request, res: Response) {
  try {
    const [
      totalDonors,
      totalOrganizations,
      pendingOrgVerifications,
      pendingDonorVerifications,
      pendingStaffVerifications,
    ] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM users WHERE role = 'donor'`),
      pool.query(
        `SELECT COUNT(*) FROM organizations WHERE verification_status = 'approved'`,
      ),
      pool.query(
        `SELECT COUNT(*) FROM organizations WHERE verification_status = 'pending'`,
      ),
      pool.query(
        `SELECT COUNT(*) FROM donor_verifications WHERE status = 'pending'`,
      ),
      pool.query(
        `SELECT COUNT(*) FROM users WHERE status = 'suspended' AND role IN ('hospital_staff', 'bloodbank_staff')`,
      ),
    ]);

    return res.status(200).json({
      totalDonors: parseInt(totalDonors.rows[0].count),
      totalOrganizations: parseInt(totalOrganizations.rows[0].count),
      pendingOrganizationVerifications: parseInt(
        pendingOrgVerifications.rows[0].count,
      ),
      pendingDonorVerifications: parseInt(
        pendingDonorVerifications.rows[0].count,
      ),
      pendingStaffVerifications: parseInt(
        pendingStaffVerifications.rows[0].count,
      ),
    });
  } catch (err) {
    console.error("Get dashboard stats error:", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}

export async function listAuditLogs(req: Request, res: Response) {
  const { action, limit } = req.query;

  try {
    let query = `
      SELECT al.id, al.action, al.target_type, al.target_id, al.metadata,
             al.created_at, u.email AS actor_email
      FROM audit_logs al
      JOIN users u ON al.actor_user_id = u.id
      WHERE 1=1
    `;
    const params: string[] = [];

    if (action) {
      params.push(action as string);
      query += ` AND al.action = $${params.length}`;
    }

    query += ` ORDER BY al.created_at DESC`;

    const maxLimit = limit ? Math.min(parseInt(limit as string), 100) : 50;
    params.push(maxLimit.toString());
    query += ` LIMIT $${params.length}`;

    const result = await pool.query(query, params);
    return res.status(200).json({ logs: result.rows });
  } catch (err) {
    console.error("List audit logs error:", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}