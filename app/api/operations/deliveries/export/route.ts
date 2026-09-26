import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { initDatabase } from "@/lib/schema";
import { requireAuth, handleAuthError } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    await initDatabase();
    await requireAuth();

    const sql = `
      SELECT d.id, d.delivery_number, d.customer_name, d.status, l.name as source_location_name,
             w.name as warehouse_name, u.name as created_by_user, d.created_at
      FROM delivery_orders d
      JOIN locations l ON d.source_location_id = l.id
      JOIN warehouses w ON l.warehouse_id = w.id
      LEFT JOIN users u ON d.created_by = u.id
      ORDER BY d.created_at DESC
    `;

    const res = await query(sql);

    const headers = ["ID", "Delivery Number", "Customer", "Warehouse", "Location", "Status", "Created By", "Date"];
    const csvRows = [headers.join(",")];

    for (const d of res.rows) {
      csvRows.push([
        d.id,
        `"${d.delivery_number}"`,
        `"${d.customer_name || "Direct Customer"}"`,
        `"${d.warehouse_name}"`,
        `"${d.source_location_name}"`,
        d.status,
        `"${d.created_by_user || "System"}"`,
        new Date(d.created_at).toISOString().split("T")[0],
      ].join(","));
    }

    return new NextResponse(csvRows.join("\n"), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="StockSense_Deliveries_${Date.now()}.csv"`,
      },
    });
  } catch (err: any) {
    const authErr = handleAuthError(err);
    if (authErr) return authErr;
    return NextResponse.json({ error: err.message || "Export failed" }, { status: 500 });
  }
}
