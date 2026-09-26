import { pool } from "./db";
import { initDatabase } from "./schema";
import { hashPassword } from "./auth";
import { validateReceipt, validateTransfer, validateDelivery, validateAdjustment } from "./inventory-service";

export async function seedDemoData() {
  await initDatabase();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Create Users
    const passwordHash = await hashPassword("password123");
    
    // Inventory Manager
    const mgrRes = await client.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ('Alex Rivera', 'manager@stocksense.com', $1, 'INVENTORY_MANAGER')
       ON CONFLICT (email) DO UPDATE SET role = 'INVENTORY_MANAGER'
       RETURNING id`,
      [passwordHash]
    );
    const mgrId = mgrRes.rows[0].id;

    // Warehouse Staff
    const staffRes = await client.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ('Sam Taylor', 'staff@stocksense.com', $1, 'WAREHOUSE_STAFF')
       ON CONFLICT (email) DO UPDATE SET role = 'WAREHOUSE_STAFF'
       RETURNING id`,
      [passwordHash]
    );
    const staffId = staffRes.rows[0].id;

    // 2. Categories
    const catMetals = await client.query(
      `INSERT INTO categories (name, description) VALUES ('Metals & Steel', 'Raw metal bars, rods, and sheets')
       ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description RETURNING id`
    );
    const catFurniture = await client.query(
      `INSERT INTO categories (name, description) VALUES ('Furniture & Fixtures', 'Office chairs, tables, and cabinets')
       ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description RETURNING id`
    );
    const catElectrical = await client.query(
      `INSERT INTO categories (name, description) VALUES ('Electrical Supplies', 'Copper wires, cables, switches')
       ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description RETURNING id`
    );

    // 3. Products
    const pSteel = await client.query(
      `INSERT INTO products (name, sku, category_id, unit_of_measure, reorder_level)
       VALUES ('Steel Rods', 'STEEL-001', $1, 'KG', 25.00)
       ON CONFLICT (sku) DO UPDATE SET reorder_level = 25.00 RETURNING id`,
      [catMetals.rows[0].id]
    );
    const pChair = await client.query(
      `INSERT INTO products (name, sku, category_id, unit_of_measure, reorder_level)
       VALUES ('Ergonomic Chair', 'CHAIR-001', $1, 'PCS', 15.00)
       ON CONFLICT (sku) DO UPDATE SET reorder_level = 15.00 RETURNING id`,
      [catFurniture.rows[0].id]
    );
    const pCopper = await client.query(
      `INSERT INTO products (name, sku, category_id, unit_of_measure, reorder_level)
       VALUES ('Copper Wiring Cable', 'COPPER-001', $1, 'Meters', 50.00)
       ON CONFLICT (sku) DO UPDATE SET reorder_level = 50.00 RETURNING id`,
      [catElectrical.rows[0].id]
    );

    // 4. Warehouses & Locations
    const w1 = await client.query(
      `INSERT INTO warehouses (name, code, address) VALUES ('Main Warehouse', 'MW-01', '100 Industrial Pkwy, Sector 4')
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id`
    );
    const w2 = await client.query(
      `INSERT INTO warehouses (name, code, address) VALUES ('West Warehouse', 'WW-01', '50 Logistics Ave, Gate 2')
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id`
    );

    const locMainStore = await client.query(
      `INSERT INTO locations (warehouse_id, name, code, location_type) VALUES ($1, 'Main Store', 'MS-01', 'STORAGE')
       ON CONFLICT (warehouse_id, code) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
      [w1.rows[0].id]
    );
    const locProdFloor = await client.query(
      `INSERT INTO locations (warehouse_id, name, code, location_type) VALUES ($1, 'Production Floor', 'PR-01', 'PRODUCTION')
       ON CONFLICT (warehouse_id, code) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
      [w1.rows[0].id]
    );
    const locDispatch = await client.query(
      `INSERT INTO locations (warehouse_id, name, code, location_type) VALUES ($1, 'Dispatch Area', 'DA-01', 'DISPATCH')
       ON CONFLICT (warehouse_id, code) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
      [w1.rows[0].id]
    );
    const locRackA = await client.query(
      `INSERT INTO locations (warehouse_id, name, code, location_type) VALUES ($1, 'Rack A', 'RA-01', 'STORAGE')
       ON CONFLICT (warehouse_id, code) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
      [w2.rows[0].id]
    );

    // 5. Suppliers
    const s1 = await client.query(
      `INSERT INTO suppliers (name, contact_name, email, phone, address)
       VALUES ('Global Steel Industries', 'Marcus Vance', 'marcus@globalsteel.com', '+1 555-0192', '770 Heavy Forge Way')
       RETURNING id`
    );
    const s2 = await client.query(
      `INSERT INTO suppliers (name, contact_name, email, phone, address)
       VALUES ('TechCraft Furniture Co', 'Elena Rostova', 'elena@techcraft.com', '+1 555-0144', '12 Comfort Plaza')
       RETURNING id`
    );

    await client.query("COMMIT");

    // Clear operational documents to create clean demo flow
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

    // 6. Create Initial Validated Demo Scenario Receipts & Operations
    // Step 1: Receipt REC-00001 (100 kg Steel Rods into Main Store)
    const rec1 = await client.query(
      `INSERT INTO receipts (receipt_number, supplier_id, destination_location_id, status, created_by)
       VALUES ('REC-00001', $1, $2, 'Draft', $3) RETURNING id`,
      [s1.rows[0].id, locMainStore.rows[0].id, mgrId]
    );
    await client.query(
      `INSERT INTO receipt_items (receipt_id, product_id, quantity) VALUES ($1, $2, 100.00)`,
      [rec1.rows[0].id, pSteel.rows[0].id]
    );

    // Receipt REC-00002 (30 Ergonomic Chairs into Rack A)
    const rec2 = await client.query(
      `INSERT INTO receipts (receipt_number, supplier_id, destination_location_id, status, created_by)
       VALUES ('REC-00002', $1, $2, 'Draft', $3) RETURNING id`,
      [s2.rows[0].id, locRackA.rows[0].id, mgrId]
    );
    await client.query(
      `INSERT INTO receipt_items (receipt_id, product_id, quantity) VALUES ($1, $2, 30.00)`,
      [rec2.rows[0].id, pChair.rows[0].id]
    );

    // Validate REC-00001 & REC-00002 to load stock
    await validateReceipt(rec1.rows[0].id, mgrId);
    await validateReceipt(rec2.rows[0].id, mgrId);

    // Step 2: Internal Transfer TRN-00001 (Move 30 kg Steel Rods from Main Store to Production Floor)
    const trn1 = await client.query(
      `INSERT INTO internal_transfers (transfer_number, source_location_id, destination_location_id, status, created_by)
       VALUES ('TRN-00001', $1, $2, 'Draft', $3) RETURNING id`,
      [locMainStore.rows[0].id, locProdFloor.rows[0].id, mgrId]
    );
    await client.query(
      `INSERT INTO internal_transfer_items (transfer_id, product_id, quantity) VALUES ($1, $2, 30.00)`,
      [trn1.rows[0].id, pSteel.rows[0].id]
    );
    await validateTransfer(trn1.rows[0].id, mgrId);

    // Step 3: Delivery DEL-00001 (Deliver 20 kg Steel Rods from Production Floor)
    const del1 = await client.query(
      `INSERT INTO delivery_orders (delivery_number, source_location_id, customer_name, status, created_by)
       VALUES ('DEL-00001', $1, 'Apex Manufacturing', 'Draft', $2) RETURNING id`,
      [locProdFloor.rows[0].id, mgrId]
    );
    await client.query(
      `INSERT INTO delivery_items (delivery_id, product_id, quantity) VALUES ($1, $2, 20.00)`,
      [del1.rows[0].id, pSteel.rows[0].id]
    );
    await validateDelivery(del1.rows[0].id, mgrId);

    // Step 4: Inventory Adjustment ADJ-00001 (Physical count on Production Floor finds 7 kg steel instead of 10 kg, adjustment -3 kg)
    const adj1 = await client.query(
      `INSERT INTO inventory_adjustments (adjustment_number, location_id, reason, status, created_by)
       VALUES ('ADJ-00001', $1, 'Physical audit found damaged stock (-3 kg)', 'Draft', $2) RETURNING id`,
      [locProdFloor.rows[0].id, mgrId]
    );
    await client.query(
      `INSERT INTO inventory_adjustment_items (adjustment_id, product_id, counted_quantity, previous_quantity, difference)
       VALUES ($1, $2, 7.00, 10.00, -3.00)`,
      [adj1.rows[0].id, pSteel.rows[0].id]
    );
    await validateAdjustment(adj1.rows[0].id, mgrId);

    // Create 1 Ready/Draft Receipt and 1 Ready Delivery order for active demonstration of live validation!
    const recDraft = await client.query(
      `INSERT INTO receipts (receipt_number, supplier_id, destination_location_id, status, created_by)
       VALUES ('REC-00003', $1, $2, 'Ready', $3) RETURNING id`,
      [s1.rows[0].id, locMainStore.rows[0].id, staffId]
    );
    await client.query(
      `INSERT INTO receipt_items (receipt_id, product_id, quantity) VALUES ($1, $2, 50.00)`,
      [recDraft.rows[0].id, pCopper.rows[0].id]
    );

    const delDraft = await client.query(
      `INSERT INTO delivery_orders (delivery_number, source_location_id, customer_name, status, created_by)
       VALUES ('DEL-00002', $1, 'BuildTech Ltd', 'Waiting', $2) RETURNING id`,
      [locRackA.rows[0].id, staffId]
    );
    await client.query(
      `INSERT INTO delivery_items (delivery_id, product_id, quantity) VALUES ($1, $2, 10.00)`,
      [delDraft.rows[0].id, pChair.rows[0].id]
    );

    return {
      success: true,
      message: "Database seeded successfully with demo users, products, warehouses, locations, and step-by-step stock movements!",
    };
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error seeding demo data:", err);
    throw err;
  } finally {
    client.release();
  }
}
