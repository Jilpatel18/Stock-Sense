import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { initDatabase } from "@/lib/schema";
import { requireAuth, handleAuthError } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    await initDatabase();
    await requireAuth();

    const sql = `
      SELECT a.id, a.adjustment_number, a.reason, a.status, l.name as location_name,
             w.name as warehouse_name, u.name as created_by_user, a.created_at
      FROM inventory_adjustments a
      JOIN locations l ON a.location_id = l.id
      JOIN warehouses w ON l.warehouse_id = w.id
      LEFT JOIN users u ON a.created_by = u.id
      ORDER BY a.created_at DESC
    `;

    const res = await query(sql);

    const headers = ["ID", "Adjustment Number", "Reason", "Warehouse", "Location", "Status", "Created By", "Date"];
    const csvRows = [headers.join(",")];

    for (const a of res.rows) {
      csvRows.push([
        a.id,
        `"${a.adjustment_number}"`,
        `"${a.reason || "Physical Audit"}"`,
        `"${a.warehouse_name}"`,
        `"${a.location_name}"`,
        a.status,
        `"${a.created_by_user || "System"}"`,
        new Date(a.created_at).toISOString().split("T")[0],
      ].join(","));
    }

    return new NextResponse(csvRows.join("\n"), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="StockSense_Adjustments_${Date.now()}.csv"`,
      },
    });
  } catch (err: any) {
    const authErr = handleAuthError(err);
    if (authErr) return authErr;
    return NextResponse.json({ error: err.message || "Export failed" }, { status: 500 });
  }
}
