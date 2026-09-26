import { pool } from "./db";

let isInitialized = false;

export async function initDatabase() {
  if (isInitialized) return;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'WAREHOUSE_STAFF',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Categories table
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Products table
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        sku VARCHAR(100) UNIQUE NOT NULL,
        category_id INT REFERENCES categories(id) ON DELETE SET NULL,
        unit_of_measure VARCHAR(50) NOT NULL DEFAULT 'PCS',
        reorder_level NUMERIC(12, 2) NOT NULL DEFAULT 10,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Warehouses table
    await client.query(`
      CREATE TABLE IF NOT EXISTS warehouses (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(100) UNIQUE NOT NULL,
        address TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Locations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS locations (
        id SERIAL PRIMARY KEY,
        warehouse_id INT NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(100) NOT NULL,
        location_type VARCHAR(50) NOT NULL DEFAULT 'STORAGE',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_warehouse_location_code UNIQUE(warehouse_id, code)
      );
    `);

    // 6. Inventory table (current stock per location)
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        location_id INT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
        quantity NUMERIC(12, 2) NOT NULL DEFAULT 0,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_product_location UNIQUE(product_id, location_id)
      );
    `);

    // 7. Suppliers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        contact_name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 8. Receipts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS receipts (
        id SERIAL PRIMARY KEY,
        receipt_number VARCHAR(100) UNIQUE NOT NULL,
        supplier_id INT REFERENCES suppliers(id) ON DELETE SET NULL,
        destination_location_id INT NOT NULL REFERENCES locations(id),
        status VARCHAR(50) NOT NULL DEFAULT 'Draft',
        created_by INT REFERENCES users(id),
        validated_by INT REFERENCES users(id),
        validated_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 9. Receipt Items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS receipt_items (
        id SERIAL PRIMARY KEY,
        receipt_id INT NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
        product_id INT NOT NULL REFERENCES products(id),
        quantity NUMERIC(12, 2) NOT NULL
      );
    `);

    // 10. Delivery Orders table
    await client.query(`
      CREATE TABLE IF NOT EXISTS delivery_orders (
        id SERIAL PRIMARY KEY,
        delivery_number VARCHAR(100) UNIQUE NOT NULL,
        source_location_id INT NOT NULL REFERENCES locations(id),
        customer_name VARCHAR(255),
        status VARCHAR(50) NOT NULL DEFAULT 'Draft',
        created_by INT REFERENCES users(id),
        validated_by INT REFERENCES users(id),
        validated_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 11. Delivery Items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS delivery_items (
        id SERIAL PRIMARY KEY,
        delivery_id INT NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
        product_id INT NOT NULL REFERENCES products(id),
        quantity NUMERIC(12, 2) NOT NULL
      );
    `);

    // 12. Internal Transfers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS internal_transfers (
        id SERIAL PRIMARY KEY,
        transfer_number VARCHAR(100) UNIQUE NOT NULL,
        source_location_id INT NOT NULL REFERENCES locations(id),
        destination_location_id INT NOT NULL REFERENCES locations(id),
        status VARCHAR(50) NOT NULL DEFAULT 'Draft',
        created_by INT REFERENCES users(id),
        validated_by INT REFERENCES users(id),
        validated_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 13. Internal Transfer Items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS internal_transfer_items (
        id SERIAL PRIMARY KEY,
        transfer_id INT NOT NULL REFERENCES internal_transfers(id) ON DELETE CASCADE,
        product_id INT NOT NULL REFERENCES products(id),
        quantity NUMERIC(12, 2) NOT NULL
      );
    `);

    // 14. Inventory Adjustments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory_adjustments (
        id SERIAL PRIMARY KEY,
        adjustment_number VARCHAR(100) UNIQUE NOT NULL,
        location_id INT NOT NULL REFERENCES locations(id),
        status VARCHAR(50) NOT NULL DEFAULT 'Draft',
        reason TEXT,
        created_by INT REFERENCES users(id),
        validated_by INT REFERENCES users(id),
        validated_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 15. Inventory Adjustment Items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory_adjustment_items (
        id SERIAL PRIMARY KEY,
        adjustment_id INT NOT NULL REFERENCES inventory_adjustments(id) ON DELETE CASCADE,
        product_id INT NOT NULL REFERENCES products(id),
        counted_quantity NUMERIC(12, 2) NOT NULL,
        previous_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0,
        difference NUMERIC(12, 2) NOT NULL DEFAULT 0
      );
    `);

    // 16. Stock Ledger table
    await client.query(`
      CREATE TABLE IF NOT EXISTS stock_ledger (
        id SERIAL PRIMARY KEY,
        product_id INT NOT NULL REFERENCES products(id),
        location_id INT NOT NULL REFERENCES locations(id),
        operation_type VARCHAR(50) NOT NULL, -- RECEIPT, DELIVERY, TRANSFER_OUT, TRANSFER_IN, ADJUSTMENT
        reference_type VARCHAR(50) NOT NULL, -- RECEIPT, DELIVERY, TRANSFER, ADJUSTMENT
        reference_id INT NOT NULL,
        reference_number VARCHAR(100),
        quantity_before NUMERIC(12, 2) NOT NULL,
        quantity_change NUMERIC(12, 2) NOT NULL,
        quantity_after NUMERIC(12, 2) NOT NULL,
        performed_by INT REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Indexes for high performance querying
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_stock_ledger_product ON stock_ledger(product_id);
      CREATE INDEX IF NOT EXISTS idx_stock_ledger_location ON stock_ledger(location_id);
      CREATE INDEX IF NOT EXISTS idx_inventory_product_loc ON inventory(product_id, location_id);
      CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
    `);

    // 17. Password Reset OTPs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS password_reset_otps (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        otp_hash TEXT NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        attempts INT NOT NULL DEFAULT 0,
        is_verified BOOLEAN NOT NULL DEFAULT FALSE,
        is_used BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_otp_email ON password_reset_otps(email);
    `);

    // 18. Audit Logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE SET NULL,
        user_email VARCHAR(255),
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(100),
        entity_id INT,
        details JSONB,
        ip_address VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
    `);

    // 19. Document Sequences table for safe document numbering
    await client.query(`
      CREATE TABLE IF NOT EXISTS document_sequences (
        prefix VARCHAR(10) PRIMARY KEY,
        last_val INT NOT NULL DEFAULT 0
      );
    `);

    // Ensure active columns exist on relevant tables for soft deactivation
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE';
      ALTER TABLE products ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;
      ALTER TABLE categories ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;
      ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;
      ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;
      ALTER TABLE locations ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;
    `);

    await client.query("COMMIT");
    isInitialized = true;
    console.log("Database initialized successfully.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Failed to initialize database schema:", err);
    throw err;
  } finally {
    client.release();
  }
}
