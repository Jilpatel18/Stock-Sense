import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { initDatabase } from "@/lib/schema";

export async function GET() {
  try {
    await initDatabase();
    const res = await query(`SELECT * FROM categories ORDER BY name ASC`);
    return NextResponse.json({ categories: res.rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initDatabase();
    const { name, description } = await request.json();
    if (!name) return NextResponse.json({ error: "Category name is required" }, { status: 400 });

    const res = await query(
      `INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING *`,
      [name, description || null]
    );
    return NextResponse.json({ success: true, category: res.rows[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
