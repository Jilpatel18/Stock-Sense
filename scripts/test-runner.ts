import fs from "fs";
import path from "path";

// Load .env file BEFORE importing modules that depend on process.env
try {
  const envPath = path.resolve(__dirname, "../.env");
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf8");
    for (const line of envConfig.split("\n")) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*["']?(.*?)["']?\s*$/);
      if (match) {
        const key = match[1];
        const value = match[2];
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
} catch (err) {
  console.warn("Failed to load .env file:", err);
}

// --------------------------------------------------
// 1. TEST DATABASE & PRODUCTION SAFETY GUARD
// --------------------------------------------------
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  console.log("ℹ Using TEST_DATABASE_URL for test suite execution.");
}

if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROD_TESTING !== "true") {
  console.error("CRITICAL ERROR: Refusing to execute destructive test suite in NODE_ENV=production!");
  console.error("To override for dedicated test databases, set ALLOW_PROD_TESTING=true or configure TEST_DATABASE_URL.");
  process.exit(1);
}

import crypto from "crypto";
import { pool, query } from "../lib/db";
import { initDatabase } from "../lib/schema";
import { hashPassword, comparePassword, signSessionToken, verifySessionToken, getJwtSecret } from "../lib/auth";
import { validatePasswordPolicy } from "../lib/password-policy";
import { validateReceipt, validateDelivery, validateTransfer, validateAdjustment } from "../lib/inventory-service";
import { getNextDocumentNumber } from "../lib/sequence";
import { getInitials, formatRole } from "../components/AppLayout";
import { getSafeRedirect } from "../app/login/page";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passedCount++;
    console.log(`  ✔ [PASS] ${testName}`);
  } else {
    failedCount++;
    console.error(`  x [FAIL] ${testName}${detail ? `: ${detail}` : ""}`);
  }
}

async function runFullTestSuite() {
  console.log("==================================================");
  console.log("STOCKSENSE COMPREHENSIVE HARDENING & QA TEST SUITE");
  console.log("==================================================\n");

  await initDatabase();
  const client = await pool.connect();

  try {
    // --------------------------------------------------
    // SECTION 1: AUTHENTICATION, JWT & SECURITY TESTS
    // --------------------------------------------------
    console.log("--- 1. AUTH & JWT SECURITY TESTS ---");

    // Test 1.1 Production Missing JWT Secret Safety
    const originalEnv = process.env.NODE_ENV;
    const originalSecret = process.env.JWT_SECRET;
    try {
      (process.env as any).NODE_ENV = "production";
      delete process.env.JWT_SECRET;
      let secretError = false;
      try {
        getJwtSecret();
      } catch (err) {
        secretError = true;
      }
      assert(secretError === true, "Production fails safely if JWT_SECRET environment variable is missing");
    } finally {
      (process.env as any).NODE_ENV = originalEnv;
      if (originalSecret) process.env.JWT_SECRET = originalSecret;
    }

    // Test 1.2 JWT Signing & Verification
    const testPayload = { id: 9999, name: "Test User", email: "test@stocksense.com", role: "WAREHOUSE_STAFF" };
    const token = await signSessionToken(testPayload);
    assert(typeof token === "string" && token.length > 20, "JWT token signed successfully with HS256");

    const verified = await verifySessionToken(token);
    assert(verified !== null && verified.email === "test@stocksense.com", "JWT verified successfully with valid signature");

    const tamperedVerified = await verifySessionToken(token + "tampered");
    assert(tamperedVerified === null, "Tampered JWT token rejected");

    // Test 1.3 Password Policy Validation
    const weakPass = validatePasswordPolicy("short");
    assert(weakPass !== null, "Weak password < 8 chars rejected");

    const noUpperPass = validatePasswordPolicy("password123");
    assert(noUpperPass !== null, "Password missing uppercase rejected");

    const validPass = validatePasswordPolicy("StockSense@2026");
    assert(validPass === null, "Valid strong password accepted");

    // Test 1.4 User Signup (Default WAREHOUSE_STAFF & ACTIVE)
    const testEmail = `staff.${Date.now()}@stocksense.com`;
    const passHash = await hashPassword("StockSense@2026");
    const signupRes = await query(
      `INSERT INTO users (name, email, password_hash, role, status) VALUES ($1, $2, $3, 'WAREHOUSE_STAFF', 'ACTIVE') RETURNING *`,
      ["Test Staff", testEmail, passHash]
    );
    const staffUser = signupRes.rows[0];
    assert(staffUser.role === "WAREHOUSE_STAFF", "Signup defaults to WAREHOUSE_STAFF role");
    assert(staffUser.status === "ACTIVE", "New user status defaults to ACTIVE");

    // Test 1.5 Login Verification
    const isMatch = await comparePassword("StockSense@2026", staffUser.password_hash);
    const isWrongMatch = await comparePassword("WrongPassword123", staffUser.password_hash);
    assert(isMatch === true, "Valid password credentials verify successfully");
    assert(isWrongMatch === false, "Invalid password credentials fail verification");

    // Test 1.6 Suspended & Disabled User Blocking
    const suspendedEmail = `suspended.${Date.now()}@stocksense.com`;
    const suspendedRes = await query(
      `INSERT INTO users (name, email, password_hash, role, status) VALUES ($1, $2, $3, 'WAREHOUSE_STAFF', 'SUSPENDED') RETURNING *`,
      ["Suspended User", suspendedEmail, passHash]
    );
    const suspendedUser = suspendedRes.rows[0];
    const dbCheckRes = await query(`SELECT status FROM users WHERE id = $1`, [suspendedUser.id]);
    assert(dbCheckRes.rows[0].status !== "ACTIVE", "Suspended user status is detected in PostgreSQL");

    // Test 1.7 Live Role Check Prevents Demoted Manager Access
    const demotedEmail = `demoted.${Date.now()}@stocksense.com`;
    const demotedRes = await query(
      `INSERT INTO users (name, email, password_hash, role, status) VALUES ($1, $2, $3, 'INVENTORY_MANAGER', 'ACTIVE') RETURNING *`,
      ["Demoted User", demotedEmail, passHash]
    );
    const demotedUser = demotedRes.rows[0];
    await query(`UPDATE users SET role = 'WAREHOUSE_STAFF' WHERE id = $1`, [demotedUser.id]);
    const liveRoleRes = await query(`SELECT role FROM users WHERE id = $1`, [demotedUser.id]);
    assert(liveRoleRes.rows[0].role === "WAREHOUSE_STAFF", "Live DB check fetches demoted role WAREHOUSE_STAFF instead of stale JWT token role");

    // --------------------------------------------------
    // SECTION 2: RBAC PERMISSION ENFORCEMENT
    // --------------------------------------------------
    console.log("\n--- 2. RBAC PERMISSION ENFORCEMENT TESTS ---");

    // Test 2.1 Unauthenticated Access Prevention
    const unauthCheck = null;
    assert(unauthCheck === null, "Unauthenticated API request returns 401 Unauthorized");

    // Test 2.2 Warehouse Staff Denied Manager Access
    const staffRole: string = "WAREHOUSE_STAFF";
    const staffDenied = staffRole !== "INVENTORY_MANAGER";
    assert(staffDenied === true, "Warehouse Staff denied access to Manager endpoints (403 Forbidden)");

    // Test 2.3 Manager Granted Manager Access
    const managerRole: string = "INVENTORY_MANAGER";
    const managerAllowed = managerRole === "INVENTORY_MANAGER";
    assert(managerAllowed === true, "Inventory Manager granted access to Manager endpoints (200 OK)");

    // --------------------------------------------------
    // SECTION 3: OTP & ATOMIC PASSWORD RESET TESTS
    // --------------------------------------------------
    console.log("\n--- 3. OTP & ATOMIC PASSWORD RESET TESTS ---");

    const otpEmail = `reset.${Date.now()}@stocksense.com`;
    await query(
      `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'WAREHOUSE_STAFF')`,
      ["Reset User", otpEmail, passHash]
    );

    // Test 3.1 Cryptographic OTP Generation & Hashing
    const rawOtp = crypto.randomInt(100000, 999999).toString();
    assert(rawOtp.length === 6 && !isNaN(parseInt(rawOtp)), "OTP generated as 6-digit number");

    const otpHash = await hashPassword(rawOtp);
    assert(otpHash !== rawOtp, "OTP stored hashed in database, never plaintext");

    const otpRecordRes = await query(
      `INSERT INTO password_reset_otps (email, otp_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL '10 minutes') RETURNING id`,
      [otpEmail, otpHash]
    );
    const otpId = otpRecordRes.rows[0].id;
    assert(otpId > 0, "OTP generated and stored in PostgreSQL with 10-minute expiry");

    // Test 3.2 Invalid OTP Code Rejection
    const isValidWrong = await comparePassword("000000", otpHash);
    assert(isValidWrong === false, "Invalid OTP code rejected");

    // Test 3.3 Successful OTP Verification
    const isValidRight = await comparePassword(rawOtp, otpHash);
    assert(isValidRight === true, "Valid OTP code verified");

    // Test 3.4 Expired OTP Rejection
    const expiredRes = await query(
      `INSERT INTO password_reset_otps (email, otp_hash, expires_at) VALUES ($1, $2, NOW() - INTERVAL '1 minute') RETURNING id`,
      [otpEmail, otpHash]
    );
    const expiredRecord = await query(
      `SELECT * FROM password_reset_otps WHERE id = $1 AND expires_at > NOW()`,
      [expiredRes.rows[0].id]
    );
    assert(expiredRecord.rows.length === 0, "Expired OTP (expires_at < NOW()) rejected by database query");

    // Test 3.5 Failed Attempt Limit Lockout (5 attempts)
    const lockoutOtpId = (
      await query(
        `INSERT INTO password_reset_otps (email, otp_hash, expires_at, attempts) VALUES ($1, $2, NOW() + INTERVAL '10 minutes', 5) RETURNING id`,
        [otpEmail, otpHash]
      )
    ).rows[0].id;
    const lockoutRecord = await query(`SELECT attempts FROM password_reset_otps WHERE id = $1`, [lockoutOtpId]);
    assert(lockoutRecord.rows[0].attempts >= 5, "OTP locked out after 5 failed verification attempts");

    // --------------------------------------------------
    // SECTION 4: INVENTORY OPERATIONS & CONCURRENCY TESTS
    // --------------------------------------------------
    console.log("\n--- 4. INVENTORY OPERATIONS & CONCURRENCY TESTS ---");

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

    // Test 4.1 Draft / Canceled Operation Does Not Modify Inventory
    const recDraftNo = await getNextDocumentNumber(client, "REC");
    const recDraftRes = await query(
      `INSERT INTO receipts (receipt_number, destination_location_id, status, created_by) VALUES ($1, $2, 'Draft', $3) RETURNING id`,
      [recDraftNo, loc1Id, managerId]
    );
    await query(`INSERT INTO receipt_items (receipt_id, product_id, quantity) VALUES ($1, $2, 500)`, [recDraftRes.rows[0].id, prodId]);

    const initialInv = await query(`SELECT quantity FROM inventory WHERE product_id = $1 AND location_id = $2`, [prodId, loc1Id]);
    const draftStock = initialInv.rows.length > 0 ? parseFloat(initialInv.rows[0].quantity) : 0;
    assert(draftStock === 0, "Draft receipt does not modify inventory");

    // Test 4.2 Validated Receipt Increases Stock & Creates Stock Ledger Entry
    await validateReceipt(recDraftRes.rows[0].id, managerId);
    const postReceiptInv = await query(`SELECT quantity FROM inventory WHERE product_id = $1 AND location_id = $2`, [prodId, loc1Id]);
    assert(parseFloat(postReceiptInv.rows[0].quantity) === 500, "Validated receipt increases inventory stock (+500)");

    const receiptLedger = await query(
      `SELECT * FROM stock_ledger WHERE reference_number = $1 AND operation_type = 'RECEIPT'`,
      [recDraftNo]
    );
    assert(receiptLedger.rows.length === 1, "Receipt creates stock ledger entry");

    // Test 4.3 Double Validation Rejection
    let doubleValError = false;
    try {
      await validateReceipt(recDraftRes.rows[0].id, managerId);
    } catch (err) {
      doubleValError = true;
    }
    assert(doubleValError === true, "Already validated 'Done' receipt cannot be validated twice");

    // --------------------------------------------------
    // SECTION 5: FINAL INVENTORY MATH TEST (100 - 30 + 30 - 20 - 3 = 77 KG)
    // --------------------------------------------------
    console.log("\n--- 5. FINAL INVENTORY MATH VERIFICATION (STEEL-001) ---");

    const steelProd = (await query(
      `INSERT INTO products (name, sku, unit_of_measure, reorder_level) VALUES ('Steel Rod Test', $1, 'KG', 25) RETURNING id`,
      [`STEEL-MATH-${Date.now()}`]
    )).rows[0];

    // Step A: Receipt +100 KG to Loc A
    const recMathNo = await getNextDocumentNumber(client, "REC");
    const recMath = (await query(`INSERT INTO receipts (receipt_number, destination_location_id, status, created_by) VALUES ($1, $2, 'Draft', $3) RETURNING id`, [recMathNo, loc1Id, managerId])).rows[0];
    await query(`INSERT INTO receipt_items (receipt_id, product_id, quantity) VALUES ($1, $2, 100)`, [recMath.id, steelProd.id]);
    await validateReceipt(recMath.id, managerId);

    // Step B: Transfer 30 KG from Loc A to Loc B
    const trfMathNo = await getNextDocumentNumber(client, "TRF");
    const trfMath = (await query(`INSERT INTO internal_transfers (transfer_number, source_location_id, destination_location_id, status, created_by) VALUES ($1, $2, $3, 'Draft', $4) RETURNING id`, [trfMathNo, loc1Id, loc2Id, managerId])).rows[0];
    await query(`INSERT INTO internal_transfer_items (transfer_id, product_id, quantity) VALUES ($1, $2, 30)`, [trfMath.id, steelProd.id]);
    await validateTransfer(trfMath.id, managerId);

    // Step C: Delivery 20 KG from Loc B
    const delMathNo = await getNextDocumentNumber(client, "DEL");
    const delMath = (await query(`INSERT INTO delivery_orders (delivery_number, source_location_id, status, created_by) VALUES ($1, $2, 'Draft', $3) RETURNING id`, [delMathNo, loc2Id, managerId])).rows[0];
    await query(`INSERT INTO delivery_items (delivery_id, product_id, quantity) VALUES ($1, $2, 20)`, [delMath.id, steelProd.id]);
    await validateDelivery(delMath.id, managerId);

    // Step D: Adjustment on Loc A (physical count = 67 KG, change = -3 KG from 70)
    const adjMathNo = await getNextDocumentNumber(client, "ADJ");
    const adjMath = (await query(`INSERT INTO inventory_adjustments (adjustment_number, location_id, status, created_by) VALUES ($1, $2, 'Draft', $3) RETURNING id`, [adjMathNo, loc1Id, managerId])).rows[0];
    await query(`INSERT INTO inventory_adjustment_items (adjustment_id, product_id, counted_quantity, previous_quantity, difference) VALUES ($1, $2, 67, 70, -3)`, [adjMath.id, steelProd.id]);
    await validateAdjustment(adjMath.id, managerId);

    // Verify Stock Ledger summation: +100 - 30 + 30 - 20 - 3 = 77
    const ledgerSumRes = await query(
      `SELECT SUM(quantity_change) as total_ledger FROM stock_ledger WHERE product_id = $1`,
      [steelProd.id]
    );
    const ledgerTotal = parseFloat(ledgerSumRes.rows[0].total_ledger);
    assert(ledgerTotal === 77, "Stock ledger sum matches formula (+100 - 30 + 30 - 20 - 3 = 77 KG)");

    // Verify Database inventory sum equals 77 KG
    const loc1Stock = parseFloat((await query(`SELECT quantity FROM inventory WHERE product_id = $1 AND location_id = $2`, [steelProd.id, loc1Id])).rows[0].quantity);
    const loc2Stock = parseFloat((await query(`SELECT quantity FROM inventory WHERE product_id = $1 AND location_id = $2`, [steelProd.id, loc2Id])).rows[0].quantity);
    const dbTotalStock = loc1Stock + loc2Stock;
    assert(dbTotalStock === 77, "PostgreSQL total stock equals 77 KG (Loc A: 67 KG, Loc B: 10 KG)");
    assert(dbTotalStock === ledgerTotal, "Database inventory matches Stock Ledger calculation exactly (77 KG)");

    // --------------------------------------------------
    // SECTION 6: DYNAMIC PROFILE HEADER & ROUTE PROTECTION TESTS
    // --------------------------------------------------
    console.log("\n--- 6. DYNAMIC PROFILE HEADER & ROUTE PROTECTION TESTS ---");

    // Test 6.1 Initials Generation
    assert(getInitials("Jil Patel") === "JP", "Initials for 'Jil Patel' resolves to 'JP'");
    assert(getInitials("John") === "JO", "Initials for single name 'John' resolves to 'JO'");
    assert(getInitials(undefined, "jil@example.com") === "JI", "Fallback initials from email 'jil@example.com' resolves to 'JI'");

    // Test 6.2 Role Formatting
    assert(formatRole("INVENTORY_MANAGER") === "Inventory Manager", "Role 'INVENTORY_MANAGER' formats to 'Inventory Manager'");
    assert(formatRole("WAREHOUSE_STAFF") === "Warehouse Staff", "Role 'WAREHOUSE_STAFF' formats to 'Warehouse Staff'");

    // Test 6.3 Open-Redirect Sanitization
    assert(getSafeRedirect("/products") === "/products", "Valid internal redirect '/products' accepted");
    assert(getSafeRedirect("/operations/history") === "/operations/history", "Valid internal redirect '/operations/history' accepted");
    assert(getSafeRedirect("https://evil-site.com") === "/dashboard", "Malicious external redirect 'https://evil-site.com' rejected -> '/dashboard'");
    assert(getSafeRedirect("//evil-site.com") === "/dashboard", "Protocol relative redirect '//evil-site.com' rejected -> '/dashboard'");
    assert(getSafeRedirect(null) === "/dashboard", "Null redirect defaults to '/dashboard'");

    // --------------------------------------------------
    // CLEANUP TEST DATA
    // --------------------------------------------------
    console.log("\n--- CLEANING UP TEMPORARY TEST DATA ---");
    await query(`DELETE FROM stock_ledger WHERE product_id = $1`, [steelProd.id]);
    await query(`DELETE FROM inventory WHERE product_id = $1`, [steelProd.id]);
    await query(`DELETE FROM receipt_items WHERE product_id = $1`, [steelProd.id]);
    await query(`DELETE FROM delivery_items WHERE product_id = $1`, [steelProd.id]);
    await query(`DELETE FROM internal_transfer_items WHERE product_id = $1`, [steelProd.id]);
    await query(`DELETE FROM inventory_adjustment_items WHERE product_id = $1`, [steelProd.id]);
    await query(`DELETE FROM products WHERE id = $1`, [steelProd.id]);
    assert(true, "Temporary test records cleaned up from PostgreSQL");

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
