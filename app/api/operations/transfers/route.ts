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
      SELECT t.*, 
             sl.name as source_location_name, sw.name as source_warehouse_name,
             dl.name as destination_location_name, dw.name as destination_warehouse_name,
             u.name as created_by_name
      FROM internal_transfers t
      JOIN locations sl ON t.source_location_id = sl.id
      JOIN warehouses sw ON sl.warehouse_id = sw.id
      JOIN locations dl ON t.destination_location_id = dl.id
      JOIN warehouses dw ON dl.warehouse_id = dw.id
      LEFT JOIN users u ON t.created_by = u.id
    `;
    const params: any[] = [];
    if (status) {
      params.push(status);
      sql += ` WHERE t.status = $1`;
    }
    sql += ` ORDER BY t.created_at DESC`;

    const res = await query(sql, params);
    const transfers = res.rows;

    for (const trn of transfers) {
      const itemsRes = await query(
        `SELECT iti.*, p.name as product_name, p.sku, p.unit_of_measure
         FROM internal_transfer_items iti
         JOIN products p ON iti.product_id = p.id
         WHERE iti.transfer_id = $1`,
        [trn.id]
      );
      trn.items = itemsRes.rows;
    }

    return NextResponse.json({ transfers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    const body = await request.json();
    const { source_location_id, destination_location_id, status, items } = body;

    if (!source_location_id || !destination_location_id || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Source location, destination location, and items are required" },
        { status: 400 }
      );
    }

    if (parseInt(source_location_id) === parseInt(destination_location_id)) {
      return NextResponse.json(
        { error: "Source and destination locations cannot be identical." },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Generate transfer number (TRN-00001)
      const countRes = await client.query(`SELECT COUNT(*) FROM internal_transfers`);
      const nextNum = parseInt(countRes.rows[0].count) + 1;
      const transferNumber = `TRN-${String(nextNum).padStart(5, "0")}`;

      const trnRes = await client.query(
        `INSERT INTO internal_transfers (transfer_number, source_location_id, destination_location_id, status, created_by)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [
          transferNumber,
          parseInt(source_location_id),
          parseInt(destination_location_id),
          status || "Draft",
          user?.id || null,
        ]
      );

      const transfer = trnRes.rows[0];

      for (const item of items) {
        if (!item.product_id || !item.quantity || parseFloat(item.quantity) <= 0) {
          throw new Error("Each item must have a valid product and quantity > 0");
        }
        await client.query(
          `INSERT INTO internal_transfer_items (transfer_id, product_id, quantity)
           VALUES ($1, $2, $3)`,
          [transfer.id, parseInt(item.product_id), parseFloat(item.quantity)]
        );
      }

      await client.query("COMMIT");
      return NextResponse.json({ success: true, transfer });
    } catch (err: any) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create transfer" }, { status: 500 });
  }
}
