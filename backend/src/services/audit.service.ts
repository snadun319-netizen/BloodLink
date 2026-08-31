import { pool } from "../db";

interface AuditLogParams {
  actorUserId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export async function logAudit(params: AuditLogParams) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (actor_user_id, action, target_type, target_id, metadata, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        params.actorUserId,
        params.action,
        params.targetType || null,
        params.targetId || null,
        params.metadata ? JSON.stringify(params.metadata) : null,
        params.ipAddress || null,
      ],
    );
  } catch (err) {
    console.error("Audit log error:", err);
  }
}
