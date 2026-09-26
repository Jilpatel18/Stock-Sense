import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { initDatabase } from "@/lib/schema";

export async function GET() {
  try {
    await initDatabase();
    const res = await query(`SELECT * FROM suppliers ORDER BY name ASC`);
    return NextResponse.json({ suppliers: res.rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initDatabase();
    const { name, contact_name, email, phone, address } = await request.json();
    if (!name) return NextResponse.json({ error: "Supplier name is required" }, { status: 400 });

    const res = await query(
      `INSERT INTO suppliers (name, contact_name, email, phone, address)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, contact_name || null, email || null, phone || null, address || null]
    );

    return NextResponse.json({ success: true, supplier: res.rows[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
