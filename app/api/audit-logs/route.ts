import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { initDatabase } from "@/lib/schema";
import { requireManager, handleAuthError } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    await initDatabase();
    await requireManager();

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const userId = searchParams.get("user_id");
    const search = searchParams.get("search");

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    let baseSql = `
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
    `;

    const params: any[] = [];
    const conditions: string[] = [];

    if (action) {
      params.push(action);
      conditions.push(`a.action = $${params.length}`);
    }

    if (userId) {
      params.push(parseInt(userId));
      conditions.push(`a.user_id = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      const searchParam = `$${params.length}`;
      conditions.push(
        `(a.action ILIKE ${searchParam} OR a.user_email ILIKE ${searchParam} OR u.name ILIKE ${searchParam})`
      );
    }

    let whereClause = "";
    if (conditions.length > 0) {
      whereClause = ` WHERE ` + conditions.join(" AND ");
    }

    const countRes = await query(`SELECT COUNT(*) as total ${baseSql} ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].total);

    const dataSql = `
      SELECT a.*, u.name as user_name
      ${baseSql}
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const dataRes = await query(dataSql, [...params, limit, offset]);

    return NextResponse.json({
      auditLogs: dataRes.rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err: any) {
    const authErr = handleAuthError(err);
    if (authErr) return authErr;
    return NextResponse.json({ error: err.message || "Failed to fetch audit logs" }, { status: 500 });
  }
}
