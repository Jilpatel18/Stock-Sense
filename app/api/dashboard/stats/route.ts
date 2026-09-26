import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { initDatabase } from "@/lib/schema";
import { requireAuth, handleAuthError } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    await initDatabase();
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const docType = searchParams.get("doc_type"); // 'Receipts' | 'Delivery' | 'Internal' | 'Adjustments' | 'All'
    const status = searchParams.get("status"); // 'Draft' | 'Waiting' | 'Ready' | 'Done' | 'Canceled' | 'All'
    const warehouseId = searchParams.get("warehouse_id");
    const locationId = searchParams.get("location_id");
    const categoryId = searchParams.get("category_id");

    // 1. Total products with active = TRUE
    const totalProdRes = await query(`
      SELECT COUNT(DISTINCT product_id) as count FROM inventory WHERE quantity > 0
    `);
    const totalProducts = parseInt(totalProdRes.rows[0]?.count || "0");

    // 2. Low stock & Out of stock items calculation
    const stockStatsRes = await query(`
      SELECT p.id, p.name, p.sku, p.reorder_level, p.unit_of_measure, c.name as category_name,
             COALESCE(SUM(i.quantity), 0) as current_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN inventory i ON p.id = i.product_id
      WHERE p.active = TRUE
      GROUP BY p.id, c.name
    `);
    const allProductsStock = stockStatsRes.rows;
    const lowStockItems = allProductsStock.filter(
      (p) => parseFloat(p.current_stock) > 0 && parseFloat(p.current_stock) <= parseFloat(p.reorder_level)
    );
    const outOfStockItems = allProductsStock.filter((p) => parseFloat(p.current_stock) === 0);

    const lowStockCount = lowStockItems.length;
    const outOfStockCount = outOfStockItems.length;

    // 3. Pending Receipts
    const pendingRecRes = await query(`
      SELECT COUNT(*) FROM receipts WHERE status NOT IN ('Done', 'Canceled')
    `);
    const pendingReceipts = parseInt(pendingRecRes.rows[0]?.count || "0");

    // 4. Pending Deliveries
    const pendingDelRes = await query(`
      SELECT COUNT(*) FROM delivery_orders WHERE status NOT IN ('Done', 'Canceled')
    `);
    const pendingDeliveries = parseInt(pendingDelRes.rows[0]?.count || "0");

    // 5. Scheduled Internal Transfers
    const scheduledTransfersRes = await query(`
      SELECT COUNT(*) FROM internal_transfers WHERE status NOT IN ('Done', 'Canceled')
    `);
    const scheduledTransfers = parseInt(scheduledTransfersRes.rows[0]?.count || "0");

    // 6. Aggregate Operations Feed with full filter support (Warehouse, Location, Category, Status, DocType)
    let documents: any[] = [];

    // Receipts
    if (!docType || docType === "All" || docType === "Receipts") {
      let recSql = `
        SELECT DISTINCT r.id, r.receipt_number as reference, 'Receipt' as type, r.status, r.created_at,
               s.name as partner_or_reason, l.name as location_name, l.id as location_id,
               w.name as warehouse_name
        FROM receipts r
        LEFT JOIN suppliers s ON r.supplier_id = s.id
        JOIN locations l ON r.destination_location_id = l.id
        JOIN warehouses w ON l.warehouse_id = w.id
        LEFT JOIN receipt_items ri ON r.id = ri.receipt_id
        LEFT JOIN products p ON ri.product_id = p.id
      `;
      const params: any[] = [];
      const conds: string[] = [];

      if (status && status !== "All") {
        params.push(status);
        conds.push(`r.status = $${params.length}`);
      }
      if (warehouseId && warehouseId !== "All") {
        params.push(parseInt(warehouseId));
        conds.push(`w.id = $${params.length}`);
      }
      if (locationId && locationId !== "All") {
        params.push(parseInt(locationId));
        conds.push(`r.destination_location_id = $${params.length}`);
      }
      if (categoryId && categoryId !== "All") {
        params.push(parseInt(categoryId));
        conds.push(`p.category_id = $${params.length}`);
      }

      if (conds.length > 0) recSql += ` WHERE ` + conds.join(" AND ");
      recSql += ` ORDER BY r.created_at DESC LIMIT 50`;

      const recRes = await query(recSql, params);
      documents.push(...recRes.rows.map((r) => ({ ...r, category: "Receipts" })));
    }

    // Deliveries
    if (!docType || docType === "All" || docType === "Delivery") {
      let delSql = `
        SELECT DISTINCT d.id, d.delivery_number as reference, 'Delivery' as type, d.status, d.created_at,
               d.customer_name as partner_or_reason, l.name as location_name, l.id as location_id,
               w.name as warehouse_name
        FROM delivery_orders d
        JOIN locations l ON d.source_location_id = l.id
        JOIN warehouses w ON l.warehouse_id = w.id
        LEFT JOIN delivery_items di ON d.id = di.delivery_id
        LEFT JOIN products p ON di.product_id = p.id
      `;
      const params: any[] = [];
      const conds: string[] = [];

      if (status && status !== "All") {
        params.push(status);
        conds.push(`d.status = $${params.length}`);
      }
      if (warehouseId && warehouseId !== "All") {
        params.push(parseInt(warehouseId));
        conds.push(`w.id = $${params.length}`);
      }
      if (locationId && locationId !== "All") {
        params.push(parseInt(locationId));
        conds.push(`d.source_location_id = $${params.length}`);
      }
      if (categoryId && categoryId !== "All") {
        params.push(parseInt(categoryId));
        conds.push(`p.category_id = $${params.length}`);
      }

      if (conds.length > 0) delSql += ` WHERE ` + conds.join(" AND ");
      delSql += ` ORDER BY d.created_at DESC LIMIT 50`;

      const delRes = await query(delSql, params);
      documents.push(...delRes.rows.map((d) => ({ ...d, category: "Delivery" })));
    }

    // Internal Transfers
    if (!docType || docType === "All" || docType === "Internal") {
      let trnSql = `
        SELECT DISTINCT t.id, t.transfer_number as reference, 'Internal' as type, t.status, t.created_at,
               CONCAT(sl.name, ' ➔ ', dl.name) as partner_or_reason,
               sl.name as location_name, sl.id as location_id, sw.name as warehouse_name
        FROM internal_transfers t
        JOIN locations sl ON t.source_location_id = sl.id
        JOIN warehouses sw ON sl.warehouse_id = sw.id
        JOIN locations dl ON t.destination_location_id = dl.id
        JOIN warehouses dw ON dl.warehouse_id = dw.id
        LEFT JOIN internal_transfer_items iti ON t.id = iti.transfer_id
        LEFT JOIN products p ON iti.product_id = p.id
      `;
      const params: any[] = [];
      const conds: string[] = [];

      if (status && status !== "All") {
        params.push(status);
        conds.push(`t.status = $${params.length}`);
      }
      if (warehouseId && warehouseId !== "All") {
        params.push(parseInt(warehouseId));
        conds.push(`(sw.id = $${params.length} OR dw.id = $${params.length})`);
      }
      if (locationId && locationId !== "All") {
        params.push(parseInt(locationId));
        conds.push(`(t.source_location_id = $${params.length} OR t.destination_location_id = $${params.length})`);
      }
      if (categoryId && categoryId !== "All") {
        params.push(parseInt(categoryId));
        conds.push(`p.category_id = $${params.length}`);
      }

      if (conds.length > 0) trnSql += ` WHERE ` + conds.join(" AND ");
      trnSql += ` ORDER BY t.created_at DESC LIMIT 50`;

      const trnRes = await query(trnSql, params);
      documents.push(...trnRes.rows.map((t) => ({ ...t, category: "Internal" })));
    }

    // Adjustments
    if (!docType || docType === "All" || docType === "Adjustments") {
      let adjSql = `
        SELECT DISTINCT a.id, a.adjustment_number as reference, 'Adjustment' as type, a.status, a.created_at,
               a.reason as partner_or_reason, l.name as location_name, l.id as location_id,
               w.name as warehouse_name
        FROM inventory_adjustments a
        JOIN locations l ON a.location_id = l.id
        JOIN warehouses w ON l.warehouse_id = w.id
        LEFT JOIN inventory_adjustment_items iai ON a.id = iai.adjustment_id
        LEFT JOIN products p ON iai.product_id = p.id
      `;
      const params: any[] = [];
      const conds: string[] = [];

      if (status && status !== "All") {
        params.push(status);
        conds.push(`a.status = $${params.length}`);
      }
      if (warehouseId && warehouseId !== "All") {
        params.push(parseInt(warehouseId));
        conds.push(`w.id = $${params.length}`);
      }
      if (locationId && locationId !== "All") {
        params.push(parseInt(locationId));
        conds.push(`a.location_id = $${params.length}`);
      }
      if (categoryId && categoryId !== "All") {
        params.push(parseInt(categoryId));
        conds.push(`p.category_id = $${params.length}`);
      }

      if (conds.length > 0) adjSql += ` WHERE ` + conds.join(" AND ");
      adjSql += ` ORDER BY a.created_at DESC LIMIT 50`;

      const adjRes = await query(adjSql, params);
      documents.push(...adjRes.rows.map((a) => ({ ...a, category: "Adjustments" })));
    }

    // Sort documents descending by created_at
    documents.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({
      kpis: {
        totalProducts,
        lowStockCount,
        outOfStockCount,
        pendingReceipts,
        pendingDeliveries,
        scheduledTransfers,
      },
      lowStockItems,
      outOfStockItems,
      documents,
    });
  } catch (err: any) {
    const authErr = handleAuthError(err);
    if (authErr) return authErr;
    return NextResponse.json({ error: err.message || "Failed to fetch dashboard stats" }, { status: 500 });
  }
}
