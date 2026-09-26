import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { initDatabase } from "@/lib/schema";
import { requireAuth, handleAuthError } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    await initDatabase();
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("product_id");
    const sku = searchParams.get("sku");
    const warehouseId = searchParams.get("warehouse_id");
    const locationId = searchParams.get("location_id");
    const operationType = searchParams.get("operation_type");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const referenceNumber = searchParams.get("reference_number");
    const search = searchParams.get("search");

    let sql = `
      SELECT sl.*, p.name as product_name, p.sku, l.name as location_name, w.name as warehouse_name, u.name as user_name
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
    if (search) {
      params.push(`%${search}%`);
      const searchParam = `$${params.length}`;
      conditions.push(
        `(p.name ILIKE ${searchParam} OR p.sku ILIKE ${searchParam} OR sl.reference_number ILIKE ${searchParam} OR u.name ILIKE ${searchParam})`
      );
    }

    if (conditions.length > 0) sql += ` WHERE ` + conditions.join(" AND ");
    sql += ` ORDER BY sl.created_at DESC`;

    const res = await query(sql, params);

    const headers = [
      "Ledger ID",
      "Timestamp",
      "Product Name",
      "SKU",
      "Warehouse",
      "Location",
      "Operation Type",
      "Reference Number",
      "Qty Before",
      "Qty Change",
      "Qty After",
      "User",
    ];
    const csvRows = [headers.join(",")];

    for (const row of res.rows) {
      const values = [
        row.id,
        new Date(row.created_at).toISOString(),
        `"${String(row.product_name).replace(/"/g, '""')}"`,
        `"${String(row.sku).replace(/"/g, '""')}"`,
        `"${String(row.warehouse_name).replace(/"/g, '""')}"`,
        `"${String(row.location_name).replace(/"/g, '""')}"`,
        row.operation_type,
        `"${String(row.reference_number).replace(/"/g, '""')}"`,
        row.quantity_before,
        row.quantity_change,
        row.quantity_after,
        `"${String(row.user_name || "System").replace(/"/g, '""')}"`,
      ];
      csvRows.push(values.join(","));
    }

    return new NextResponse(csvRows.join("\n"), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="StockSense_Ledger_${Date.now()}.csv"`,
      },
    });
  } catch (err: any) {
    const authErr = handleAuthError(err);
    if (authErr) return authErr;
    return NextResponse.json({ error: err.message || "Ledger export failed" }, { status: 500 });
  }
}
