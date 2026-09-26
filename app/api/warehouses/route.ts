import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { initDatabase } from "@/lib/schema";

export async function GET() {
  try {
    await initDatabase();
    const whRes = await query(`SELECT * FROM warehouses ORDER BY name ASC`);
    const warehouses = whRes.rows;

    for (const wh of warehouses) {
      const locRes = await query(
        `SELECT * FROM locations WHERE warehouse_id = $1 ORDER BY name ASC`,
        [wh.id]
      );
      wh.locations = locRes.rows;
    }

    return NextResponse.json({ warehouses });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initDatabase();
    const { name, code, address } = await request.json();
    if (!name || !code) {
      return NextResponse.json({ error: "Warehouse name and code are required" }, { status: 400 });
    }

    const res = await query(
      `INSERT INTO warehouses (name, code, address) VALUES ($1, $2, $3) RETURNING *`,
      [name, code, address || null]
    );

    return NextResponse.json({ success: true, warehouse: res.rows[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
