import { pool } from "./db";
import { initDatabase } from "./schema";
import { hashPassword } from "./auth";
import { validateReceipt, validateTransfer, validateDelivery, validateAdjustment } from "./inventory-service";

export async function seedDemoData() {
  await initDatabase();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Create Demo Users
    const passwordHash = await hashPassword("password123");

    // Inventory Manager
    const mgrRes = await client.query(
      `INSERT INTO users (name, email, password_hash, role, status)
       VALUES ('Alex Rivera', 'manager@stocksense.com', $1, 'INVENTORY_MANAGER', 'ACTIVE')
       ON CONFLICT (email) DO UPDATE SET role = 'INVENTORY_MANAGER', status = 'ACTIVE'
       RETURNING id`,
      [passwordHash]
    );
    const mgrId = mgrRes.rows[0].id;

    // Warehouse Staff
    const staffRes = await client.query(
      `INSERT INTO users (name, email, password_hash, role, status)
       VALUES ('Sam Taylor', 'staff@stocksense.com', $1, 'WAREHOUSE_STAFF', 'ACTIVE')
       ON CONFLICT (email) DO UPDATE SET role = 'WAREHOUSE_STAFF', status = 'ACTIVE'
       RETURNING id`,
      [passwordHash]
    );
    const staffId = staffRes.rows[0].id;

    // 2. Categories (Acme Manufacturing)
    const catRaw = await client.query(
      `INSERT INTO categories (name, description) VALUES ('Raw Materials', 'Base materials for manufacturing processes')
       ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description RETURNING id`
    );
    const catComp = await client.query(
      `INSERT INTO categories (name, description) VALUES ('Components', 'Sub-assemblies, motors, bearings, and parts')
       ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description RETURNING id`
    );
    const catFinished = await client.query(
      `INSERT INTO categories (name, description) VALUES ('Finished Products', 'Completed assemblies ready for delivery')
       ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description RETURNING id`
    );

    // 3. Products (Acme Manufacturing)
    const pSteel = await client.query(
      `INSERT INTO products (name, sku, category_id, unit_of_measure, reorder_level)
       VALUES ('Steel Rod', 'STEEL-001', $1, 'KG', 25.00)
       ON CONFLICT (sku) DO UPDATE SET category_id = $1, reorder_level = 25.00 RETURNING id`,
      [catRaw.rows[0].id]
    );
    const pCopper = await client.query(
      `INSERT INTO products (name, sku, category_id, unit_of_measure, reorder_level)
       VALUES ('Copper Wire', 'COPPER-001', $1, 'Meters', 50.00)
       ON CONFLICT (sku) DO UPDATE SET category_id = $1, reorder_level = 50.00 RETURNING id`,
      [catRaw.rows[0].id]
    );
    const pBearing = await client.query(
      `INSERT INTO products (name, sku, category_id, unit_of_measure, reorder_level)
       VALUES ('Bearing', 'BEARING-001', $1, 'PCS', 100.00)
       ON CONFLICT (sku) DO UPDATE SET category_id = $1, reorder_level = 100.00 RETURNING id`,
      [catComp.rows[0].id]
    );
    const pMotor = await client.query(
      `INSERT INTO products (name, sku, category_id, unit_of_measure, reorder_level)
       VALUES ('Motor', 'MOTOR-001', $1, 'PCS', 10.00)
       ON CONFLICT (sku) DO UPDATE SET category_id = $1, reorder_level = 10.00 RETURNING id`,
      [catComp.rows[0].id]
    );
    const pPanel = await client.query(
      `INSERT INTO products (name, sku, category_id, unit_of_measure, reorder_level)
       VALUES ('Control Panel', 'PANEL-001', $1, 'PCS', 5.00)
       ON CONFLICT (sku) DO UPDATE SET category_id = $1, reorder_level = 5.00 RETURNING id`,
      [catFinished.rows[0].id]
    );

    // 4. Warehouses (Acme Manufacturing)
    const wMain = await client.query(
      `INSERT INTO warehouses (name, code, address) VALUES ('Main Warehouse', 'MW-01', '100 Industrial Pkwy, Sector 4')
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id`
    );
    const wRawStore = await client.query(
      `INSERT INTO warehouses (name, code, address) VALUES ('Raw Material Store', 'RMS-01', '102 Supply Chain Rd, Gate 1')
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id`
    );
    const wFinished = await client.query(
      `INSERT INTO warehouses (name, code, address) VALUES ('Finished Goods', 'FG-01', '104 Logistics Hub, Gate 3')
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id`
    );

    // Locations
    const locMainStorage = await client.query(
      `INSERT INTO locations (warehouse_id, name, code, location_type) VALUES ($1, 'Main Storage', 'MS-01', 'STORAGE')
       ON CONFLICT (warehouse_id, code) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
      [wMain.rows[0].id]
    );
    const locRawRackA = await client.query(
      `INSERT INTO locations (warehouse_id, name, code, location_type) VALUES ($1, 'Raw Material Rack A', 'RMA-01', 'STORAGE')
       ON CONFLICT (warehouse_id, code) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
      [wRawStore.rows[0].id]
    );
    const locAssemblyBay1 = await client.query(
      `INSERT INTO locations (warehouse_id, name, code, location_type) VALUES ($1, 'Assembly Bay 1', 'AB1-01', 'PRODUCTION')
       ON CONFLICT (warehouse_id, code) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
      [wFinished.rows[0].id]
    );

    // 5. Suppliers
    const s1 = await client.query(
      `INSERT INTO suppliers (name, contact_name, email, phone, address)
       VALUES ('Global Steel Supplies Ltd', 'Marcus Vance', 'marcus@globalsteel.com', '+1 555-0192', '770 Heavy Forge Way')
       RETURNING id`
    );
    const s2 = await client.query(
      `INSERT INTO suppliers (name, contact_name, email, phone, address)
       VALUES ('Apex Components Co', 'Elena Rostova', 'elena@apexcomponents.com', '+1 555-0144', '12 Comfort Plaza')
       RETURNING id`
    );

    await client.query("COMMIT");

    // Clean operational history before seeding step-by-step history
    await client.query("DELETE FROM stock_ledger");
    await client.query("DELETE FROM inventory_adjustment_items");
    await client.query("DELETE FROM inventory_adjustments");
    await client.query("DELETE FROM internal_transfer_items");
    await client.query("DELETE FROM internal_transfers");
    await client.query("DELETE FROM delivery_items");
    await client.query("DELETE FROM delivery_orders");
    await client.query("DELETE FROM receipt_items");
    await client.query("DELETE FROM receipts");
    await client.query("DELETE FROM inventory");

    // 6. Step-by-Step Operations Flow for Acme Manufacturing Demo
    // Step A: Receipt REC-00001 (Steel Rod +100 KG into Raw Material Rack A)
    const rec1 = await client.query(
      `INSERT INTO receipts (receipt_number, supplier_id, destination_location_id, status, created_by)
       VALUES ('REC-00001', $1, $2, 'Draft', $3) RETURNING id`,
      [s1.rows[0].id, locRawRackA.rows[0].id, mgrId]
    );
    await client.query(`INSERT INTO receipt_items (receipt_id, product_id, quantity) VALUES ($1, $2, 100.00)`, [rec1.rows[0].id, pSteel.rows[0].id]);
    await validateReceipt(rec1.rows[0].id, mgrId);

    // Step B: Receipt REC-00002 (Copper Wire +150 M into Raw Material Rack A)
    const rec2 = await client.query(
      `INSERT INTO receipts (receipt_number, supplier_id, destination_location_id, status, created_by)
       VALUES ('REC-00002', $1, $2, 'Draft', $3) RETURNING id`,
      [s1.rows[0].id, locRawRackA.rows[0].id, mgrId]
    );
    await client.query(`INSERT INTO receipt_items (receipt_id, product_id, quantity) VALUES ($1, $2, 150.00)`, [rec2.rows[0].id, pCopper.rows[0].id]);
    await validateReceipt(rec2.rows[0].id, mgrId);

    // Step C: Receipt REC-00003 (Bearing +200 PCS into Main Storage)
    const rec3 = await client.query(
      `INSERT INTO receipts (receipt_number, supplier_id, destination_location_id, status, created_by)
       VALUES ('REC-00003', $1, $2, 'Draft', $3) RETURNING id`,
      [s2.rows[0].id, locMainStorage.rows[0].id, mgrId]
    );
    await client.query(`INSERT INTO receipt_items (receipt_id, product_id, quantity) VALUES ($1, $2, 200.00)`, [rec3.rows[0].id, pBearing.rows[0].id]);
    await validateReceipt(rec3.rows[0].id, mgrId);

    // Step D: Receipt REC-00004 (Motor +5 PCS into Main Storage - LOW STOCK DEMO: 5 < 10)
    const rec4 = await client.query(
      `INSERT INTO receipts (receipt_number, supplier_id, destination_location_id, status, created_by)
       VALUES ('REC-00004', $1, $2, 'Draft', $3) RETURNING id`,
      [s2.rows[0].id, locMainStorage.rows[0].id, mgrId]
    );
    await client.query(`INSERT INTO receipt_items (receipt_id, product_id, quantity) VALUES ($1, $2, 5.00)`, [rec4.rows[0].id, pMotor.rows[0].id]);
    await validateReceipt(rec4.rows[0].id, mgrId);

    // Step E: Internal Transfer TRF-00001 (Move 30 KG Steel Rod from Raw Material Rack A to Assembly Bay 1)
    const trn1 = await client.query(
      `INSERT INTO internal_transfers (transfer_number, source_location_id, destination_location_id, status, created_by)
       VALUES ('TRF-00001', $1, $2, 'Draft', $3) RETURNING id`,
      [locRawRackA.rows[0].id, locAssemblyBay1.rows[0].id, mgrId]
    );
    await client.query(`INSERT INTO internal_transfer_items (transfer_id, product_id, quantity) VALUES ($1, $2, 30.00)`, [trn1.rows[0].id, pSteel.rows[0].id]);
    await validateTransfer(trn1.rows[0].id, mgrId);

    // Step F: Delivery Order DEL-00001 (Deliver 20 KG Steel Rod from Assembly Bay 1 to Acme Client)
    const del1 = await client.query(
      `INSERT INTO delivery_orders (delivery_number, source_location_id, customer_name, status, created_by)
       VALUES ('DEL-00001', $1, 'Industrial Automation Corp', 'Draft', $2) RETURNING id`,
      [locAssemblyBay1.rows[0].id, mgrId]
    );
    await client.query(`INSERT INTO delivery_items (delivery_id, product_id, quantity) VALUES ($1, $2, 20.00)`, [del1.rows[0].id, pSteel.rows[0].id]);
    await validateDelivery(del1.rows[0].id, mgrId);

    // Step G: Inventory Adjustment ADJ-00001 (Physical stock on Raw Material Rack A found 67 KG instead of 70 KG -> -3 KG)
    const adj1 = await client.query(
      `INSERT INTO inventory_adjustments (adjustment_number, location_id, reason, status, created_by)
       VALUES ('ADJ-00001', $1, 'Physical audit found minor scrap variance (-3 KG)', 'Draft', $2) RETURNING id`,
      [locRawRackA.rows[0].id, mgrId]
    );
    await client.query(
      `INSERT INTO inventory_adjustment_items (adjustment_id, product_id, counted_quantity, previous_quantity, difference)
       VALUES ($1, $2, 67.00, 70.00, -3.00)`,
      [adj1.rows[0].id, pSteel.rows[0].id]
    );
    await validateAdjustment(adj1.rows[0].id, mgrId);

    // Ready/Draft items for live UI validation demos
    const recReady = await client.query(
      `INSERT INTO receipts (receipt_number, supplier_id, destination_location_id, status, created_by)
       VALUES ('REC-00005', $1, $2, 'Ready', $3) RETURNING id`,
      [s2.rows[0].id, locMainStorage.rows[0].id, staffId]
    );
    await client.query(`INSERT INTO receipt_items (receipt_id, product_id, quantity) VALUES ($1, $2, 15.00)`, [recReady.rows[0].id, pMotor.rows[0].id]);

    const delWait = await client.query(
      `INSERT INTO delivery_orders (delivery_number, source_location_id, customer_name, status, created_by)
       VALUES ('DEL-00002', $1, 'Precision Builders Inc', 'Waiting', $2) RETURNING id`,
      [locMainStorage.rows[0].id, staffId]
    );
    await client.query(`INSERT INTO delivery_items (delivery_id, product_id, quantity) VALUES ($1, $2, 25.00)`, [delWait.rows[0].id, pBearing.rows[0].id]);

    return {
      success: true,
      message: "Database seeded successfully for Acme Manufacturing! Total Steel Rod stock = 77 KG (67 KG Raw Rack A + 10 KG Assembly Bay 1).",
    };
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error seeding demo data:", err);
    throw err;
  } finally {
    client.release();
  }
}

