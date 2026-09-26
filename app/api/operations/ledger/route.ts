import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { initDatabase } from "@/lib/schema";

export async function GET(request: Request) {
  try {
    await initDatabase();
    const { searchParams } = new URL(request.url);

    const productId = searchParams.get("product_id");
    const sku = searchParams.get("sku");
    const warehouseId = searchParams.get("warehouse_id");
    const locationId = searchParams.get("location_id");
    const operationType = searchParams.get("operation_type");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const referenceNumber = searchParams.get("reference_number");
    const performedBy = searchParams.get("performed_by");
    const search = searchParams.get("search");

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    let baseSql = `
      FROM stock_ledger sl
      JOIN products p ON sl.product_id = p.id
      JOIN locations l ON sl.location_id = l.id
      JOIN warehouses w ON l.warehouse_id = w.id
      LEFT JOIN users u ON sl.performed_by = u.id
    `;

    const params: any[] = [];
    const conditions: string[] = [];

    if (productId) {
      params.push(parseInt(productId));
      conditions.push(`sl.product_id = $${params.length}`);
    }

    if (sku) {
      params.push(sku);
      conditions.push(`p.sku = $${params.length}`);
    }

    if (warehouseId) {
      params.push(parseInt(warehouseId));
      conditions.push(`l.warehouse_id = $${params.length}`);
    }

    if (locationId) {
      params.push(parseInt(locationId));
      conditions.push(`sl.location_id = $${params.length}`);
    }

    if (operationType) {
      params.push(operationType);
      conditions.push(`sl.operation_type = $${params.length}`);
    }

    if (startDate) {
      params.push(startDate);
      conditions.push(`sl.created_at >= $${params.length}`);
    }

    if (endDate) {
      params.push(endDate);
      conditions.push(`sl.created_at <= $${params.length}`);
    }

    if (referenceNumber) {
      params.push(`%${referenceNumber}%`);
      conditions.push(`sl.reference_number ILIKE $${params.length}`);
    }

    if (performedBy) {
      params.push(parseInt(performedBy));
      conditions.push(`sl.performed_by = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      const searchParam = `$${params.length}`;
      conditions.push(
        `(p.name ILIKE ${searchParam} OR p.sku ILIKE ${searchParam} OR sl.reference_number ILIKE ${searchParam} OR u.name ILIKE ${searchParam})`
      );
    }

    let whereClause = "";
    if (conditions.length > 0) {
      whereClause = ` WHERE ` + conditions.join(" AND ");
    }

    // Total count for pagination
    const countRes = await query(`SELECT COUNT(*) as total ${baseSql} ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].total);

    // Fetch paginated rows
    let dataSql = `
      SELECT sl.*, 
             p.name as product_name, p.sku, p.unit_of_measure,
             l.name as location_name, l.code as location_code, w.name as warehouse_name,
             u.name as performed_by_name
      ${baseSql}
      ${whereClause}
      ORDER BY sl.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const dataRes = await query(dataSql, [...params, limit, offset]);

    return NextResponse.json({
      ledger: dataRes.rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch stock ledger" }, { status: 500 });
  }
}
