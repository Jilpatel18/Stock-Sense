import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { initDatabase } from "@/lib/schema";
import { requireAuth, handleAuthError } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    await initDatabase();
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");

    if (!q || q.trim().length < 2) {
      return NextResponse.json({
        results: {
          products: [],
          warehouses: [],
          locations: [],
          receipts: [],
          deliveries: [],
          transfers: [],
        },
      });
    }

    const searchTerm = `%${q.trim()}%`;

    const [prodRes, whRes, locRes, recRes, delRes, trfRes] = await Promise.all([
      query(
        `SELECT id, name, sku, unit_of_measure FROM products WHERE (name ILIKE $1 OR sku ILIKE $1) AND active = TRUE LIMIT 5`,
        [searchTerm]
      ),
      query(
        `SELECT id, name, code FROM warehouses WHERE (name ILIKE $1 OR code ILIKE $1) LIMIT 5`,
        [searchTerm]
      ),
      query(
        `SELECT l.id, l.name, l.code, w.name as warehouse_name FROM locations l JOIN warehouses w ON l.warehouse_id = w.id WHERE (l.name ILIKE $1 OR l.code ILIKE $1) LIMIT 5`,
        [searchTerm]
      ),
      query(
        `SELECT id, receipt_number as reference, status FROM receipts WHERE receipt_number ILIKE $1 LIMIT 5`,
        [searchTerm]
      ),
      query(
        `SELECT id, delivery_number as reference, status FROM delivery_orders WHERE delivery_number ILIKE $1 LIMIT 5`,
        [searchTerm]
      ),
      query(
        `SELECT id, transfer_number as reference, status FROM internal_transfers WHERE transfer_number ILIKE $1 LIMIT 5`,
        [searchTerm]
      ),
    ]);

    return NextResponse.json({
      results: {
        products: prodRes.rows,
        warehouses: whRes.rows,
        locations: locRes.rows,
        receipts: recRes.rows,
        deliveries: delRes.rows,
        transfers: trfRes.rows,
      },
    });
  } catch (err: any) {
    const authErr = handleAuthError(err);
    if (authErr) return authErr;
    return NextResponse.json({ error: err.message || "Global search failed" }, { status: 500 });
  }
}
