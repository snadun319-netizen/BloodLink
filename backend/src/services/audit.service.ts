import { pool } from "../db";
import { PoolClient } from 'pg';

interface AuditLogParams {
  actorUserId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export async function logAudit(params: AuditLogParams, client?: PoolClient) {
  const persist = async () => {
    await (client || pool).query(
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
  };
  if (client) return persist();
  try { await persist(); } catch {
    console.error("Audit log could not be persisted");
  }
}
