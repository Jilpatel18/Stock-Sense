import fs from "fs";
import path from "path";

// Load .env file
try {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf8");
    for (const line of envConfig.split("\n")) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*["']?(.*?)["']?\s*$/);
      if (match) {
        const key = match[1];
        const value = match[2];
        process.env[key] = value;
      }
    }
  }
} catch (err) {
  console.warn("Failed to load .env file:", err);
}

import { pool, query } from "../lib/db";
import { initDatabase } from "../lib/schema";
import { validateReceipt, validateDelivery, validateTransfer, validateAdjustment } from "../lib/inventory-service";
import { getNextDocumentNumber } from "../lib/sequence";

async function runTests() {
  console.log("==================================================");
  console.log("STARTING STOCKSENSE AUTOMATED VERIFICATION SUITE");
  console.log("==================================================\n");

  await initDatabase();
  const client = await pool.connect();

  try {
    // 1. Setup Test User
    const userRes = await query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ('Test Manager', 'test.manager@stocksense.com', 'hash', 'INVENTORY_MANAGER')
       ON CONFLICT (email) DO UPDATE SET role = 'INVENTORY_MANAGER'
       RETURNING id`
    );
    const userId = userRes.rows[0].id;

    // 2. Setup Test Warehouse & Locations
    const whRes = await query(
      `INSERT INTO warehouses (name, code, address)
       VALUES ('Main Warehouse', 'WH-TEST-01', '100 Test St')
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`
    );
    const whId = whRes.rows[0].id;

    const locStoreRes = await query(
      `INSERT INTO locations (warehouse_id, name, code, location_type)
       VALUES ($1, 'Main Store', 'LOC-STORE-01', 'STORAGE')
       ON CONFLICT (warehouse_id, code) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [whId]
    );
    const storeLocId = locStoreRes.rows[0].id;

    const locRackRes = await query(
      `INSERT INTO locations (warehouse_id, name, code, location_type)
       VALUES ($1, 'Production Rack', 'LOC-RACK-01', 'STORAGE')
       ON CONFLICT (warehouse_id, code) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [whId]
    );
    const rackLocId = locRackRes.rows[0].id;

    // 3. Setup Test Product (Steel Rod / STEEL-001)
    const prodRes = await query(
      `INSERT INTO products (name, sku, unit_of_measure, reorder_level)
       VALUES ('Steel Rod', 'STEEL-001', 'KG', 15)
       ON CONFLICT (sku) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`
    );
    const prodId = prodRes.rows[0].id;

    // Clean existing stock & ledger for test product
    await query(`DELETE FROM inventory WHERE product_id = $1`, [prodId]);
    await query(`DELETE FROM stock_ledger WHERE product_id = $1`, [prodId]);

    console.log("✔ Setup completed. Product: Steel Rod (SKU: STEEL-001)");

    // TEST 1: Receipt +100 KG to Main Store
    const recNo = await getNextDocumentNumber(client, "REC");
    const recRes = await query(
      `INSERT INTO receipts (receipt_number, destination_location_id, status, created_by)
       VALUES ($1, $2, 'Draft', $3) RETURNING id`,
      [recNo, storeLocId, userId]
    );
    const recId = recRes.rows[0].id;
    await query(`INSERT INTO receipt_items (receipt_id, product_id, quantity) VALUES ($1, $2, 100)`, [recId, prodId]);

    // Validate Receipt
    await validateReceipt(recId, userId);

    const storeStock1 = await query(`SELECT quantity FROM inventory WHERE product_id = $1 AND location_id = $2`, [prodId, storeLocId]);
    console.log(`[SCENARIO 1] Receipt +100 KG -> Main Store Stock: ${storeStock1.rows[0].quantity} KG (Expected: 100)`);
    if (parseFloat(storeStock1.rows[0].quantity) !== 100) throw new Error("Receipt validation failed");

    // TEST 2: Transfer 30 KG from Main Store to Production Rack
    const trfNo = await getNextDocumentNumber(client, "TRF");
    const trfRes = await query(
      `INSERT INTO internal_transfers (transfer_number, source_location_id, destination_location_id, status, created_by)
       VALUES ($1, $2, $3, 'Draft', $4) RETURNING id`,
      [trfNo, storeLocId, rackLocId, userId]
    );
    const trfId = trfRes.rows[0].id;
    await query(`INSERT INTO internal_transfer_items (transfer_id, product_id, quantity) VALUES ($1, $2, 30)`, [trfId, prodId]);

    // Validate Transfer
    await validateTransfer(trfId, userId);

    const storeStock2 = await query(`SELECT quantity FROM inventory WHERE product_id = $1 AND location_id = $2`, [prodId, storeLocId]);
    const rackStock2 = await query(`SELECT quantity FROM inventory WHERE product_id = $1 AND location_id = $2`, [prodId, rackLocId]);
    console.log(`[SCENARIO 2] Transfer 30 KG -> Main Store: ${storeStock2.rows[0].quantity} KG, Production Rack: ${rackStock2.rows[0].quantity} KG`);
    if (parseFloat(storeStock2.rows[0].quantity) !== 70 || parseFloat(rackStock2.rows[0].quantity) !== 30) {
      throw new Error("Transfer validation failed");
    }

    // TEST 3: Delivery 20 KG from Production Rack
    const delNo = await getNextDocumentNumber(client, "DEL");
    const delRes = await query(
      `INSERT INTO delivery_orders (delivery_number, source_location_id, customer_name, status, created_by)
       VALUES ($1, $2, 'ACME Industrial', 'Draft', $3) RETURNING id`,
      [delNo, rackLocId, userId]
    );
    const delId = delRes.rows[0].id;
    await query(`INSERT INTO delivery_items (delivery_id, product_id, quantity) VALUES ($1, $2, 20)`, [delId, prodId]);

    // Validate Delivery
    await validateDelivery(delId, userId);

    const rackStock3 = await query(`SELECT quantity FROM inventory WHERE product_id = $1 AND location_id = $2`, [prodId, rackLocId]);
    console.log(`[SCENARIO 3] Delivery 20 KG -> Production Rack: ${rackStock3.rows[0].quantity} KG (Expected: 10)`);
    if (parseFloat(rackStock3.rows[0].quantity) !== 10) throw new Error("Delivery validation failed");

    // TEST 4: Delivery Rejection on Insufficient Stock (Requesting 50 KG when only 10 available)
    const delFailNo = await getNextDocumentNumber(client, "DEL");
    const delFailRes = await query(
      `INSERT INTO delivery_orders (delivery_number, source_location_id, customer_name, status, created_by)
       VALUES ($1, $2, 'Overlimit Corp', 'Draft', $3) RETURNING id`,
      [delFailNo, rackLocId, userId]
    );
    const delFailId = delFailRes.rows[0].id;
    await query(`INSERT INTO delivery_items (delivery_id, product_id, quantity) VALUES ($1, $2, 50)`, [delFailId, prodId]);

    let rejectedAsExpected = false;
    try {
      await validateDelivery(delFailId, userId);
    } catch (err: any) {
      rejectedAsExpected = true;
      console.log(`[SCENARIO 4] Over-delivery rejection caught correctly: "${err.message}"`);
    }
    if (!rejectedAsExpected) throw new Error("Delivery failed to reject insufficient stock!");

    // TEST 5: Inventory Adjustment at Production Rack (Physical count = 7 KG, difference = -3 KG)
    const adjNo = await getNextDocumentNumber(client, "ADJ");
    const adjRes = await query(
      `INSERT INTO inventory_adjustments (adjustment_number, location_id, reason, status, created_by)
       VALUES ($1, $2, 'Physical Count Reconciliation', 'Draft', $3) RETURNING id`,
      [adjNo, rackLocId, userId]
    );
    const adjId = adjRes.rows[0].id;
    await query(
      `INSERT INTO inventory_adjustment_items (adjustment_id, product_id, counted_quantity, previous_quantity, difference)
       VALUES ($1, $2, 7, 10, -3)`,
      [adjId, prodId]
    );

    // Validate Adjustment
    await validateAdjustment(adjId, userId);

    const rackStock4 = await query(`SELECT quantity FROM inventory WHERE product_id = $1 AND location_id = $2`, [prodId, rackLocId]);
    const storeStock4 = await query(`SELECT quantity FROM inventory WHERE product_id = $1 AND location_id = $2`, [prodId, storeLocId]);
    const totalCompanyStock = parseFloat(rackStock4.rows[0].quantity) + parseFloat(storeStock4.rows[0].quantity);

    console.log(`[SCENARIO 5] Adjustment Physical Count 7 KG -> Production Rack: ${rackStock4.rows[0].quantity} KG, Total Company Stock: ${totalCompanyStock} KG (Expected: 77)`);
    if (parseFloat(rackStock4.rows[0].quantity) !== 7 || totalCompanyStock !== 77) {
      throw new Error("Adjustment validation failed");
    }

    // TEST 6: Verify Stock Ledger History
    const ledgerRes = await query(
      `SELECT sl.*, l.name as location_name 
       FROM stock_ledger sl 
       JOIN locations l ON sl.location_id = l.id 
       WHERE sl.product_id = $1 
       ORDER BY sl.id ASC`,
      [prodId]
    );

    console.log("\n==================================================");
    console.log("STOCK LEDGER AUDIT TRAIL FOR STEEL-001:");
    console.log("==================================================");
    ledgerRes.rows.forEach((row) => {
      console.log(
        `[${row.operation_type}] Ref: ${row.reference_number} | Location: ${row.location_name} | Qty Before: ${row.quantity_before} | Change: ${row.quantity_change} | Qty After: ${row.quantity_after} | Date: ${row.created_at}`
      );
    });

    console.log("\n==================================================");
    console.log("ALL VERIFICATION & E2E DEMO TESTS PASSED WITH 100% SUCCESS!");
    console.log("==================================================\n");
  } finally {
    client.release();
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Verification suite failed:", err);
    process.exit(1);
  });
