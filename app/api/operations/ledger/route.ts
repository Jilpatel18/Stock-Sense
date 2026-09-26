import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { initDatabase } from "@/lib/schema";

export async function GET(request: Request) {
  try {
    await initDatabase();
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("product_id");
    const locationId = searchParams.get("location_id");
    const operationType = searchParams.get("operation_type");

    let sql = `
      SELECT sl.*, 
             p.name as product_name, p.sku, p.unit_of_measure,
             l.name as location_name, l.code as location_code, w.name as warehouse_name,
             u.name as performed_by_name
      FROM stock_ledger sl
      JOIN products p ON sl.product_id = p.id
      JOIN locations l ON sl.location_id = l.id
      JOIN warehouses w ON l.warehouse_id = w.id
      LEFT JOIN users u ON sl.performed_by = u.id
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    if (productId) {
      params.push(productId);
      conditions.push(`sl.product_id = $${params.length}`);
    }

    if (locationId) {
      params.push(locationId);
      conditions.push(`sl.location_id = $${params.length}`);
    }

    if (operationType) {
      params.push(operationType);
      conditions.push(`sl.operation_type = $${params.length}`);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(" AND ");
    }

    sql += ` ORDER BY sl.created_at DESC`;

    const res = await query(sql, params);
    return NextResponse.json({ ledger: res.rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
