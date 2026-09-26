import { query } from "./db";

function sanitizeDetails(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeDetails);

  const cleanObj: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes("password") ||
      lowerKey.includes("otp") ||
      lowerKey.includes("secret") ||
      lowerKey.includes("credential") ||
      lowerKey === "hash" ||
      lowerKey.endsWith("_hash") ||
      lowerKey.endsWith("hash")
    ) {
      cleanObj[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      cleanObj[key] = sanitizeDetails(value);
    } else {
      cleanObj[key] = value;
    }
  }
  return cleanObj;
}

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
    const sanitizedDetails = params.details ? sanitizeDetails(params.details) : null;
    await query(
      `INSERT INTO audit_logs (user_id, user_email, action, entity_type, entity_id, details, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        params.userId || null,
        params.userEmail || null,
        params.action,
        params.entityType || null,
        params.entityId || null,
        sanitizedDetails ? JSON.stringify(sanitizedDetails) : null,
        params.ipAddress || null,
      ]
    );
  } catch (err) {
    console.error("Failed to log audit event:", err);
  }
}

