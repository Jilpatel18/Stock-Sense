import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { initDatabase } from "@/lib/schema";

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    await initDatabase();
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

    product.total_stock = totalStock;
    product.reorder_level = parseFloat(product.reorder_level);
    product.is_low_stock = totalStock <= product.reorder_level;
    product.locations = locRes.rows;
    product.history = ledgerRes.rows;

    return NextResponse.json({ product });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch product" }, { status: 500 });
  }
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    await initDatabase();
    const params = await props.params;
    const id = parseInt(params.id);
    const body = await request.json();
    const { name, sku, category_id, unit_of_measure, reorder_level } = body;

    const res = await query(
      `UPDATE products 
       SET name = $1, sku = $2, category_id = $3, unit_of_measure = $4, reorder_level = $5, updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [name, sku, category_id ? parseInt(category_id) : null, unit_of_measure, parseFloat(reorder_level), id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, product: res.rows[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    await initDatabase();
    const params = await props.params;
    const id = parseInt(params.id);

    await query(`DELETE FROM products WHERE id = $1`, [id]);
    return NextResponse.json({ success: true, message: "Product deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete product" }, { status: 500 });
  }
}
