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
    const includeInactive = searchParams.get("include_inactive") === "true";

    let whSql = `SELECT * FROM warehouses`;
    if (!includeInactive) {
      whSql += ` WHERE active = TRUE`;
    }
    whSql += ` ORDER BY name ASC`;

    const whRes = await query(whSql);
    const warehouses = whRes.rows;

    for (const wh of warehouses) {
      let locSql = `SELECT * FROM locations WHERE warehouse_id = $1`;
      if (!includeInactive) {
        locSql += ` AND active = TRUE`;
      }
      locSql += ` ORDER BY name ASC`;

      const locRes = await query(locSql, [wh.id]);
      wh.locations = locRes.rows;
    }

    return NextResponse.json({ warehouses });
  } catch (err: any) {
    const authErr = handleAuthError(err);
    if (authErr) return authErr;
    return NextResponse.json({ error: err.message || "Failed to fetch warehouses" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initDatabase();
    const user = await requireManager();
    const { name, code, address } = await request.json();

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Warehouse name is required" }, { status: 400 });
    }

    if (!code || typeof code !== "string" || !code.trim()) {
      return NextResponse.json({ error: "Warehouse code is required" }, { status: 400 });
    }

    const trimmedCode = code.trim().toUpperCase();

    // Check code uniqueness
    const existing = await query(`SELECT id FROM warehouses WHERE UPPER(code) = $1`, [trimmedCode]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: `Warehouse with code "${trimmedCode}" already exists.` }, { status: 400 });
    }

    const res = await query(
      `INSERT INTO warehouses (name, code, address, active) VALUES ($1, $2, $3, TRUE) RETURNING *`,
      [name.trim(), trimmedCode, address ? address.trim() : null]
    );

    const warehouse = res.rows[0];

    await logAuditEvent({
      userId: user.id,
      userEmail: user.email,
      action: "WAREHOUSE_CREATE",
      entityType: "WAREHOUSE",
      entityId: warehouse.id,
      details: { name: warehouse.name, code: warehouse.code },
    });

    return NextResponse.json({ success: true, warehouse });
  } catch (err: any) {
    const authErr = handleAuthError(err);
    if (authErr) return authErr;
    return NextResponse.json({ error: err.message || "Failed to create warehouse" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await initDatabase();
    const user = await requireManager();
    const { id, name, code, address, active } = await request.json();

    if (!id) return NextResponse.json({ error: "Warehouse ID is required" }, { status: 400 });
    if (!name || !name.trim()) return NextResponse.json({ error: "Warehouse name is required" }, { status: 400 });
    if (!code || !code.trim()) return NextResponse.json({ error: "Warehouse code is required" }, { status: 400 });

    const trimmedCode = code.trim().toUpperCase();

    // Check code uniqueness excluding current warehouse
    const existing = await query(
      `SELECT id FROM warehouses WHERE UPPER(code) = $1 AND id != $2`,
      [trimmedCode, id]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: `Warehouse code "${trimmedCode}" is already in use.` }, { status: 400 });
    }

    const res = await query(
      `UPDATE warehouses 
       SET name = $1, code = $2, address = $3, active = $4, updated_at = NOW() 
       WHERE id = $5 RETURNING *`,
      [name.trim(), trimmedCode, address ? address.trim() : null, active !== undefined ? Boolean(active) : true, id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Warehouse not found" }, { status: 404 });
    }

    await logAuditEvent({
      userId: user.id,
      userEmail: user.email,
      action: "WAREHOUSE_UPDATE",
      entityType: "WAREHOUSE",
      entityId: id,
      details: { name: name.trim(), code: trimmedCode, active },
    });

    return NextResponse.json({ success: true, warehouse: res.rows[0] });
  } catch (err: any) {
    const authErr = handleAuthError(err);
    if (authErr) return authErr;
    return NextResponse.json({ error: err.message || "Failed to update warehouse" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await initDatabase();
    const user = await requireManager();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "Warehouse ID is required" }, { status: 400 });

    // Check stock ledger references or inventory for locations under this warehouse
    const checkStock = await query(
      `SELECT COUNT(*) FROM inventory i
       JOIN locations l ON i.location_id = l.id
       WHERE l.warehouse_id = $1 AND i.quantity > 0`,
      [id]
    );
    const hasStock = parseInt(checkStock.rows[0].count) > 0;

    if (hasStock) {
      // Soft deactivate
      await query(`UPDATE warehouses SET active = FALSE WHERE id = $1`, [id]);
      await logAuditEvent({
        userId: user.id,
        userEmail: user.email,
        action: "WAREHOUSE_DEACTIVATE",
        entityType: "WAREHOUSE",
        entityId: parseInt(id),
      });
      return NextResponse.json({
        success: true,
        message: "Warehouse deactivated (contains active stock). Historical records preserved.",
      });
    } else {
      await query(`UPDATE warehouses SET active = FALSE WHERE id = $1`, [id]);
      await logAuditEvent({
        userId: user.id,
        userEmail: user.email,
        action: "WAREHOUSE_DEACTIVATE",
        entityType: "WAREHOUSE",
        entityId: parseInt(id),
      });
      return NextResponse.json({ success: true, message: "Warehouse deactivated." });
    }
  } catch (err: any) {
    const authErr = handleAuthError(err);
    if (authErr) return authErr;
    return NextResponse.json({ error: err.message || "Failed to delete warehouse" }, { status: 500 });
  }
}
