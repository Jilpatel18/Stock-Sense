import { NextResponse } from "next/server";
import { query, pool } from "@/lib/db";
import { initDatabase } from "@/lib/schema";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    await initDatabase();
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("category_id");
    const search = searchParams.get("search");

    let sql = `
      SELECT p.*, c.name as category_name,
             COALESCE(SUM(i.quantity), 0) as total_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN inventory i ON p.id = i.product_id
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    if (categoryId) {
      params.push(categoryId);
      conditions.push(`p.category_id = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length})`);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(" AND ");
    }

    sql += ` GROUP BY p.id, c.name ORDER BY p.name ASC`;

    const res = await query(sql, params);
    const products = res.rows;

    // Attach per-location breakdown for each product
    for (const prod of products) {
      const locRes = await query(
        `SELECT i.quantity, l.id as location_id, l.name as location_name, l.code as location_code, w.name as warehouse_name
         FROM inventory i
         JOIN locations l ON i.location_id = l.id
         JOIN warehouses w ON l.warehouse_id = w.id
         WHERE i.product_id = $1 AND i.quantity > 0`,
        [prod.id]
      );
      prod.locations = locRes.rows;
      prod.total_stock = parseFloat(prod.total_stock);
      prod.reorder_level = parseFloat(prod.reorder_level);
      prod.is_low_stock = prod.total_stock <= prod.reorder_level;
    }

    return NextResponse.json({ products });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    const body = await request.json();
    const { name, sku, category_id, unit_of_measure, reorder_level, initial_stock, location_id } = body;

    if (!name || !sku) {
      return NextResponse.json({ error: "Product name and SKU are required" }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Check SKU uniqueness
      const skuCheck = await client.query(`SELECT id FROM products WHERE sku = $1`, [sku]);
      if (skuCheck.rows.length > 0) {
        throw new Error(`Product with SKU "${sku}" already exists.`);
      }

      const prodRes = await client.query(
        `INSERT INTO products (name, sku, category_id, unit_of_measure, reorder_level)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          name,
          sku,
          category_id ? parseInt(category_id) : null,
          unit_of_measure || "PCS",
          reorder_level ? parseFloat(reorder_level) : 10,
        ]
      );
      const newProd = prodRes.rows[0];

      // If initial stock is specified at a location, create inventory entry + stock ledger entry
      if (initial_stock && location_id && parseFloat(initial_stock) > 0) {
        const qty = parseFloat(initial_stock);
        const locId = parseInt(location_id);

        await client.query(
          `INSERT INTO inventory (product_id, location_id, quantity, updated_at)
           VALUES ($1, $2, $3, NOW())`,
          [newProd.id, locId, qty]
        );

        await client.query(
          `INSERT INTO stock_ledger 
           (product_id, location_id, operation_type, reference_type, reference_id, reference_number, quantity_before, quantity_change, quantity_after, performed_by, created_at)
           VALUES ($1, $2, 'RECEIPT', 'INITIAL_STOCK', $3, 'INIT-STOCK', 0, $4, $4, $5, NOW())`,
          [newProd.id, locId, newProd.id, qty, user?.id || null]
        );
      }

      await client.query("COMMIT");
      return NextResponse.json({ success: true, product: newProd });
    } catch (err: any) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create product" }, { status: 500 });
  }
}
