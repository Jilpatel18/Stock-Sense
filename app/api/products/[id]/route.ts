import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { initDatabase } from "@/lib/schema";
import { requireManager, requireAuth, handleAuthError } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    await initDatabase();
    await requireAuth();
    const params = await props.params;
    const id = parseInt(params.id);

    const prodRes = await query(
      `SELECT p.*, c.name as category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = $1`,
      [id]
    );

    if (prodRes.rows.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const product = prodRes.rows[0];

    // Locations
    const locRes = await query(
      `SELECT i.quantity, l.id as location_id, l.name as location_name, l.code as location_code, w.name as warehouse_name
       FROM inventory i
       JOIN locations l ON i.location_id = l.id
       JOIN warehouses w ON l.warehouse_id = w.id
       WHERE i.product_id = $1`,
      [id]
    );

    // Ledger History
    const ledgerRes = await query(
      `SELECT sl.*, l.name as location_name, u.name as performed_by_name
       FROM stock_ledger sl
       LEFT JOIN locations l ON sl.location_id = l.id
       LEFT JOIN users u ON sl.performed_by = u.id
       WHERE sl.product_id = $1
       ORDER BY sl.created_at DESC`,
      [id]
    );

    let totalStock = 0;
    locRes.rows.forEach((r) => {
      totalStock += parseFloat(r.quantity);
    });

    const reorderLevel = parseFloat(product.reorder_level);
    let stockStatus = "NORMAL";
    if (totalStock === 0) stockStatus = "OUT_OF_STOCK";
    else if (totalStock <= reorderLevel) stockStatus = "LOW_STOCK";

    product.total_stock = totalStock;
    product.reorder_level = reorderLevel;
    product.is_low_stock = totalStock <= reorderLevel;
    product.stock_status = stockStatus;
    product.locations = locRes.rows;
    product.history = ledgerRes.rows;

    return NextResponse.json({ product });
  } catch (err: any) {
    const authErr = handleAuthError(err);
    if (authErr) return authErr;
    return NextResponse.json({ error: err.message || "Failed to fetch product" }, { status: 500 });
  }
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    await initDatabase();
    const user = await requireManager();
    const params = await props.params;
    const id = parseInt(params.id);
    const body = await request.json();
    const { name, sku, category_id, unit_of_measure, reorder_level, active } = body;

    if (!name || !name.trim()) return NextResponse.json({ error: "Product name is required" }, { status: 400 });
    if (!sku || !sku.trim()) return NextResponse.json({ error: "Product SKU is required" }, { status: 400 });

    const trimmedSku = sku.trim().toUpperCase();

    // Check SKU uniqueness excluding current product
    const skuCheck = await query(
      `SELECT id FROM products WHERE UPPER(sku) = $1 AND id != $2`,
      [trimmedSku, id]
    );
    if (skuCheck.rows.length > 0) {
      return NextResponse.json({ error: `Product SKU "${trimmedSku}" is already in use.` }, { status: 400 });
    }

    const res = await query(
      `UPDATE products 
       SET name = $1, sku = $2, category_id = $3, unit_of_measure = $4, reorder_level = $5, active = $6, updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [
        name.trim(),
        trimmedSku,
        category_id ? parseInt(category_id) : null,
        unit_of_measure ? unit_of_measure.trim() : "PCS",
        reorder_level ? parseFloat(reorder_level) : 10,
        active !== undefined ? Boolean(active) : true,
        id,
      ]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    await logAuditEvent({
      userId: user.id,
      userEmail: user.email,
      action: "PRODUCT_UPDATE",
      entityType: "PRODUCT",
      entityId: id,
      details: { name: name.trim(), sku: trimmedSku, active },
    });

    return NextResponse.json({ success: true, product: res.rows[0] });
  } catch (err: any) {
    const authErr = handleAuthError(err);
    if (authErr) return authErr;
    return NextResponse.json({ error: err.message || "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    await initDatabase();
    const user = await requireManager();
    const params = await props.params;
    const id = parseInt(params.id);

    // Check if product has ledger history
    const ledgerCheck = await query(`SELECT COUNT(*) FROM stock_ledger WHERE product_id = $1`, [id]);
    const ledgerCount = parseInt(ledgerCheck.rows[0].count);

    if (ledgerCount > 0) {
      // Soft deactivate to preserve audit & ledger integrity
      await query(`UPDATE products SET active = FALSE WHERE id = $1`, [id]);
      await logAuditEvent({
        userId: user.id,
        userEmail: user.email,
        action: "PRODUCT_DEACTIVATE",
        entityType: "PRODUCT",
        entityId: id,
        details: { reason: "Has ledger records" },
      });
      return NextResponse.json({
        success: true,
        message: `Product deactivated (${ledgerCount} stock ledger records preserved).`,
      });
    } else {
      await query(`DELETE FROM products WHERE id = $1`, [id]);
      await logAuditEvent({
        userId: user.id,
        userEmail: user.email,
        action: "PRODUCT_DELETE",
        entityType: "PRODUCT",
        entityId: id,
      });
      return NextResponse.json({ success: true, message: "Product deleted successfully" });
    }
  } catch (err: any) {
    const authErr = handleAuthError(err);
    if (authErr) return authErr;
    return NextResponse.json({ error: err.message || "Failed to delete product" }, { status: 500 });
  }
}
