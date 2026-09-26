import { NextResponse } from "next/server";
import { query, pool } from "@/lib/db";
import { initDatabase } from "@/lib/schema";
import { requireAuth, handleAuthError } from "@/lib/auth";
import { getNextDocumentNumber } from "@/lib/sequence";

export async function GET(request: Request) {
  try {
    await initDatabase();
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let sql = `
      SELECT a.*, l.name as location_name, w.name as warehouse_name, u.name as created_by_name
      FROM inventory_adjustments a
      JOIN locations l ON a.location_id = l.id
      JOIN warehouses w ON l.warehouse_id = w.id
      LEFT JOIN users u ON a.created_by = u.id
    `;
    const params: any[] = [];
    if (status) {
      params.push(status);
      sql += ` WHERE a.status = $1`;
    }
    sql += ` ORDER BY a.created_at DESC`;

    const res = await query(sql, params);
    const adjustments = res.rows;

    for (const adj of adjustments) {
      const itemsRes = await query(
        `SELECT iai.*, p.name as product_name, p.sku, p.unit_of_measure
         FROM inventory_adjustment_items iai
         JOIN products p ON iai.product_id = p.id
         WHERE iai.adjustment_id = $1`,
        [adj.id]
      );
      adj.items = itemsRes.rows;
    }

    return NextResponse.json({ adjustments });
  } catch (err: any) {
    const authErr = handleAuthError(err);
    if (authErr) return authErr;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initDatabase();
    const user = await requireAuth();
    const body = await request.json();
    const { location_id, reason, status, items } = body;

    if (!location_id || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Location and at least one item count are required" },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Generate atomic adjustment number (ADJ-000001)
      const adjustmentNumber = await getNextDocumentNumber(client, "ADJ");

      const locId = parseInt(location_id);

      const adjRes = await client.query(
        `INSERT INTO inventory_adjustments (adjustment_number, location_id, reason, status, created_by)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [adjustmentNumber, locId, reason || null, status || "Draft", user.id]
      );

      const adjustment = adjRes.rows[0];

      for (const item of items) {
        if (!item.product_id || item.counted_quantity === undefined) {
          throw new Error("Each item must specify a valid product and counted_quantity");
        }

        const prodId = parseInt(item.product_id);
        const counted = parseFloat(item.counted_quantity);

        // Fetch current recorded quantity
        const invRes = await client.query(
          `SELECT quantity FROM inventory WHERE product_id = $1 AND location_id = $2`,
          [prodId, locId]
        );
        const prevQty = invRes.rows.length > 0 ? parseFloat(invRes.rows[0].quantity) : 0;
        const diff = counted - prevQty;

        await client.query(
          `INSERT INTO inventory_adjustment_items (adjustment_id, product_id, counted_quantity, previous_quantity, difference)
           VALUES ($1, $2, $3, $4, $5)`,
          [adjustment.id, prodId, counted, prevQty, diff]
        );
      }

      await client.query("COMMIT");
      return NextResponse.json({ success: true, adjustment });
    } catch (err: any) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err: any) {
    const authErr = handleAuthError(err);
    if (authErr) return authErr;
    return NextResponse.json({ error: err.message || "Failed to create adjustment" }, { status: 500 });
  }
}
