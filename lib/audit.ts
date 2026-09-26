import { query } from "./db";

export async function logAuditEvent(params: {
  userId?: number | null;
  userEmail?: string | null;
  action: string;
  entityType?: string;
  entityId?: number;
  details?: Record<string, any>;
  ipAddress?: string;
}) {
  try {
    await query(
      `INSERT INTO audit_logs (user_id, user_email, action, entity_type, entity_id, details, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        params.userId || null,
        params.userEmail || null,
        params.action,
        params.entityType || null,
        params.entityId || null,
        params.details ? JSON.stringify(params.details) : null,
        params.ipAddress || null,
      ]
    );
  } catch (err) {
    console.error("Failed to log audit event:", err);
  }
}
