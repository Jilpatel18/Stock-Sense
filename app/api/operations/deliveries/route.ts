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
      SELECT d.*, l.name as source_location_name, w.name as warehouse_name, u.name as created_by_name
      FROM delivery_orders d
      JOIN locations l ON d.source_location_id = l.id
      JOIN warehouses w ON l.warehouse_id = w.id
      LEFT JOIN users u ON d.created_by = u.id
    `;
    const params: any[] = [];
    if (status) {
      params.push(status);
      sql += ` WHERE d.status = $1`;
    }
    sql += ` ORDER BY d.created_at DESC`;

    const res = await query(sql, params);
    const deliveries = res.rows;

    for (const del of deliveries) {
      const itemsRes = await query(
        `SELECT di.*, p.name as product_name, p.sku, p.unit_of_measure
         FROM delivery_items di
         JOIN products p ON di.product_id = p.id
         WHERE di.delivery_id = $1`,
        [del.id]
      );
      del.items = itemsRes.rows;
    }

    return NextResponse.json({ deliveries });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    const body = await request.json();
    const { source_location_id, customer_name, status, items } = body;

    if (!source_location_id || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Source location and at least one item are required" },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Generate delivery number (DEL-00001)
      const countRes = await client.query(`SELECT COUNT(*) FROM delivery_orders`);
      const nextNum = parseInt(countRes.rows[0].count) + 1;
      const deliveryNumber = `DEL-${String(nextNum).padStart(5, "0")}`;

      const delRes = await client.query(
        `INSERT INTO delivery_orders (delivery_number, source_location_id, customer_name, status, created_by)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [
          deliveryNumber,
          parseInt(source_location_id),
          customer_name || null,
          status || "Draft",
          user?.id || null,
        ]
      );

      const delivery = delRes.rows[0];

      for (const item of items) {
        if (!item.product_id || !item.quantity || parseFloat(item.quantity) <= 0) {
          throw new Error("Each item must have a valid product and quantity > 0");
        }
        await client.query(
          `INSERT INTO delivery_items (delivery_id, product_id, quantity)
           VALUES ($1, $2, $3)`,
          [delivery.id, parseInt(item.product_id), parseFloat(item.quantity)]
        );
      }

      await client.query("COMMIT");
      return NextResponse.json({ success: true, delivery });
    } catch (err: any) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create delivery" }, { status: 500 });
  }
}
