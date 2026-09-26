import { NextResponse } from "next/server";
import { query, pool } from "@/lib/db";
import { initDatabase } from "@/lib/schema";
import { requireManager, requireAuth, handleAuthError } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

export async function GET(request: Request) {
  try {
    await initDatabase();
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("category_id");
    const search = searchParams.get("search");
    const warehouseId = searchParams.get("warehouse_id");
    const locationId = searchParams.get("location_id");
    const statusFilter = searchParams.get("status"); // 'LOW_STOCK' | 'OUT_OF_STOCK' | 'NORMAL'
    const includeInactive = searchParams.get("include_inactive") === "true";

    let sql = `
      SELECT p.*, c.name as category_name,
             COALESCE(SUM(i.quantity), 0) as total_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN inventory i ON p.id = i.product_id
      LEFT JOIN locations l ON i.location_id = l.id
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    if (!includeInactive) {
      conditions.push(`p.active = TRUE`);
    }

    if (categoryId) {
      params.push(parseInt(categoryId));
      conditions.push(`p.category_id = $${params.length}`);
    }

    if (warehouseId) {
      params.push(parseInt(warehouseId));
      conditions.push(`l.warehouse_id = $${params.length}`);
    }

    if (locationId) {
      params.push(parseInt(locationId));
      conditions.push(`i.location_id = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      const p = `$${params.length}`;
      conditions.push(`(p.name ILIKE ${p} OR p.sku ILIKE ${p})`);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(" AND ");
    }

    sql += ` GROUP BY p.id, c.name ORDER BY p.name ASC`;

    const res = await query(sql, params);
    let products = res.rows;

    // Process calculations and per-location breakdown
    products = products.map((prod) => {
      const totalStock = parseFloat(prod.total_stock);
      const reorderLevel = parseFloat(prod.reorder_level);

      let stockStatus = "NORMAL";
      if (totalStock === 0) {
        stockStatus = "OUT_OF_STOCK";
      } else if (totalStock <= reorderLevel) {
        stockStatus = "LOW_STOCK";
      }

      return {
        ...prod,
        total_stock: totalStock,
        reorder_level: reorderLevel,
        is_low_stock: totalStock <= reorderLevel,
        stock_status: stockStatus,
      };
    });

    if (statusFilter) {
      products = products.filter((p) => p.stock_status === statusFilter);
    }

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
    }

    return NextResponse.json({ products });
  } catch (err: any) {
    const authErr = handleAuthError(err);
    if (authErr) return authErr;
    return NextResponse.json({ error: err.message || "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initDatabase();
    const user = await requireManager();
    const body = await request.json();
    const { name, sku, category_id, unit_of_measure, reorder_level, initial_stock, location_id } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Product name is required" }, { status: 400 });
    }
    if (!sku || typeof sku !== "string" || !sku.trim()) {
      return NextResponse.json({ error: "Product SKU is required" }, { status: 400 });
    }

    const trimmedSku = sku.trim().toUpperCase();

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Check SKU uniqueness
      const skuCheck = await client.query(`SELECT id FROM products WHERE UPPER(sku) = $1`, [trimmedSku]);
      if (skuCheck.rows.length > 0) {
        throw new Error(`Product with SKU "${trimmedSku}" already exists.`);
      }

      const prodRes = await client.query(
        `INSERT INTO products (name, sku, category_id, unit_of_measure, reorder_level, active)
         VALUES ($1, $2, $3, $4, $5, TRUE)
         RETURNING *`,
        [
          name.trim(),
          trimmedSku,
          category_id ? parseInt(category_id) : null,
          unit_of_measure ? unit_of_measure.trim() : "PCS",
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
          [newProd.id, locId, newProd.id, qty, user.id]
        );
      }

      await client.query("COMMIT");

      await logAuditEvent({
        userId: user.id,
        userEmail: user.email,
        action: "PRODUCT_CREATE",
        entityType: "PRODUCT",
        entityId: newProd.id,
        details: { name: newProd.name, sku: newProd.sku },
      });

      return NextResponse.json({ success: true, product: newProd });
    } catch (err: any) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err: any) {
    const authErr = handleAuthError(err);
    if (authErr) return authErr;
    return NextResponse.json({ error: err.message || "Failed to create product" }, { status: 500 });
  }
}
