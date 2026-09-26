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
    const search = searchParams.get("search");
    const includeInactive = searchParams.get("include_inactive") === "true";

    let sql = `SELECT * FROM suppliers`;
    const params: any[] = [];
    const conditions: string[] = [];

    if (!includeInactive) {
      conditions.push(`active = TRUE`);
    }

    if (search) {
      params.push(`%${search}%`);
      const p = `$${params.length}`;
      conditions.push(`(name ILIKE ${p} OR contact_name ILIKE ${p} OR email ILIKE ${p} OR phone ILIKE ${p})`);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(" AND ");
    }
    sql += ` ORDER BY name ASC`;

    const res = await query(sql, params);
    return NextResponse.json({ suppliers: res.rows });
  } catch (err: any) {
    const authErr = handleAuthError(err);
    if (authErr) return authErr;
    return NextResponse.json({ error: err.message || "Failed to fetch suppliers" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initDatabase();
    const user = await requireManager();
    const { name, contact_name, email, phone, address } = await request.json();

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Supplier name is required" }, { status: 400 });
    }

    const res = await query(
      `INSERT INTO suppliers (name, contact_name, email, phone, address, active)
       VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING *`,
      [
        name.trim(),
        contact_name ? contact_name.trim() : null,
        email ? email.trim() : null,
        phone ? phone.trim() : null,
        address ? address.trim() : null,
      ]
    );

    const supplier = res.rows[0];

    await logAuditEvent({
      userId: user.id,
      userEmail: user.email,
      action: "SUPPLIER_CREATE",
      entityType: "SUPPLIER",
      entityId: supplier.id,
      details: { name: supplier.name },
    });

    return NextResponse.json({ success: true, supplier });
  } catch (err: any) {
    const authErr = handleAuthError(err);
    if (authErr) return authErr;
    return NextResponse.json({ error: err.message || "Failed to create supplier" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await initDatabase();
    const user = await requireManager();
    const { id, name, contact_name, email, phone, address, active } = await request.json();

    if (!id) return NextResponse.json({ error: "Supplier ID is required" }, { status: 400 });
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Supplier name is required" }, { status: 400 });
    }

    const res = await query(
      `UPDATE suppliers 
       SET name = $1, contact_name = $2, email = $3, phone = $4, address = $5, active = $6 
       WHERE id = $7 RETURNING *`,
      [
        name.trim(),
        contact_name ? contact_name.trim() : null,
        email ? email.trim() : null,
        phone ? phone.trim() : null,
        address ? address.trim() : null,
        active !== undefined ? Boolean(active) : true,
        id,
      ]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    await logAuditEvent({
      userId: user.id,
      userEmail: user.email,
      action: "SUPPLIER_UPDATE",
      entityType: "SUPPLIER",
      entityId: id,
      details: { name: name.trim(), active },
    });

    return NextResponse.json({ success: true, supplier: res.rows[0] });
  } catch (err: any) {
    const authErr = handleAuthError(err);
    if (authErr) return authErr;
    return NextResponse.json({ error: err.message || "Failed to update supplier" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await initDatabase();
    const user = await requireManager();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "Supplier ID is required" }, { status: 400 });

    try {
      await query(`DELETE FROM suppliers WHERE id = $1`, [id]);
      await logAuditEvent({
        userId: user.id,
        userEmail: user.email,
        action: "SUPPLIER_DELETE",
        entityType: "SUPPLIER",
        entityId: parseInt(id),
      });
      return NextResponse.json({ success: true, message: "Supplier permanently deleted." });
    } catch {
      await query(`UPDATE suppliers SET active = FALSE WHERE id = $1`, [id]);
      await logAuditEvent({
        userId: user.id,
        userEmail: user.email,
        action: "SUPPLIER_DEACTIVATE",
        entityType: "SUPPLIER",
        entityId: parseInt(id),
      });
      return NextResponse.json({
        success: true,
        message: "Supplier deactivated. Historical transaction records preserved.",
      });
    }
  } catch (err: any) {
    const authErr = handleAuthError(err);
    if (authErr) return authErr;
    return NextResponse.json({ error: err.message || "Failed to delete supplier" }, { status: 500 });
  }
}
