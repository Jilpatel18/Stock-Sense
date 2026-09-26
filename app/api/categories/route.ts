import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { initDatabase } from "@/lib/schema";
import { requireManager, handleAuthError, getCurrentUser } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

export async function GET(request: Request) {
  try {
    await initDatabase();
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("include_inactive") === "true";

    let sql = `SELECT * FROM categories`;
    if (!includeInactive) {
      sql += ` WHERE active = TRUE`;
    }
    sql += ` ORDER BY name ASC`;

    const res = await query(sql);
    return NextResponse.json({ categories: res.rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initDatabase();
    const user = await requireManager();
    const { name, description } = await request.json();

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    const trimmedName = name.trim();

    // Prevent duplicate name
    const existing = await query(`SELECT id FROM categories WHERE LOWER(name) = LOWER($1)`, [trimmedName]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: `Category "${trimmedName}" already exists.` }, { status: 400 });
    }

    const res = await query(
      `INSERT INTO categories (name, description, active) VALUES ($1, $2, TRUE) RETURNING *`,
      [trimmedName, description ? description.trim() : null]
    );

    const category = res.rows[0];

    await logAuditEvent({
      userId: user.id,
      userEmail: user.email,
      action: "CATEGORY_CREATE",
      entityType: "CATEGORY",
      entityId: category.id,
      details: { name: category.name },
    });

    return NextResponse.json({ success: true, category });
  } catch (err: any) {
    const authErr = handleAuthError(err);
    if (authErr) return authErr;
    return NextResponse.json({ error: err.message || "Failed to create category" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await initDatabase();
    const user = await requireManager();
    const { id, name, description, active } = await request.json();

    if (!id) return NextResponse.json({ error: "Category ID is required" }, { status: 400 });
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    const trimmedName = name.trim();

    // Check duplicate name on other category
    const existing = await query(
      `SELECT id FROM categories WHERE LOWER(name) = LOWER($1) AND id != $2`,
      [trimmedName, id]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: `Category "${trimmedName}" already exists.` }, { status: 400 });
    }

    const res = await query(
      `UPDATE categories 
       SET name = $1, description = $2, active = $3 
       WHERE id = $4 RETURNING *`,
      [trimmedName, description ? description.trim() : null, active !== undefined ? Boolean(active) : true, id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    await logAuditEvent({
      userId: user.id,
      userEmail: user.email,
      action: "CATEGORY_UPDATE",
      entityType: "CATEGORY",
      entityId: id,
      details: { name: trimmedName, active },
    });

    return NextResponse.json({ success: true, category: res.rows[0] });
  } catch (err: any) {
    const authErr = handleAuthError(err);
    if (authErr) return authErr;
    return NextResponse.json({ error: err.message || "Failed to update category" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await initDatabase();
    const user = await requireManager();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "Category ID is required" }, { status: 400 });

    // Check if category is referenced by products
    const prodCount = await query(`SELECT COUNT(*) FROM products WHERE category_id = $1`, [id]);
    const count = parseInt(prodCount.rows[0].count);

    if (count > 0) {
      // Soft deactivate
      await query(`UPDATE categories SET active = FALSE WHERE id = $1`, [id]);
      await logAuditEvent({
        userId: user.id,
        userEmail: user.email,
        action: "CATEGORY_DEACTIVATE",
        entityType: "CATEGORY",
        entityId: parseInt(id),
      });
      return NextResponse.json({
        success: true,
        message: `Category deactivated (referenced by ${count} products). Historical data preserved.`,
      });
    } else {
      await query(`DELETE FROM categories WHERE id = $1`, [id]);
      await logAuditEvent({
        userId: user.id,
        userEmail: user.email,
        action: "CATEGORY_DELETE",
        entityType: "CATEGORY",
        entityId: parseInt(id),
      });
      return NextResponse.json({ success: true, message: "Category deleted successfully." });
    }
  } catch (err: any) {
    const authErr = handleAuthError(err);
    if (authErr) return authErr;
    return NextResponse.json({ error: err.message || "Failed to delete category" }, { status: 500 });
  }
}
