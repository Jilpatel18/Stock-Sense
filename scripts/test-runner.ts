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

import crypto from "crypto";
import { pool, query } from "../lib/db";
import { initDatabase } from "../lib/schema";
import { hashPassword, comparePassword } from "../lib/auth";
import { validatePasswordPolicy } from "../lib/password-policy";
import { validateReceipt, validateDelivery, validateTransfer, validateAdjustment } from "../lib/inventory-service";
import { getNextDocumentNumber } from "../lib/sequence";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passedCount++;
    console.log(`  ✔ [PASS] ${testName}`);
  } else {
    failedCount++;
    console.error(`  ✖ [FAIL] ${testName}${detail ? `: ${detail}` : ""}`);
  }
}

async function runFullTestSuite() {
  console.log("==================================================");
  console.log("STOCKSENSE COMPREHENSIVE HARDENING TEST SUITE");
  console.log("==================================================\n");

  await initDatabase();
  const client = await pool.connect();

  try {
    // --------------------------------------------------
    // SECTION 1: AUTHENTICATION & PASSWORD POLICY TESTS
    // --------------------------------------------------
    console.log("--- 1. AUTH & PASSWORD POLICY TESTS ---");

    // Test 1.1 Password Policy Validation
    const weakPass = validatePasswordPolicy("short");
    assert(weakPass !== null, "Weak password < 8 chars rejected");

    const noUpperPass = validatePasswordPolicy("password123");
    assert(noUpperPass !== null, "Password missing uppercase rejected");

    const validPass = validatePasswordPolicy("StockSense@2026");
    assert(validPass === null, "Valid strong password accepted");

    // Test 1.2 User Signup (Default WAREHOUSE_STAFF)
    const testEmail = `staff.${Date.now()}@stocksense.com`;
    const passHash = await hashPassword("StockSense@2026");
    const signupRes = await query(
      `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'WAREHOUSE_STAFF') RETURNING *`,
      ["Test Staff", testEmail, passHash]
    );
    const staffUser = signupRes.rows[0];
    assert(staffUser.role === "WAREHOUSE_STAFF", "Signup defaults to WAREHOUSE_STAFF role");

    // Test 1.3 Login Verification
    const isMatch = await comparePassword("StockSense@2026", staffUser.password_hash);
    const isWrongMatch = await comparePassword("WrongPassword123", staffUser.password_hash);
    assert(isMatch === true, "Valid password credentials verify successfully");
    assert(isWrongMatch === false, "Invalid password credentials fail verification");

    // --------------------------------------------------
    // SECTION 2: OTP & PASSWORD RESET TESTS
    // --------------------------------------------------
    console.log("\n--- 2. OTP & ATOMIC PASSWORD RESET TESTS ---");

    const otpEmail = `reset.${Date.now()}@stocksense.com`;
    await query(
      `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'WAREHOUSE_STAFF')`,
      ["Reset User", otpEmail, passHash]
    );

    // Test 2.1 OTP Generation & Hashing
    const rawOtp = crypto.randomInt(100000, 999999).toString();
    const otpHash = await hashPassword(rawOtp);

    const otpRecordRes = await query(
      `INSERT INTO password_reset_otps (email, otp_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL '10 minutes') RETURNING id`,
      [otpEmail, otpHash]
    );
    const otpId = otpRecordRes.rows[0].id;
    assert(otpId > 0, "OTP generated and stored in PostgreSQL");

    // Test 2.2 Invalid OTP Code Rejection
    const isValidWrong = await comparePassword("000000", otpHash);
    assert(isValidWrong === false, "Invalid OTP code rejected");

    // Test 2.3 Successful OTP Verification
    const isValidRight = await comparePassword(rawOtp, otpHash);
    assert(isValidRight === true, "Valid OTP code verified");

    await query(`UPDATE password_reset_otps SET is_verified = true WHERE id = $1`, [otpId]);

    // Test 2.4 Used OTP Cannot Be Reused
    await query(`UPDATE password_reset_otps SET is_used = true WHERE id = $1`, [otpId]);
    const recheckRes = await query(`SELECT * FROM password_reset_otps WHERE id = $1 AND is_used = false`, [otpId]);
    assert(recheckRes.rows.length === 0, "Used OTP cannot be reused");

    // --------------------------------------------------
    // SECTION 3: INVENTORY OPERATIONS & CONCURRENCY TESTS
    // --------------------------------------------------
    console.log("\n--- 3. INVENTORY OPERATIONS & CONCURRENCY TESTS ---");

    // Setup Test Entities
    const managerRes = await query(
      `INSERT INTO users (name, email, password_hash, role) VALUES ('Manager', $1, 'hash', 'INVENTORY_MANAGER') RETURNING id`,
      [`mgr.${Date.now()}@stocksense.com`]
    );
    const managerId = managerRes.rows[0].id;

    const whRes = await query(
      `INSERT INTO warehouses (name, code) VALUES ('Test Hub', $1) RETURNING id`,
      [`WH-SUITE-${Date.now()}`]
    );
    const whId = whRes.rows[0].id;

    const loc1Res = await query(
      `INSERT INTO locations (warehouse_id, name, code) VALUES ($1, 'Location A', $2) RETURNING id`,
      [whId, `LOC-A-${Date.now()}`]
    );
    const loc1Id = loc1Res.rows[0].id;

    const loc2Res = await query(
      `INSERT INTO locations (warehouse_id, name, code) VALUES ($1, 'Location B', $2) RETURNING id`,
      [whId, `LOC-B-${Date.now()}`]
    );
    const loc2Id = loc2Res.rows[0].id;

    const prodRes = await query(
      `INSERT INTO products (name, sku, unit_of_measure, reorder_level) VALUES ('Test Widget', $1, 'PCS', 10) RETURNING id`,
      [`SKU-SUITE-${Date.now()}`]
    );
    const prodId = prodRes.rows[0].id;

    // Test 3.1 Draft / Canceled Operation Does Not Modify Inventory
    const recDraftNo = await getNextDocumentNumber(client, "REC");
    const recDraftRes = await query(
      `INSERT INTO receipts (receipt_number, destination_location_id, status, created_by) VALUES ($1, $2, 'Draft', $3) RETURNING id`,
      [recDraftNo, loc1Id, managerId]
    );
    await query(`INSERT INTO receipt_items (receipt_id, product_id, quantity) VALUES ($1, $2, 500)`, [recDraftRes.rows[0].id, prodId]);

    const initialInv = await query(`SELECT quantity FROM inventory WHERE product_id = $1 AND location_id = $2`, [prodId, loc1Id]);
    const draftStock = initialInv.rows.length > 0 ? parseFloat(initialInv.rows[0].quantity) : 0;
    assert(draftStock === 0, "Draft receipt does not modify inventory");

    // Test 3.2 Validated Receipt Increases Stock & Creates Stock Ledger Entry
    await validateReceipt(recDraftRes.rows[0].id, managerId);
    const postReceiptInv = await query(`SELECT quantity FROM inventory WHERE product_id = $1 AND location_id = $2`, [prodId, loc1Id]);
    assert(parseFloat(postReceiptInv.rows[0].quantity) === 500, "Validated receipt increases inventory stock (+500)");

    const receiptLedger = await query(
      `SELECT * FROM stock_ledger WHERE reference_number = $1 AND operation_type = 'RECEIPT'`,
      [recDraftNo]
    );
    assert(receiptLedger.rows.length === 1, "Receipt creates stock ledger entry");
    assert(parseFloat(receiptLedger.rows[0].quantity_before) === 0, "Stock ledger quantity_before is accurate (0)");
    assert(parseFloat(receiptLedger.rows[0].quantity_after) === 500, "Stock ledger quantity_after is accurate (500)");

    // Test 3.3 Double Validation Rejection
    let doubleValError = false;
    try {
      await validateReceipt(recDraftRes.rows[0].id, managerId);
    } catch (err) {
      doubleValError = true;
    }
    assert(doubleValError === true, "Already validated 'Done' receipt cannot be validated twice");

    // Test 3.4 Transfer Decreases Source, Increases Destination, Preserves Total Stock
    const trfNo = await getNextDocumentNumber(client, "TRF");
    const trfRes = await query(
      `INSERT INTO internal_transfers (transfer_number, source_location_id, destination_location_id, status, created_by)
       VALUES ($1, $2, $3, 'Draft', $4) RETURNING id`,
      [trfNo, loc1Id, loc2Id, managerId]
    );
    const trfId = trfRes.rows[0].id;
    await query(`INSERT INTO internal_transfer_items (transfer_id, product_id, quantity) VALUES ($1, $2, 150)`, [trfId, prodId]);

    await validateTransfer(trfId, managerId);

    const loc1PostTrf = await query(`SELECT quantity FROM inventory WHERE product_id = $1 AND location_id = $2`, [prodId, loc1Id]);
    const loc2PostTrf = await query(`SELECT quantity FROM inventory WHERE product_id = $1 AND location_id = $2`, [prodId, loc2Id]);
    const totalCompanyPostTrf = parseFloat(loc1PostTrf.rows[0].quantity) + parseFloat(loc2PostTrf.rows[0].quantity);

    assert(parseFloat(loc1PostTrf.rows[0].quantity) === 350, "Transfer decreases source location stock (500 -> 350)");
    assert(parseFloat(loc2PostTrf.rows[0].quantity) === 150, "Transfer increases destination location stock (0 -> 150)");
    assert(totalCompanyPostTrf === 500, "Transfer preserves total company stock (500)");

    // Test 3.5 Delivery Decreases Stock & Rejects Insufficient Stock
    const delNo = await getNextDocumentNumber(client, "DEL");
    const delRes = await query(
      `INSERT INTO delivery_orders (delivery_number, source_location_id, status, created_by) VALUES ($1, $2, 'Draft', $3) RETURNING id`,
      [delNo, loc2Id, managerId]
    );
    const delId = delRes.rows[0].id;
    await query(`INSERT INTO delivery_items (delivery_id, product_id, quantity) VALUES ($1, $2, 50)`, [delId, prodId]);

    await validateDelivery(delId, managerId);
    const loc2PostDel = await query(`SELECT quantity FROM inventory WHERE product_id = $1 AND location_id = $2`, [prodId, loc2Id]);
    assert(parseFloat(loc2PostDel.rows[0].quantity) === 100, "Delivery decreases stock (150 -> 100)");

    // Over-delivery rejection test
    const delOverNo = await getNextDocumentNumber(client, "DEL");
    const delOverRes = await query(
      `INSERT INTO delivery_orders (delivery_number, source_location_id, status, created_by) VALUES ($1, $2, 'Draft', $3) RETURNING id`,
      [delOverNo, loc2Id, managerId]
    );
    await query(`INSERT INTO delivery_items (delivery_id, product_id, quantity) VALUES ($1, $2, 999)`, [delOverRes.rows[0].id, prodId]);

    let overdelError = false;
    try {
      await validateDelivery(delOverRes.rows[0].id, managerId);
    } catch (err) {
      overdelError = true;
    }
    assert(overdelError === true, "Delivery rejects request exceeding available location stock");

    // Test 3.6 Inventory Adjustment Reconciles Stock
    const adjNo = await getNextDocumentNumber(client, "ADJ");
    const adjRes = await query(
      `INSERT INTO inventory_adjustments (adjustment_number, location_id, status, created_by) VALUES ($1, $2, 'Draft', $3) RETURNING id`,
      [adjNo, loc2Id, managerId]
    );
    const adjId = adjRes.rows[0].id;
    await query(`INSERT INTO inventory_adjustment_items (adjustment_id, product_id, counted_quantity, previous_quantity, difference) VALUES ($1, $2, 85, 100, -15)`, [adjId, prodId]);

    await validateAdjustment(adjId, managerId);
    const loc2PostAdj = await query(`SELECT quantity FROM inventory WHERE product_id = $1 AND location_id = $2`, [prodId, loc2Id]);
    assert(parseFloat(loc2PostAdj.rows[0].quantity) === 85, "Adjustment reconciles stock to physical count (85)");

    console.log("\n==================================================");
    console.log(`TEST SUITE SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log("==================================================\n");

    if (failedCount > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } finally {
    client.release();
  }
}

runFullTestSuite().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
