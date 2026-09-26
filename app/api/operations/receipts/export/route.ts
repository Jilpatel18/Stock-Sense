import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { initDatabase } from "@/lib/schema";
import { requireAuth, handleAuthError } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    await initDatabase();
    await requireAuth();

    const sql = `
      SELECT r.id, r.receipt_number, r.status, s.name as supplier_name, l.name as destination_location_name,
             w.name as warehouse_name, u.name as created_by_user, r.created_at
      FROM receipts r
      LEFT JOIN suppliers s ON r.supplier_id = s.id
      JOIN locations l ON r.destination_location_id = l.id
      JOIN warehouses w ON l.warehouse_id = w.id
      LEFT JOIN users u ON r.created_by = u.id
      ORDER BY r.created_at DESC
    `;

    const res = await query(sql);

    const headers = ["ID", "Receipt Number", "Supplier", "Warehouse", "Location", "Status", "Created By", "Date"];
    const csvRows = [headers.join(",")];

    for (const r of res.rows) {
      csvRows.push([
        r.id,
        `"${r.receipt_number}"`,
        `"${r.supplier_name || "Direct Vendor"}"`,
        `"${r.warehouse_name}"`,
        `"${r.destination_location_name}"`,
        r.status,
        `"${r.created_by_user || "System"}"`,
        new Date(r.created_at).toISOString().split("T")[0],
      ].join(","));
    }

    return new NextResponse(csvRows.join("\n"), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="StockSense_Receipts_${Date.now()}.csv"`,
      },
    });
  } catch (err: any) {
    const authErr = handleAuthError(err);
    if (authErr) return authErr;
    return NextResponse.json({ error: err.message || "Export failed" }, { status: 500 });
  }
}
