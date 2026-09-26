import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { initDatabase } from "@/lib/schema";

export async function GET(request: Request) {
  try {
    await initDatabase();
    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get("warehouse_id");

    let sql = `
      SELECT l.*, w.name as warehouse_name, w.code as warehouse_code
      FROM locations l
      JOIN warehouses w ON l.warehouse_id = w.id
    `;
    const params: any[] = [];
    if (warehouseId) {
      params.push(warehouseId);
      sql += ` WHERE l.warehouse_id = $1`;
    }
    sql += ` ORDER BY w.name ASC, l.name ASC`;

    const res = await query(sql, params);
    return NextResponse.json({ locations: res.rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initDatabase();
    const { warehouse_id, name, code, location_type } = await request.json();
    if (!warehouse_id || !name || !code) {
      return NextResponse.json(
        { error: "Warehouse ID, Location Name, and Code are required" },
        { status: 400 }
      );
    }

    const res = await query(
      `INSERT INTO locations (warehouse_id, name, code, location_type)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [parseInt(warehouse_id), name, code, location_type || "STORAGE"]
    );
    return NextResponse.json({ success: true, location: res.rows[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
