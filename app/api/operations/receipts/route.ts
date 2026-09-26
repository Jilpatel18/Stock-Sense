import { NextResponse } from "next/server";
import { query, pool } from "@/lib/db";
import { initDatabase } from "@/lib/schema";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    await initDatabase();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let sql = `
      SELECT r.*, s.name as supplier_name, l.name as destination_location_name,
             w.name as warehouse_name, u.name as created_by_name
      FROM receipts r
      LEFT JOIN suppliers s ON r.supplier_id = s.id
      JOIN locations l ON r.destination_location_id = l.id
      JOIN warehouses w ON l.warehouse_id = w.id
      LEFT JOIN users u ON r.created_by = u.id
    `;
    const params: any[] = [];
    if (status) {
      params.push(status);
      sql += ` WHERE r.status = $1`;
    }
    sql += ` ORDER BY r.created_at DESC`;

    const res = await query(sql, params);
    const receipts = res.rows;

    for (const rec of receipts) {
      const itemsRes = await query(
        `SELECT ri.*, p.name as product_name, p.sku, p.unit_of_measure
         FROM receipt_items ri
         JOIN products p ON ri.product_id = p.id
         WHERE ri.receipt_id = $1`,
        [rec.id]
      );
      rec.items = itemsRes.rows;
    }

    return NextResponse.json({ receipts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    const body = await request.json();
    const { supplier_id, destination_location_id, status, items } = body;

    if (!destination_location_id || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Destination location and at least one item are required" },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Generate receipt number (REC-00001)
      const countRes = await client.query(`SELECT COUNT(*) FROM receipts`);
      const nextNum = parseInt(countRes.rows[0].count) + 1;
      const receiptNumber = `REC-${String(nextNum).padStart(5, "0")}`;

      const recStatus = status || "Draft";

      const recRes = await client.query(
        `INSERT INTO receipts (receipt_number, supplier_id, destination_location_id, status, created_by)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [
          receiptNumber,
          supplier_id ? parseInt(supplier_id) : null,
          parseInt(destination_location_id),
          recStatus,
          user?.id || null,
        ]
      );

      const receipt = recRes.rows[0];

      for (const item of items) {
        if (!item.product_id || !item.quantity || parseFloat(item.quantity) <= 0) {
          throw new Error("Each item must have a valid product and quantity > 0");
        }
        await client.query(
          `INSERT INTO receipt_items (receipt_id, product_id, quantity)
           VALUES ($1, $2, $3)`,
          [receipt.id, parseInt(item.product_id), parseFloat(item.quantity)]
        );
      }

      await client.query("COMMIT");
      return NextResponse.json({ success: true, receipt });
    } catch (err: any) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create receipt" }, { status: 500 });
  }
}
