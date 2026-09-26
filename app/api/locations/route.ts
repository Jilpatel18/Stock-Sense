import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { initDatabase } from "@/lib/schema";
import { requireManager, requireAuth, handleAuthError } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

export async function GET(request: Request) {
  try {
    await initDatabase();
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get("warehouse_id");
    const includeInactive = searchParams.get("include_inactive") === "true";

    let sql = `
      SELECT l.*, w.name as warehouse_name, w.code as warehouse_code
      FROM locations l
      JOIN warehouses w ON l.warehouse_id = w.id
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    if (!includeInactive) {
      conditions.push(`l.active = TRUE`);
    }

    if (warehouseId) {
      params.push(parseInt(warehouseId));
      conditions.push(`l.warehouse_id = $${params.length}`);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(" AND ");
    }
    sql += ` ORDER BY w.name ASC, l.name ASC`;

    const res = await query(sql, params);
    return NextResponse.json({ locations: res.rows });
  } catch (err: any) {
    const authErr = handleAuthError(err);
    if (authErr) return authErr;
    return NextResponse.json({ error: err.message || "Failed to fetch locations" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initDatabase();
    const user = await requireManager();
    const { warehouse_id, name, code, location_type } = await request.json();

    if (!warehouse_id || !name || !code) {
      return NextResponse.json(
        { error: "Warehouse ID, Location Name, and Code are required" },
        { status: 400 }
      );
    }

    const whId = parseInt(warehouse_id);
    const trimmedCode = code.trim().toUpperCase();

    // Check code uniqueness within warehouse
    const existing = await query(
      `SELECT id FROM locations WHERE warehouse_id = $1 AND UPPER(code) = $2`,
      [whId, trimmedCode]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: `Location code "${trimmedCode}" already exists in this warehouse.` },
        { status: 400 }
      );
    }

    const res = await query(
      `INSERT INTO locations (warehouse_id, name, code, location_type, active)
       VALUES ($1, $2, $3, $4, TRUE) RETURNING *`,
      [whId, name.trim(), trimmedCode, location_type || "STORAGE"]
    );

    const location = res.rows[0];

    await logAuditEvent({
      userId: user.id,
      userEmail: user.email,
      action: "LOCATION_CREATE",
      entityType: "LOCATION",
      entityId: location.id,
      details: { name: location.name, code: location.code, warehouse_id: whId },
    });

    return NextResponse.json({ success: true, location });
  } catch (err: any) {
    const authErr = handleAuthError(err);
    if (authErr) return authErr;
    return NextResponse.json({ error: err.message || "Failed to create location" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await initDatabase();
    const user = await requireManager();
    const { id, warehouse_id, name, code, location_type, active } = await request.json();

    if (!id) return NextResponse.json({ error: "Location ID is required" }, { status: 400 });
    if (!name || !name.trim()) return NextResponse.json({ error: "Location name is required" }, { status: 400 });
    if (!code || !code.trim()) return NextResponse.json({ error: "Location code is required" }, { status: 400 });

    const whId = parseInt(warehouse_id);
    const trimmedCode = code.trim().toUpperCase();

    // Check uniqueness excluding current location
    const existing = await query(
      `SELECT id FROM locations WHERE warehouse_id = $1 AND UPPER(code) = $2 AND id != $3`,
      [whId, trimmedCode, id]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: `Location code "${trimmedCode}" already exists in this warehouse.` },
        { status: 400 }
      );
    }

    const res = await query(
      `UPDATE locations 
       SET warehouse_id = $1, name = $2, code = $3, location_type = $4, active = $5 
       WHERE id = $6 RETURNING *`,
      [
        whId,
        name.trim(),
        trimmedCode,
        location_type || "STORAGE",
        active !== undefined ? Boolean(active) : true,
        id,
      ]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    await logAuditEvent({
      userId: user.id,
      userEmail: user.email,
      action: "LOCATION_UPDATE",
      entityType: "LOCATION",
      entityId: id,
      details: { name: name.trim(), code: trimmedCode, active },
    });

    return NextResponse.json({ success: true, location: res.rows[0] });
  } catch (err: any) {
    const authErr = handleAuthError(err);
    if (authErr) return authErr;
    return NextResponse.json({ error: err.message || "Failed to update location" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await initDatabase();
    const user = await requireManager();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "Location ID is required" }, { status: 400 });

    // Check stock or ledger history
    const checkStock = await query(`SELECT COUNT(*) FROM inventory WHERE location_id = $1 AND quantity > 0`, [id]);
    const hasStock = parseInt(checkStock.rows[0].count) > 0;

    if (hasStock) {
      await query(`UPDATE locations SET active = FALSE WHERE id = $1`, [id]);
      await logAuditEvent({
        userId: user.id,
        userEmail: user.email,
        action: "LOCATION_DEACTIVATE",
        entityType: "LOCATION",
        entityId: parseInt(id),
      });
      return NextResponse.json({
        success: true,
        message: "Location deactivated (contains active stock). Historical records preserved.",
      });
    } else {
      await query(`UPDATE locations SET active = FALSE WHERE id = $1`, [id]);
      await logAuditEvent({
        userId: user.id,
        userEmail: user.email,
        action: "LOCATION_DEACTIVATE",
        entityType: "LOCATION",
        entityId: parseInt(id),
      });
      return NextResponse.json({ success: true, message: "Location deactivated." });
    }
  } catch (err: any) {
    const authErr = handleAuthError(err);
    if (authErr) return authErr;
    return NextResponse.json({ error: err.message || "Failed to delete location" }, { status: 500 });
  }
}
