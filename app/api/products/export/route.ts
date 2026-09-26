import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { initDatabase } from "@/lib/schema";
import { requireAuth, handleAuthError } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    await initDatabase();
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("category_id");
    const search = searchParams.get("search");

    let sql = `
      SELECT p.id, p.name, p.sku, c.name as category_name, p.unit_of_measure, p.reorder_level,
             COALESCE(SUM(i.quantity), 0) as total_stock, p.active, p.created_at
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN inventory i ON p.id = i.product_id
    `;

    const params: any[] = [];
    const conds: string[] = [];

    if (categoryId && categoryId !== "All") {
      params.push(parseInt(categoryId));
      conds.push(`p.category_id = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conds.push(`(p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length})`);
    }

    if (conds.length > 0) sql += ` WHERE ` + conds.join(" AND ");

    sql += ` GROUP BY p.id, c.name ORDER BY p.id ASC`;

    const res = await query(sql, params);

    const headers = ["Product ID", "Name", "SKU", "Category", "Unit of Measure", "Reorder Level", "Total Stock", "Active", "Created Date"];
    const csvRows = [headers.join(",")];

    for (const row of res.rows) {
      const values = [
        row.id,
        `"${String(row.name).replace(/"/g, '""')}"`,
        `"${String(row.sku).replace(/"/g, '""')}"`,
        `"${String(row.category_name || "Uncategorized").replace(/"/g, '""')}"`,
        row.unit_of_measure,
        row.reorder_level,
        row.total_stock,
        row.active ? "Yes" : "No",
        new Date(row.created_at).toISOString().split("T")[0],
      ];
      csvRows.push(values.join(","));
    }

    const csvData = csvRows.join("\n");

    return new NextResponse(csvData, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="StockSense_Products_${Date.now()}.csv"`,
      },
    });
  } catch (err: any) {
    const authErr = handleAuthError(err);
    if (authErr) return authErr;
    return NextResponse.json({ error: err.message || "Export failed" }, { status: 500 });
  }
}
